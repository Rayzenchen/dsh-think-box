/**
 * Shared plugin configuration contract. The Host half defines the
 * Schemastery schema over this shape (defaults live here so both halves stay
 * symmetric); the client half falls back to the same defaults when the Host
 * boot-config bridge is absent (client-only composition).
 */

import { DEFAULT_STREAM_SETTINGS, type StreamSettings } from './settings.ts'

/**
 * Read-only reference for one volatile config field. Cordis replaces the plain
 * value of a `.volatile()` schema field with a stable reference on purpose:
 * plugins keep the reference and call `get()` per read, while the Loader keeps
 * the value live (no entry remount) when the profile patch is edited.
 *
 * Declared locally because the pinned dev dependencies predate cosmokit's
 * exported `Volatile` type; it is structurally identical to the host's.
 */
export interface Volatile<T> {
  /** @returns the current immutable snapshot. */
  get(): T
}

/**
 * Package name this plugin is installed as under the profile. It is also the
 * browser module id and the key the plugin-manager page uses for this bundle's
 * own configuration slot, so those three must agree.
 */
export const STREAM_PACKAGE_ID = '@local/dsh-think-box'

/** Legacy render-mode value retained so existing overlays remain valid. */
export type StreamMode = 'typewriter' | 'teleprompter'

/** Which host service translates the reasoning box. */
export type TranslationBackend = 'bundle' | 'llm'

/**
 * Reasoning-translation backend selection and limits.
 *
 * `bundle` keeps using the official reasoning-translation bundle (Google,
 * Bing, or the two native DeepSeek routes). `llm` calls any registered Harness
 * LLM route directly through this plugin's Host bridge - useful for free or
 * self-hosted models the bundle does not accept.
 */
export interface TranslationConfig {
  /** `bundle` = official cot-translation service; `llm` = direct Harness route. */
  readonly backend: TranslationBackend
  /** Harness LLM route used when the backend is `llm`. */
  readonly provider: string
  /** Exact model id used when the backend is `llm`. */
  readonly model: string
  /**
   * Preferred reasoning effort. A route that does not advertise it falls back
   * to `low`, then to the route's own default.
   */
  readonly reasoningEffort: string
  /** Destination language, or `auto` to follow the UI language in the browser. */
  readonly targetLanguage: string
  /** Maximum UTF-16 code units accepted by one translation request. */
  readonly maxTextChars: number
  /** Output-token cap for one translation request. */
  readonly maxTokens: number
  /** Request deadline in milliseconds. */
  readonly timeoutMs: number
  /** Translate live reasoning automatically instead of waiting for a click. */
  readonly autoTranslate: boolean
}

/** Default translation settings: official bundle, free-route-ready switch. */
export const DEFAULT_TRANSLATION_CONFIG: TranslationConfig = {
  backend: 'bundle',
  provider: 'opencode-go',
  model: 'deepseek-v4.1-flash',
  reasoningEffort: 'low',
  targetLanguage: 'auto',
  maxTextChars: 4000,
  maxTokens: 8192,
  timeoutMs: 60000,
  autoTranslate: true,
}

/**
 * Plugin configuration validated by the Host schema and bridged to the browser
 * half.
 *
 * The user-editable preferences live in the SAME profile entry config from
 * 0.2.x on (the Loader persists them through `configEditor`), so the browser
 * boot snapshot is just the whole resolved config. `preset` is declared once,
 * by {@link StreamSettings}: since 0.2.x it is both the install-time default
 * and the live user pick.
 */
export interface StreamConfig extends StreamSettings {
  /** Compatibility field; both values use the current adaptive reveal engine. */
  readonly mode: StreamMode
  /**
   * Unused at runtime; kept so existing overlays load. Live reveal tracks
   * observed arrival and ignores this seed.
   */
  readonly revealCharsPerSec: number
  /**
   * Unused at runtime; kept so existing overlays load. Follow is a
   * smooth-damp, not a cruise speed.
   */
  readonly scrollSpeedPxPerSec: number
  /** Unused at runtime; retained so existing overlays continue to load. */
  readonly maxScrollSpeedPxPerSec: number
  /** Reasoning-translation backend and request limits. */
  readonly translation: TranslationConfig
}

/** Defaults shared by the Host schema and the client-side fallback. */
export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  ...DEFAULT_STREAM_SETTINGS,
  mode: 'typewriter',
  revealCharsPerSec: 80,
  scrollSpeedPxPerSec: 48,
  maxScrollSpeedPxPerSec: 1000,
  translation: DEFAULT_TRANSLATION_CONFIG,
}

/**
 * Window global the Host writes into the served index HTML. The browser boot
 * graph carries no per-entry config, so this inline script is the only
 * Host-to-client configuration channel for a composed web plugin.
 */
export const STREAM_BOOT_GLOBAL = '__DSH_SMOOTH_STREAM_CONFIG__'
