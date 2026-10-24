/**
 * Bridge to the optional Harness reasoning-translation bundle.
 *
 * The bundled `@deepseek-ai/dsh-experimental-client-ui-cot-translation` client
 * mounts a Host Remote as `ctx.remote.cotTranslation`. Its UI is contributed
 * through the built-in Chat reasoning body slot, which this plugin's takeover
 * renderer never renders - so this module calls the Remote directly and lets
 * the think box present the translation itself. Nothing here imports the
 * bundle: the Host Remote is addressed structurally, so the plugin keeps
 * working (with the feature hidden) when the bundle is absent.
 */

/** Providers the translation bundle may accept. */
export type TranslationProvider = 'google' | 'bing' | 'deepseek-account' | 'deepseek-official'

/** Accepted bundle preferences: the provider and its target language. */
export interface TranslationPreferences {
  readonly provider: TranslationProvider
  readonly targetLanguage: string
}

/** Snapshot returned by the Host `cotTranslation/limits` Remote. */
export interface TranslationSnapshot {
  /** Maximum UTF-16 code units accepted by one translation request. */
  readonly maxTextChars: number
  readonly preferences: TranslationPreferences
  /** Providers currently eligible for translation (native paid routes included). */
  readonly availableProviders: readonly TranslationProvider[]
}

/** Error envelope returned by an accepted Remote call. */
export interface TranslationRemoteError {
  readonly code?: string
  readonly message?: string
}

/** Result envelope every typert Remote call resolves to. */
export type TranslationRemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TranslationRemoteError }

/** Structural face of the bundle's Host Remote. */
export interface CotTranslationRemote {
  limits(signal: AbortSignal): Promise<TranslationRemoteResult<TranslationSnapshot>>
  translate(request: {
    readonly text: string
    readonly targetLanguage: string
    readonly provider?: TranslationProvider
    readonly sourceLanguage?: string
    readonly sessionId?: string
  }, signal: AbortSignal): Promise<TranslationRemoteResult<string>>
}

/**
 * Resolved request parameters for one reasoning block.
 *
 * `provider` is a plain id: the bundled service uses the four built-in ids,
 * while the plugin-owned LLM bridge passes an arbitrary Harness route id.
 */
export interface TranslationPlan {
  readonly provider: string
  /** Exact model id when the backend is an LLM route. */
  readonly model?: string | undefined
  readonly targetLanguage: string
  readonly maxTextChars: number
}

/** A translation service ready to be driven by the think box. */
export interface ReasoningTranslationFace {
  /**
   * Read the accepted provider, language, and request limit.
   * @param signal - cancellation of the caller's translation lifetime.
   */
  prepare(signal: AbortSignal): Promise<TranslationPlan>
  /**
   * Translate one complete source fragment.
   * @param source - non-empty source text.
   * @param plan - accepted provider/language resolved by {@link prepare}.
   * @param sessionId - owning Session for saved results, when known.
   * @param signal - cancellation of the caller's translation lifetime.
   * @returns the translated text.
   */
  translate(
    source: string,
    plan: TranslationPlan,
    sessionId: string | undefined,
    signal: AbortSignal,
  ): Promise<string>
}

/** Rejection carrying the bundle's diagnostic code. */
export class TranslationFailure extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TranslationFailure'
    this.code = code
  }
}

/** Preferred source size per request: keeps one long chain a few requests. */
const PREFERRED_FRAGMENT_CHARS = 480
/** Search window (share of the limit) for a whitespace split inside a long line. */
const LONG_LINE_SEARCH_RATIO = 0.6
/** Saved results kept by this browser for re-expansion across blocks. */
const MAX_CACHED_TRANSLATIONS = 512
/** How long one set of accepted preferences is reused before re-reading. */
const LIMITS_TTL_MS = 5_000

/** One complete source fragment plus the whitespace that follows it. */
export interface TranslationFragment {
  /** Source text sent to the provider (trailing whitespace excluded). */
  readonly source: string
  /** Whitespace kept verbatim outside the translation. */
  readonly suffix: string
}

/** Split of the displayed reasoning into translatable and streaming parts. */
export interface PlannedTranslationFragments {
  /** Whitespace before the first fragment, kept verbatim. */
  readonly leading: string
  readonly fragments: readonly TranslationFragment[]
  /** Incomplete trailing source kept in the original language while streaming. */
  readonly tail: string
}

/** Pick a split offset no larger than `limit`, preferring a word boundary. */
function splitOffset(text: string, limit: number): number {
  if (text.length <= limit) return text.length
  let cut = limit
  // Never split a surrogate pair: the provider counts UTF-16 code units but a
  // lone surrogate would still corrupt the fragment.
  const code = text.charCodeAt(cut - 1)
  if (code >= 0xd800 && code <= 0xdbff) cut -= 1
  const floor = Math.max(1, Math.floor(limit * LONG_LINE_SEARCH_RATIO))
  const space = text.lastIndexOf(' ', cut)
  if (space >= floor) return space + 1
  const newline = text.lastIndexOf('\n', cut)
  if (newline >= floor) return newline + 1
  return cut
}

/**
 * Split displayed reasoning into complete translatable fragments and the
 * incomplete tail that must stay in the original language.
 *
 * Fragments end at line boundaries, batch a few lines together, and are always
 * within the provider's request limit. A line longer than the limit (a
 * streamed paragraph with no newline yet) feeds its prefix once the prefix is
 * long enough, mirroring the bundled UI.
 *
 * @param text - the reasoning block's visible text.
 * @param maxTextChars - provider limit in UTF-16 code units.
 * @param complete - true once the block stopped streaming: the trailing line
 *   then counts as final text and is translated too. While the block streams,
 *   the unfinished tail stays in the original language.
 * @returns the split fragments plus their leading/trailing original whitespace.
 */
export function planTranslationFragments(
  text: string,
  maxTextChars: number,
  complete = true,
): PlannedTranslationFragments {
  const limit = Math.max(1, Math.floor(maxTextChars))
  const threshold = Math.min(PREFERRED_FRAGMENT_CHARS, limit)
  const fragments: Array<{ source: string, suffix: string }> = []
  let leading = ''
  let tail = ''

  const push = (raw: string): void => {
    if (raw === '') return
    const match = /(\s*)$/u.exec(raw)
    const suffix = match?.[1] ?? ''
    const source = raw.slice(0, raw.length - suffix.length)
    if (source === '') {
      const previous = fragments.at(-1)
      if (previous === undefined) leading += raw
      else previous.suffix += raw
      return
    }
    fragments.push({ source, suffix })
  }

  // Split into complete lines first; the substring after the last newline is
  // still streaming and never sent as a whole line.
  const lines: string[] = []
  let lineStart = 0
  for (;;) {
    const newline = text.indexOf('\n', lineStart)
    if (newline === -1) {
      tail = text.slice(lineStart)
      break
    }
    lines.push(text.slice(lineStart, newline + 1))
    lineStart = newline + 1
  }

  // A complete line beyond the provider limit is cut into limit-sized pieces.
  let pending = ''
  for (const line of lines) {
    let rest = line
    while (rest.length > limit) {
      const cut = splitOffset(rest, limit)
      pending += rest.slice(0, cut)
      rest = rest.slice(cut)
      push(pending)
      pending = ''
    }
    pending += rest
    const blankLine = /^\s*$/u.test(rest.replace(/\n$/u, ''))
    if (pending.length >= threshold || blankLine) {
      push(pending)
      pending = ''
    }
  }
  push(pending)

  // A long unterminated line still reveals translated prefixes while it streams.
  while (tail.length >= limit) {
    const cut = splitOffset(tail, limit)
    push(tail.slice(0, cut))
    tail = tail.slice(cut)
  }

  // Once the block stopped streaming the remaining tail is final text too,
  // not an unfinished fragment: translate it instead of leaving the last line
  // in the original language forever.
  if (complete && tail !== '') {
    let rest = tail
    tail = ''
    while (rest !== '') {
      const cut = rest.length > limit ? splitOffset(rest, limit) : rest.length
      push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
  }

  return { leading, fragments, tail }
}

/**
 * Build the think box's translation face over the bundle Remote.
 * @param remote - the mounted `remote.cotTranslation` service.
 * @param activeLocale - reads the current UI locale for `auto` preferences.
 * @returns a face the reasoning hook can drive.
 */
export function createReasoningTranslationFace(
  remote: CotTranslationRemote,
  activeLocale: () => string,
): ReasoningTranslationFace {
  const cache = new Map<string, string>()
  let accepted: { readonly plan: TranslationPlan; readonly at: number } | undefined

  return {
    async prepare(signal) {
      const now = Date.now()
      if (accepted !== undefined && now - accepted.at < LIMITS_TTL_MS) return accepted.plan
      const result = await remote.limits(signal)
      if (!result.ok) {
        throw new TranslationFailure(result.error.code ?? 'translation/unavailable', result.error.message ?? 'translation unavailable')
      }
      const { maxTextChars, preferences, availableProviders } = result.value
      if (!availableProviders.includes(preferences.provider)) {
        throw new TranslationFailure(
          'translation/provider-unavailable',
          `translation provider ${preferences.provider} is unavailable`,
        )
      }
      const targetLanguage = preferences.targetLanguage === 'auto'
        ? activeLocale()
        : preferences.targetLanguage
      const plan: TranslationPlan = { provider: preferences.provider, targetLanguage, maxTextChars }
      accepted = { plan, at: now }
      return plan
    },

    async translate(source, plan, sessionId, signal) {
      if (source.trim() === '') return ''
      const key = `${plan.provider}\u0000${plan.targetLanguage}\u0000${source}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const result = await remote.translate({
        text: source,
        provider: plan.provider as TranslationProvider,
        targetLanguage: plan.targetLanguage,
        ...(sessionId === undefined ? {} : { sessionId }),
      }, signal)
      if (!result.ok) {
        throw new TranslationFailure(result.error.code ?? 'translation/failed', result.error.message ?? 'translation failed')
      }
      if (cache.size >= MAX_CACHED_TRANSLATIONS) cache.clear()
      cache.set(key, result.value)
      return result.value
    },
  }
}
