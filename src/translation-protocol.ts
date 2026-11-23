/**
 * Wire contract between the Host translation bridge and the browser half.
 *
 * A dedicated loopback channel (same envelope carrier as the plugin's settings
 * channel) exposes the accepted route, the provider/model catalog, and one
 * endpoint to translate a single complete fragment through the Harness `llm`
 * service. Keeping the payloads here keeps both halves in lockstep.
 */

/** Absolute Connection RPC channel prefix for the reasoning translator. */
export const TRANSLATION_RPC_CHANNEL = '/think-box-translate'

/** Endpoints accepted on {@link TRANSLATION_RPC_CHANNEL}. */
export const TRANSLATION_RPC = {
  settingsRead: 'translation.settings.read',
  settingsWrite: 'translation.settings.write',
  catalog: 'translation.catalog',
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

/** One selectable reasoning effort advertised by a catalog model. */
export interface TranslationCatalogEffort {
  /** Stable effort id accepted by the model route. */
  readonly id: string
  /** Human-readable effort name for the picker. */
  readonly name: string
  /** Optional user-facing distinction from otherwise similar efforts. */
  readonly description?: string | undefined
}

/** Reasoning metadata of one catalog model. */
export interface TranslationCatalogReasoning {
  /** Supported efforts, least to greatest. */
  readonly efforts: readonly TranslationCatalogEffort[]
  /** Adapter default materialized when the caller omits an effort. */
  readonly defaultEffort?: string | undefined
}

/** One selectable text model. */
export interface TranslationCatalogModel {
  /** Model id passed to the route. */
  readonly id: string
  /** Human-readable model name. */
  readonly name: string
  /** Optional user-facing description. */
  readonly description?: string | undefined
  /** Advertised input modalities; absent means unknown. */
  readonly inputModalities?: readonly string[] | undefined
  /** Selectable reasoning levels, when the model exposes them. */
  readonly reasoning?: TranslationCatalogReasoning | undefined
}

/** One provider route and the text models it advertises. */
export interface TranslationCatalogProvider {
  /** Provider route id used by translation settings. */
  readonly id: string
  /** Human-readable provider name. */
  readonly name: string
  /** Selectable text models, in catalog order. */
  readonly models: readonly TranslationCatalogModel[]
}

/** One catalog entry the Host could not resolve completely. */
export interface TranslationCatalogFailure {
  /** Provider route the failure belongs to. */
  readonly provider: string
  /** Model id, omitted when the provider catalog itself failed. */
  readonly model?: string | undefined
  /** Sanitized reason; never provider response text. */
  readonly message: string
}

/** Provider → model → reasoning directory for the translation picker. */
export interface TranslationCatalog {
  readonly providers: readonly TranslationCatalogProvider[]
  /** Entries that could not be read; the rest of the catalog stays usable. */
  readonly failures: readonly TranslationCatalogFailure[]
}
