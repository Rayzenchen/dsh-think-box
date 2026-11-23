/**
 * Browser client for the plugin's runtime translation settings.
 *
 * The Plugins page card and the chat renderer both read the same Host store
 * through this loopback channel, so the card's saves reach the running
 * translation route without a harness restart.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { TranslationConfig } from '../config.ts'
import {
  TRANSLATION_RPC,
  TRANSLATION_RPC_CHANNEL,
  type TranslationCatalog,
  type TranslationCatalogProvider,
} from '../translation-protocol.ts'

/** Result envelope the generic connection channel resolves to. */
type CallResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly error: { readonly code?: string, readonly message?: string } }

/** Translation settings rejected or unavailable. */
export class TranslationSettingsFailure extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TranslationSettingsFailure'
    this.code = code
  }
}

function catalogProvider(value: unknown): TranslationCatalogProvider | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !Array.isArray(row.models)) return undefined
  const models: TranslationCatalogProvider['models'][number][] = []
  for (const model of row.models) {
    if (typeof model !== 'object' || model === null || Array.isArray(model)) return undefined
    const item = model as Record<string, unknown>
    if (typeof item.id !== 'string' || typeof item.name !== 'string') return undefined
    const base = {
      id: item.id,
      name: item.name,
      ...(typeof item.description === 'string' ? { description: item.description } : {}),
      ...(Array.isArray(item.inputModalities)
        ? { inputModalities: item.inputModalities.filter((value): value is string => typeof value === 'string') }
        : {}),
    }
    const reasoning = item.reasoning
    if (reasoning === undefined) {
      models.push(base)
      continue
    }
    if (typeof reasoning !== 'object' || reasoning === null || Array.isArray(reasoning)) return undefined
    const meta = reasoning as Record<string, unknown>
    if (!Array.isArray(meta.efforts)) return undefined
    const efforts: { id: string, name: string, description?: string }[] = []
    for (const effort of meta.efforts) {
      if (typeof effort !== 'object' || effort === null || Array.isArray(effort)) return undefined
      const rowEffort = effort as Record<string, unknown>
      if (typeof rowEffort.id !== 'string' || typeof rowEffort.name !== 'string') return undefined
      efforts.push({
        id: rowEffort.id,
        name: rowEffort.name,
        ...(typeof rowEffort.description === 'string' ? { description: rowEffort.description } : {}),
      })
    }
    models.push({
      ...base,
      reasoning: {
        efforts,
        ...(typeof meta.defaultEffort === 'string' ? { defaultEffort: meta.defaultEffort } : {}),
      },
    })
  }
  return { id: row.id, name: row.name, models }
}

function catalogView(value: unknown): TranslationCatalog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TranslationSettingsFailure('translation/catalog-malformed', 'translation catalog is malformed')
  }
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.providers)) {
    throw new TranslationSettingsFailure('translation/catalog-malformed', 'translation catalog is malformed')
  }
  const providers: TranslationCatalogProvider[] = []
  for (const provider of row.providers) {
    const parsed = catalogProvider(provider)
    if (parsed === undefined) {
      throw new TranslationSettingsFailure('translation/catalog-malformed', 'translation catalog is malformed')
    }
    providers.push(parsed)
  }
  const failures: string[] = []
  for (const failure of Array.isArray(row.failures) ? row.failures : []) {
    if (typeof failure === 'object' && failure !== null && !Array.isArray(failure)
      && typeof (failure as { provider?: unknown }).provider === 'string'
      && typeof (failure as { message?: unknown }).message === 'string') {
      failures.push((failure as { provider: string }).provider)
    }
  }
  return { providers, failures: failures.map(provider => ({ provider, message: 'catalog entry unavailable' })) }
}

/** Read/write pair consumed by the settings card and the runtime. */
export interface TranslationSettingsApi {
  read(signal?: AbortSignal): Promise<TranslationConfig>
  write(patch: Partial<TranslationConfig>, signal?: AbortSignal): Promise<TranslationConfig>
  /** Provider → model → reasoning directory for the picker. */
  catalog(signal?: AbortSignal): Promise<TranslationCatalog>
}

/**
 * Bind the runtime translation settings to one Connection handle.
 * @param connection - Harness Connection handle for loopback RPC.
 * @returns the read/write pair.
 */
export function createTranslationSettingsApi(connection: ConnectionHandle): TranslationSettingsApi {
  const call = async (endpoint: string, payload: unknown, signal?: AbortSignal): Promise<TranslationConfig> => {
    const result = await connection.rpc.call(
      TRANSLATION_RPC_CHANNEL,
      endpoint,
      payload,
      signal,
    ) as CallResult<TranslationConfig>
    if (!result.ok) {
      throw new TranslationSettingsFailure(
        result.error.code ?? 'translation/settings-unavailable',
        result.error.message ?? 'translation settings are unavailable',
      )
    }
    return result.value
  }
  const callCatalog = async (signal?: AbortSignal): Promise<TranslationCatalog> => {
    const result = await connection.rpc.call(
      TRANSLATION_RPC_CHANNEL,
      TRANSLATION_RPC.catalog,
      {},
      signal,
    ) as CallResult<unknown>
    if (!result.ok) {
      throw new TranslationSettingsFailure(
        result.error.code ?? 'translation/catalog-unavailable',
        result.error.message ?? 'translation catalog is unavailable',
      )
    }
    return catalogView(result.value)
  }
  return {
    read: async (signal) => await call(TRANSLATION_RPC.settingsRead, {}, signal),
    write: async (patch, signal) => await call(TRANSLATION_RPC.settingsWrite, patch, signal),
    catalog: callCatalog,
  }
}
