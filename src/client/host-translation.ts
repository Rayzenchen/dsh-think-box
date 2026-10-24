/**
 * Browser face for the plugin-owned LLM translation bridge.
 *
 * Mirrors {@link ReasoningTranslationFace} over the loopback channel the Host
 * half registers: `translation.plan` resolves the configured route and request
 * limit, `translation.translate` returns one fragment's translation. Results
 * are cached in this browser per route/language/source so re-toggling never
 * repeats a request.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import {
  TRANSLATION_RPC,
  TRANSLATION_RPC_CHANNEL,
  type TranslationRoutePlan,
} from '../translation-protocol.ts'
import {
  TranslationFailure,
  type ReasoningTranslationFace,
  type TranslationPlan,
} from './reasoningTranslation.ts'

/** How long one accepted route plan is reused before re-reading. */
const PLAN_TTL_MS = 5_000
/** Saved translations kept by this browser across blocks and re-toggles. */
const MAX_CACHED_TRANSLATIONS = 512

/** Result envelope the generic connection channel resolves to. */
type CallResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly error: { readonly code?: string, readonly message?: string } }

/**
 * Build the browser face over the plugin's Host translation channel.
 * @param connection - Harness Connection handle for loopback RPC.
 * @param activeLocale - reads the current UI locale for `auto` destinations.
 * @returns a face the reasoning hook can drive.
 */
export function createHostTranslationFace(
  connection: ConnectionHandle,
  activeLocale: () => string,
): ReasoningTranslationFace {
  const cache = new Map<string, string>()
  let accepted: { readonly plan: TranslationPlan, readonly at: number } | undefined

  const call = async <T>(endpoint: string, payload: unknown, signal: AbortSignal): Promise<CallResult<T>> => {
    return await connection.rpc.call(TRANSLATION_RPC_CHANNEL, endpoint, payload, signal) as CallResult<T>
  }

  return {
    async prepare(signal) {
      const now = Date.now()
      if (accepted !== undefined && now - accepted.at < PLAN_TTL_MS) return accepted.plan
      const result = await call<TranslationRoutePlan>(TRANSLATION_RPC.plan, {}, signal)
      if (!result.ok) {
        throw new TranslationFailure(
          result.error.code ?? 'translation/unavailable',
          result.error.message ?? 'translation backend is unavailable',
        )
      }
      const value = result.value
      const plan: TranslationPlan = {
        provider: value.provider,
        model: value.model,
        targetLanguage: value.targetLanguage === 'auto' ? String(activeLocale()) : value.targetLanguage,
        maxTextChars: value.maxTextChars,
      }
      accepted = { plan, at: now }
      return plan
    },

    async translate(source, plan, sessionId, signal) {
      if (source.trim() === '') return ''
      const key = `${plan.provider}\u0000${plan.model ?? ''}\u0000${plan.targetLanguage}\u0000${source}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const result = await call<string>(TRANSLATION_RPC.translate, {
        text: source,
        provider: plan.provider,
        model: plan.model,
        targetLanguage: plan.targetLanguage,
        ...(sessionId === undefined ? {} : { sessionId }),
      }, signal)
      if (!result.ok) {
        throw new TranslationFailure(
          result.error.code ?? 'translation/failed',
          result.error.message ?? 'translation failed',
        )
      }
      if (typeof result.value !== 'string') {
        throw new TranslationFailure('translation/invalid-response', 'translation backend returned a non-string result')
      }
      if (cache.size >= MAX_CACHED_TRANSLATIONS) cache.clear()
      cache.set(key, result.value)
      return result.value
    },
  }
}
