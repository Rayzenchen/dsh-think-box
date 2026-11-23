/** Browser adapter for the Host-owned smooth-stream settings RPC. */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { StreamSettings } from '../settings.ts'
import {
  STREAM_SETTINGS_RPC,
  STREAM_SETTINGS_RPC_CHANNEL,
  type StreamSettingsView,
} from '../settings-api.ts'

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function settingsView(value: unknown): StreamSettingsView {
  const data = record(value)
  if (data === undefined
    || typeof data.writable !== 'boolean'
    || typeof data.enabled !== 'boolean'
    || typeof data.thinkAutoExpand !== 'boolean') {
    throw new Error('dsh-smooth-stream: malformed settings response')
  }
  return {
    writable: data.writable,
    enabled: data.enabled,
    thinkAutoExpand: data.thinkAutoExpand,
  }
}

function accepted(result: Awaited<ReturnType<ConnectionHandle['rpc']['call']>>): unknown {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

/** Narrow client contract consumed by the staged settings-card controller. */
export interface SmoothStreamSettingsApi {
  read(): Promise<StreamSettingsView>
  write(settings: StreamSettings): Promise<StreamSettingsView>
}

/** Build the typed facade over the generic Connection RPC service. */
export function createSmoothStreamSettingsApi(connection: ConnectionHandle): SmoothStreamSettingsApi {
  return {
    async read(): Promise<StreamSettingsView> {
      return settingsView(accepted(await connection.rpc.call(STREAM_SETTINGS_RPC_CHANNEL, STREAM_SETTINGS_RPC.read, {})))
    },
    async write(settings: StreamSettings): Promise<StreamSettingsView> {
      return settingsView(accepted(await connection.rpc.call(
        STREAM_SETTINGS_RPC_CHANNEL,
        STREAM_SETTINGS_RPC.write,
        { enabled: settings.enabled, thinkAutoExpand: settings.thinkAutoExpand },
      )))
    },
  }
}
