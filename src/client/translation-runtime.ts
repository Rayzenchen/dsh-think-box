/**
 * Chat-side translation runtime.
 *
 * Owns the settings that decide *which* translation engine the think box uses
 * (the official bundle or the plugin's LLM bridge), keeps them fresh enough
 * that a saved settings change reaches open conversation rows, and exposes one
 * snapshot for both the reasoning renderer and the tooltip label. The boot
 * config only seeds it: the Host store is authoritative, so a page that
 * loaded before the Host injection hook was ready still converges here.
 */

import type { TranslationConfig } from '../config.ts'
import type { ReasoningTranslationFace } from './reasoningTranslation.ts'
import type { TranslationSettingsApi } from './translation-settings-api.ts'

/** What the renderer and the card read from the runtime. */
export interface TranslationRuntimeSnapshot {
  readonly settings: TranslationConfig
  readonly face: ReasoningTranslationFace | undefined
  /** Human-readable backend shown in the toggle tooltip. */
  readonly label: string
}

/** How often the browser re-reads the Host store while the page is visible. */
const REFRESH_INTERVAL_MS = 10_000

const BUNDLE_LABEL = '官方思考过程翻译组合包'

function labelOf(settings: TranslationConfig): string {
  return settings.backend === 'llm'
    ? `${settings.provider} · ${settings.model}`
    : BUNDLE_LABEL
}

function sameSettings(a: TranslationConfig, b: TranslationConfig): boolean {
  return a.backend === b.backend
    && a.provider === b.provider
    && a.model === b.model
    && a.reasoningEffort === b.reasoningEffort
    && a.targetLanguage === b.targetLanguage
    && a.maxTextChars === b.maxTextChars
    && a.maxTokens === b.maxTokens
    && a.timeoutMs === b.timeoutMs
    && a.autoTranslate === b.autoTranslate
}

/** Snapshot store shared by the chat rows and the settings card. */
export class TranslationRuntime {
  private current: TranslationConfig
  private snapshotValue: TranslationRuntimeSnapshot
  private readonly listeners = new Set<() => void>()
  private hostFace: ReasoningTranslationFace | undefined
  private bundleFace: ReasoningTranslationFace | undefined
  private api: TranslationSettingsApi | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private pending: Promise<TranslationConfig | undefined> | undefined
  private generation = 0

  constructor(seed: TranslationConfig) {
    this.current = seed
    this.snapshotValue = this.project()
  }

  /** Stable subscription for `useSyncExternalStore`. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Stable snapshot getter for `useSyncExternalStore`. */
  readonly getSnapshot = (): TranslationRuntimeSnapshot => this.snapshotValue

  /** Start reading the Host store and re-reading it while visible. */
  start(api: TranslationSettingsApi): void {
    this.stop()
    this.api = api
    void this.refresh()
    this.timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void this.refresh()
    }, REFRESH_INTERVAL_MS)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible)
    if (typeof window !== 'undefined') window.addEventListener('focus', this.onVisible)
  }

  /** Stop polling and drop the client (connection went away). */
  stop(): void {
    this.generation += 1
    this.api = undefined
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible)
    if (typeof window !== 'undefined') window.removeEventListener('focus', this.onVisible)
  }

  private readonly onVisible = (): void => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') void this.refresh()
  }

  /**
   * Re-read the Host store.
   * @returns the applied settings, or `undefined` when the read failed.
   */
  async refresh(): Promise<TranslationConfig | undefined> {
    if (this.pending !== undefined) return await this.pending
    const api = this.api
    if (api === undefined) return undefined
    const generation = this.generation
    this.pending = (async () => {
      try {
        const settings = await api.read()
        if (generation !== this.generation) return undefined
        this.apply(settings)
        return settings
      } catch {
        return undefined
      } finally {
        this.pending = undefined
      }
    })()
    return await this.pending
  }

  /** Attach the LLM-bridge face; it is selected only while `backend` is `llm`. */
  setHostFace(face: ReasoningTranslationFace | undefined): void {
    this.hostFace = face
    this.publish()
  }

  /** Attach the official-bundle face; it is selected only while `backend` is `bundle`. */
  setBundleFace(face: ReasoningTranslationFace | undefined): void {
    this.bundleFace = face
    this.publish()
  }

  /** Apply settings that were just persisted (card save or a poll). */
  apply(settings: TranslationConfig): void {
    if (sameSettings(this.current, settings)) return
    this.current = settings
    this.publish()
  }

  private project(): TranslationRuntimeSnapshot {
    const settings = this.current
    return {
      settings,
      face: settings.backend === 'llm' ? this.hostFace : this.bundleFace,
      label: labelOf(settings),
    }
  }

  private publish(): void {
    const next = this.project()
    const previous = this.snapshotValue
    if (
      next.face === previous.face
      && next.label === previous.label
      && sameSettings(next.settings, previous.settings)
    ) return
    this.snapshotValue = next
    for (const listener of [...this.listeners]) listener()
  }
}
