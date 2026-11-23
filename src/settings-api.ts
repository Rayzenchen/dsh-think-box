/** Shared wire vocabulary for the plugin-owned settings RPC channel. */

/** Dedicated, loopback-only RPC channel registered by the Host half. */
export const STREAM_SETTINGS_RPC_CHANNEL = '/smooth-stream'

/** Endpoints accepted by {@link STREAM_SETTINGS_RPC_CHANNEL}. */
export const STREAM_SETTINGS_RPC = {
  read: 'settings.read',
  write: 'settings.write',
} as const

/** Redacted, plugin-owned configuration state returned to the browser. */
export interface StreamSettingsView {
  /** Whether the Host settings provider permits a write. */
  writable: boolean
  /** Whether this plugin owns the assistant row. */
  enabled: boolean
  /** Whether the inline reasoning box follows its own stream. */
  thinkAutoExpand: boolean
}
