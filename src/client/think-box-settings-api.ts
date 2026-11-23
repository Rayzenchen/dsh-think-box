/** Browser adapter for the Host-owned think-box settings RPC. */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ThinkBoxSettings } from '../settings.ts'
import {
  THINK_BOX_SETTINGS_RPC,
  THINK_BOX_SETTINGS_RPC_CHANNEL,
  type ThinkBoxSettingsView,
} from '../settings-api.ts'

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function settingsView(value: unknown): ThinkBoxSettingsView {
  const data = record(value)
  if (data === undefined
    || typeof data.writable !== 'boolean'
    || typeof data.enabled !== 'boolean'
    || typeof data.thinkAutoExpand !== 'boolean') {
    throw new Error('dsh-think-box: malformed settings response')
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
export interface ThinkBoxSettingsApi {
  read(): Promise<ThinkBoxSettingsView>
  write(settings: ThinkBoxSettings): Promise<ThinkBoxSettingsView>
}

/** Build the typed facade over the generic Connection RPC service. */
export function createThinkBoxSettingsApi(connection: ConnectionHandle): ThinkBoxSettingsApi {
  return {
    async read(): Promise<ThinkBoxSettingsView> {
      return settingsView(accepted(await connection.rpc.call(THINK_BOX_SETTINGS_RPC_CHANNEL, THINK_BOX_SETTINGS_RPC.read, {})))
    },
    async write(settings: ThinkBoxSettings): Promise<ThinkBoxSettingsView> {
      return settingsView(accepted(await connection.rpc.call(
        THINK_BOX_SETTINGS_RPC_CHANNEL,
        THINK_BOX_SETTINGS_RPC.write,
        { enabled: settings.enabled, thinkAutoExpand: settings.thinkAutoExpand },
      )))
    },
  }
}
