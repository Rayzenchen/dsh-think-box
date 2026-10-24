/**
 * Browser client for the plugin's runtime translation settings.
 *
 * The Plugins page card and the chat renderer both read the same Host store
 * through this loopback channel, so the card's saves reach the running
 * translation route without a harness restart.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { TranslationConfig } from '../config.ts'
import { TRANSLATION_RPC, TRANSLATION_RPC_CHANNEL } from '../translation-protocol.ts'

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

/** Read/write pair consumed by the settings card and the runtime. */
export interface TranslationSettingsApi {
  read(signal?: AbortSignal): Promise<TranslationConfig>
  write(patch: Partial<TranslationConfig>, signal?: AbortSignal): Promise<TranslationConfig>
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
  return {
    read: async (signal) => await call(TRANSLATION_RPC.settingsRead, {}, signal),
    write: async (patch, signal) => await call(TRANSLATION_RPC.settingsWrite, patch, signal),
  }
}
