/**
 * Wire contract between the Host translation bridge and the browser half.
 *
 * A dedicated loopback channel (same envelope carrier as the plugin's settings
 * channel) exposes two endpoints: one to read the accepted route and request
 * limit, and one to translate a single complete fragment through the Harness
 * `llm` service. Keeping the payloads here keeps both halves in lockstep.
 */

/** Absolute Connection RPC channel prefix for the reasoning translator. */
export const TRANSLATION_RPC_CHANNEL = '/smooth-stream-translate'

/** Endpoints accepted on {@link TRANSLATION_RPC_CHANNEL}. */
export const TRANSLATION_RPC = {
  settingsRead: 'translation.settings.read',
  settingsWrite: 'translation.settings.write',
  plan: 'translation.plan',
  translate: 'translation.translate',
} as const

/** Route facts the browser needs before it splits and displays fragments. */
export interface TranslationRoutePlan {
  /** Provider route id, e.g. `opencode-go`. */
  readonly provider: string
  /** Exact model id, e.g. `deepseek-v4.1-flash`. */
  readonly model: string
  /** Maximum UTF-16 code units accepted by one request. */
  readonly maxTextChars: number
  /** Configured destination language, or `auto` for the UI language. */
  readonly targetLanguage: string
}

/** One fragment request. */
export interface TranslationRouteRequest {
  readonly text: string
  readonly provider: string
  readonly model: string
  /** Destination language already resolved by the browser. */
  readonly targetLanguage: string
  /**
   * Owning Session id. OpenCode-style routes require it as their routing
   * header; other routes use it only for attribution.
   */
  readonly sessionId?: string | undefined
}
