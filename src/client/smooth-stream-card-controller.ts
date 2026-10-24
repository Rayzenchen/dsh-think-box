/** Staged form state for the plugin-owned smooth-stream settings RPC. */

import { createSnapshotStore, type SnapshotStore } from './clientStore.ts'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from '../config.ts'
import {
  DEFAULT_STREAM_DEBUG_TUNING,
  DEFAULT_STREAM_SETTINGS,
  type StreamDebugTuning,
  type StreamMotionPreference,
  type StreamSettings,
  type StreamSmoothingPreset,
} from '../settings.ts'
import type {
  StreamDebugSettingsView,
  StreamInstallationKind,
  StreamSettingsView,
} from '../settings-api.ts'
import type { SmoothStreamSettingsApi } from './smooth-stream-settings-api.ts'

/** What the smooth-stream card renders. It remains visible while its Host RPC loads. */
export interface SmoothStreamCardState {
  status: 'loading' | 'ready' | 'unavailable'
  writable: boolean
  dirty: boolean
  saving: boolean
  failed: boolean
  enabled: boolean
  controlScroll: boolean
  preset: StreamSmoothingPreset
  motionPreference: StreamMotionPreference
  thinkAutoExpand: boolean
  logarithmicFade: boolean
  debugEnabled: boolean
  debugTuning: StreamDebugTuning
  debugAvailable: boolean
  version: string | undefined
  installation: StreamInstallationKind
  canUpgrade: boolean
  upgrading: boolean
  upgradeFailed: boolean
  restartRequired: boolean
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
export interface SmoothStreamCardFace {
  hooks: {
    smoothStreamCard: SnapshotStore<SmoothStreamCardState>
    translationCard: SnapshotStore<TranslationCardState>
  }
  edit: (patch: Partial<StreamSettings>) => void
  save: () => void
  discard: () => void
  reload: () => void
  upgrade: () => void
  editTranslation: (patch: Partial<TranslationConfig>) => void
  saveTranslation: () => void
  discardTranslation: () => void
  reloadTranslation: () => void
}

/** Bridges the plugin's protected Host interface onto a staged settings form. */
export class SmoothStreamCardController {
  private readonly store = createSnapshotStore<SmoothStreamCardState>(this.projection())
  private loaded: StreamSettingsView | undefined
  private loadedDebug: StreamDebugSettingsView | undefined
  private stagedBase: Pick<StreamSettings, 'enabled' | 'controlScroll' | 'preset' | 'motionPreference' | 'thinkAutoExpand' | 'logarithmicFade'> | undefined
  private stagedDebug: Pick<StreamSettings, 'debugEnabled' | 'debugTuning'> | undefined
  private saving = false
  private failed = false
  private upgrading = false
  private upgradeFailed = false
  private restartRequired = false
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
    private readonly api: SmoothStreamSettingsApi,
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
  getSnapshot(): SmoothStreamCardState {
    return this.store.getSnapshot()
  }

  /** Subscribe to state changes. */
  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }

  /** Build the face consumed by the settings slot renderer. */
  inject(): SmoothStreamCardFace {
    return {
      hooks: { smoothStreamCard: this.store, translationCard: this.translationStore },
      edit: (patch) => {
        if (this.saving) return
        if (patch.enabled !== undefined || patch.controlScroll !== undefined || patch.preset !== undefined || patch.motionPreference !== undefined || patch.thinkAutoExpand !== undefined || patch.logarithmicFade !== undefined) {
          this.stagedBase = {
            ...this.baseValues(),
            ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
            ...(patch.controlScroll === undefined ? {} : { controlScroll: patch.controlScroll }),
            ...(patch.preset === undefined ? {} : { preset: patch.preset }),
            ...(patch.motionPreference === undefined ? {} : { motionPreference: patch.motionPreference }),
            ...(patch.thinkAutoExpand === undefined ? {} : { thinkAutoExpand: patch.thinkAutoExpand }),
            ...(patch.logarithmicFade === undefined ? {} : { logarithmicFade: patch.logarithmicFade }),
          }
        }
        if (this.loadedDebug !== undefined && (patch.debugEnabled !== undefined || patch.debugTuning !== undefined)) {
          this.stagedDebug = {
            ...this.debugValues(),
            ...(patch.debugEnabled === undefined ? {} : { debugEnabled: patch.debugEnabled }),
            ...(patch.debugTuning === undefined ? {} : { debugTuning: { ...this.debugValues().debugTuning, ...patch.debugTuning } }),
          }
        }
        this.failed = false
        this.publish()
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.stagedBase === undefined && this.stagedDebug === undefined && !this.failed) return
        this.stagedBase = undefined
        this.stagedDebug = undefined
        this.failed = false
        this.publish()
      },
      reload: () => { void this.load() },
      upgrade: () => { void this.upgrade() },
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

  private projection(): SmoothStreamCardState {
    return {
      status: this.loadStatus,
      writable: this.loaded?.writable ?? false,
      dirty: this.stagedBase !== undefined || this.stagedDebug !== undefined,
      saving: this.saving,
      failed: this.failed,
      ...this.baseValues(),
      ...this.debugValues(),
      debugAvailable: this.loadedDebug !== undefined,
      version: this.loaded?.version,
      installation: this.loaded?.installation ?? 'unmanaged',
      canUpgrade: this.loaded?.canUpgrade ?? false,
      upgrading: this.upgrading,
      upgradeFailed: this.upgradeFailed,
      restartRequired: this.restartRequired,
    }
  }

  private baseValues(): Pick<StreamSettings, 'enabled' | 'controlScroll' | 'preset' | 'motionPreference' | 'thinkAutoExpand' | 'logarithmicFade'> {
    return this.stagedBase ?? {
      enabled: this.loaded?.enabled ?? DEFAULT_STREAM_SETTINGS.enabled,
      controlScroll: this.loaded?.controlScroll ?? DEFAULT_STREAM_SETTINGS.controlScroll,
      preset: this.loaded?.preset ?? DEFAULT_STREAM_SETTINGS.preset,
      motionPreference: this.loaded?.motionPreference ?? DEFAULT_STREAM_SETTINGS.motionPreference,
      thinkAutoExpand: this.loaded?.thinkAutoExpand ?? DEFAULT_STREAM_SETTINGS.thinkAutoExpand,
      logarithmicFade: this.loaded?.logarithmicFade ?? DEFAULT_STREAM_SETTINGS.logarithmicFade,
    }
  }

  private debugValues(): Pick<StreamSettings, 'debugEnabled' | 'debugTuning'> {
    return this.stagedDebug ?? {
      debugEnabled: this.loadedDebug?.debugEnabled ?? DEFAULT_STREAM_SETTINGS.debugEnabled,
      debugTuning: this.loadedDebug?.tuning ?? DEFAULT_STREAM_DEBUG_TUNING,
    }
  }

  /** Complete settings projection consumed by the live SettingsCell bridge. */
  values(): StreamSettings {
    return { ...this.baseValues(), ...this.debugValues() }
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration
    this.loadStatus = 'loading'
    this.loaded = undefined
    this.loadedDebug = undefined
    this.publish()
    try {
      const view = await this.api.read()
      if (generation !== this.loadGeneration) return
      this.loaded = view
      this.loadStatus = 'ready'
      this.publish()
      try {
        const debug = await this.api.readDebug()
        if (generation !== this.loadGeneration) return
        this.loadedDebug = debug
      } catch {
        if (generation !== this.loadGeneration) return
        // Older hosts expose the original settings endpoints only. Keep the
        // card usable and hide debug-only controls until the host is upgraded.
        this.loadedDebug = undefined
      }
    } catch {
      if (generation !== this.loadGeneration) return
      this.loaded = undefined
      this.loadedDebug = undefined
      this.loadStatus = 'unavailable'
    }
    this.publish()
  }

  private async save(): Promise<void> {
    if ((this.stagedBase === undefined && this.stagedDebug === undefined)
      || this.saving || this.loaded?.writable !== true) return
    const base = this.stagedBase
    const debug = this.stagedDebug
    this.saving = true
    this.failed = false
    this.publish()
    try {
      if (base !== undefined) {
        const combined = debug !== undefined && this.loadedDebug !== undefined
        this.loaded = await this.api.write(combined ? { ...base, ...debug } : base)
        this.stagedBase = undefined
        if (combined) {
          this.loadedDebug = {
            debugEnabled: debug.debugEnabled,
            tuning: { ...debug.debugTuning },
          }
          this.stagedDebug = undefined
        }
      }
      if (debug !== undefined && this.loadedDebug !== undefined && this.stagedDebug !== undefined) {
        this.loadedDebug = await this.api.writeDebug(debug)
        this.stagedDebug = undefined
      }
    } catch {
      this.failed = true
    }
    this.saving = false
    this.publish()
  }

  private async upgrade(): Promise<void> {
    if (this.loaded?.canUpgrade !== true || this.upgrading) return
    this.upgrading = true
    this.upgradeFailed = false
    this.restartRequired = false
    this.publish()
    try {
      const result = await this.api.upgrade()
      this.restartRequired = result.restartRequired
    } catch {
      this.upgradeFailed = true
    }
    this.upgrading = false
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
