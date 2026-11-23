/** Staged form state for the plugin-owned think-box settings RPC. */

import { createSnapshotStore, type SnapshotStore } from './clientStore.ts'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from '../config.ts'
import { DEFAULT_THINK_BOX_SETTINGS, type ThinkBoxSettings } from '../settings.ts'
import type { ThinkBoxSettingsView } from '../settings-api.ts'
import type { ThinkBoxSettingsApi } from './think-box-settings-api.ts'

/** What the settings card renders. It stays visible while its Host RPC loads. */
export interface ThinkBoxCardState {
  status: 'loading' | 'ready' | 'unavailable'
  writable: boolean
  dirty: boolean
  saving: boolean
  failed: boolean
  enabled: boolean
  thinkAutoExpand: boolean
}

/** Read/write pair the card uses for the runtime translation settings. */
export interface TranslationCardBridge {
  readonly initial: TranslationConfig
  read(signal?: AbortSignal): Promise<TranslationConfig>
  write(patch: Partial<TranslationConfig>): Promise<TranslationConfig>
  /** Push freshly saved settings into the running chat renderer. */
  apply(settings: TranslationConfig): void
}

/** Staged form state for the translation channel. */
export interface TranslationCardState {
  status: 'loading' | 'ready' | 'unavailable'
  settings: TranslationConfig
  dirty: boolean
  saving: boolean
  failed: boolean
}

/** The registration-side face injected into the settings slot renderer. */
export interface ThinkBoxCardFace {
  hooks: {
    thinkBoxCard: SnapshotStore<ThinkBoxCardState>
    translationCard: SnapshotStore<TranslationCardState>
  }
  edit: (patch: Partial<ThinkBoxSettings>) => void
  save: () => void
  discard: () => void
  reload: () => void
  editTranslation: (patch: Partial<TranslationConfig>) => void
  saveTranslation: () => void
  discardTranslation: () => void
  reloadTranslation: () => void
}

/** Bridges the plugin's protected Host interface onto a staged settings form. */
export class ThinkBoxCardController {
  private readonly store = createSnapshotStore<ThinkBoxCardState>(this.projection())
  private loaded: ThinkBoxSettingsView | undefined
  private staged: ThinkBoxSettings | undefined
  private saving = false
  private failed = false
  private loadGeneration = 0
  private loadStatus: 'loading' | 'ready' | 'unavailable' = 'loading'
  private readonly translationStore: SnapshotStore<TranslationCardState>
  private translationLoaded: TranslationConfig | undefined
  private translationStaged: TranslationConfig | undefined
  private translationSaving = false
  private translationFailed = false
  private translationStatus: 'loading' | 'ready' | 'unavailable' = 'loading'
  private translationGeneration = 0

  constructor(
    private readonly api: ThinkBoxSettingsApi,
    private readonly translation?: TranslationCardBridge,
  ) {
    this.translationStatus = translation === undefined ? 'unavailable' : 'loading'
    this.translationLoaded = translation?.initial
    this.translationStore = createSnapshotStore<TranslationCardState>(this.translationProjection())
  }

  /** Begin the background reads after the card has been registered. */
  start(): void {
    void this.load()
    void this.loadTranslation()
  }

  /** Ignore a late response after the surrounding optional services unload. */
  stop(): void {
    this.loadGeneration += 1
    this.translationGeneration += 1
  }

  /** Current card snapshot, also consumed by the streaming preference cell. */
  getSnapshot(): ThinkBoxCardState {
    return this.store.getSnapshot()
  }

  /** Subscribe to state changes. */
  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }

  /** Build the face consumed by the settings slot renderer. */
  inject(): ThinkBoxCardFace {
    return {
      hooks: { thinkBoxCard: this.store, translationCard: this.translationStore },
      edit: (patch) => {
        if (this.saving) return
        this.staged = {
          ...this.baseValues(),
          ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
          ...(patch.thinkAutoExpand === undefined ? {} : { thinkAutoExpand: patch.thinkAutoExpand }),
        }
        this.failed = false
        this.publish()
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged === undefined && !this.failed) return
        this.staged = undefined
        this.failed = false
        this.publish()
      },
      reload: () => { void this.load() },
      editTranslation: (patch) => {
        if (this.translation === undefined || this.translationSaving) return
        const base = this.translationStaged ?? this.translationLoaded ?? this.translation.initial
        this.translationStaged = { ...base, ...patch }
        this.translationFailed = false
        this.publishTranslation()
      },
      saveTranslation: () => { void this.saveTranslation() },
      discardTranslation: () => {
        if (this.translationStaged === undefined && !this.translationFailed) return
        this.translationStaged = undefined
        this.translationFailed = false
        this.publishTranslation()
      },
      reloadTranslation: () => { void this.loadTranslation() },
    }
  }

  private projection(): ThinkBoxCardState {
    return {
      status: this.loadStatus,
      writable: this.loaded?.writable ?? false,
      dirty: this.staged !== undefined,
      saving: this.saving,
      failed: this.failed,
      ...this.baseValues(),
    }
  }

  private baseValues(): ThinkBoxSettings {
    return this.staged ?? {
      enabled: this.loaded?.enabled ?? DEFAULT_THINK_BOX_SETTINGS.enabled,
      thinkAutoExpand: this.loaded?.thinkAutoExpand ?? DEFAULT_THINK_BOX_SETTINGS.thinkAutoExpand,
    }
  }

  /** Complete settings projection consumed by the live SettingsCell bridge. */
  values(): ThinkBoxSettings {
    return this.baseValues()
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration
    this.loadStatus = 'loading'
    this.loaded = undefined
    this.publish()
    try {
      const view = await this.api.read()
      if (generation !== this.loadGeneration) return
      this.loaded = view
      this.loadStatus = 'ready'
    } catch {
      if (generation !== this.loadGeneration) return
      this.loaded = undefined
      this.loadStatus = 'unavailable'
    }
    this.publish()
  }

  private async save(): Promise<void> {
    if (this.staged === undefined || this.saving || this.loaded?.writable !== true) return
    const staged = this.staged
    this.saving = true
    this.failed = false
    this.publish()
    try {
      this.loaded = await this.api.write(staged)
      this.staged = undefined
    } catch {
      this.failed = true
    }
    this.saving = false
    this.publish()
  }

  private translationProjection(): TranslationCardState {
    return {
      status: this.translationStatus,
      settings: this.translationStaged
        ?? this.translationLoaded
        ?? this.translation?.initial
        ?? DEFAULT_TRANSLATION_CONFIG,
      dirty: this.translationStaged !== undefined,
      saving: this.translationSaving,
      failed: this.translationFailed,
    }
  }

  private publishTranslation(): void {
    this.translationStore.set(this.translationProjection())
  }

  private async loadTranslation(): Promise<void> {
    const bridge = this.translation
    if (bridge === undefined) return
    const generation = ++this.translationGeneration
    this.translationStatus = 'loading'
    this.translationFailed = false
    this.publishTranslation()
    try {
      const settings = await bridge.read()
      if (generation !== this.translationGeneration) return
      this.translationLoaded = settings
      this.translationStaged = undefined
      this.translationStatus = 'ready'
      bridge.apply(settings)
    } catch {
      if (generation !== this.translationGeneration) return
      this.translationStatus = 'unavailable'
    }
    this.publishTranslation()
  }

  private async saveTranslation(): Promise<void> {
    const bridge = this.translation
    if (bridge === undefined || this.translationStaged === undefined || this.translationSaving) return
    const staged = this.translationStaged
    this.translationSaving = true
    this.translationFailed = false
    this.publishTranslation()
    try {
      const next = await bridge.write(staged)
      this.translationLoaded = next
      this.translationStaged = undefined
      this.translationStatus = 'ready'
      bridge.apply(next)
    } catch {
      this.translationFailed = true
    }
    this.translationSaving = false
    this.publishTranslation()
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
