/** Shared wire vocabulary for the plugin-owned settings RPC channel. */

/** Dedicated, loopback-only RPC channel registered by the Host half. */
export const THINK_BOX_SETTINGS_RPC_CHANNEL = '/think-box'

/** Endpoints accepted by {@link THINK_BOX_SETTINGS_RPC_CHANNEL}. */
export const THINK_BOX_SETTINGS_RPC = {
  read: 'settings.read',
  write: 'settings.write',
} as const

/** Redacted, plugin-owned configuration state returned to the browser. */
export interface ThinkBoxSettingsView {
  /** Whether the Host settings provider permits a write. */
  writable: boolean
  /** Whether this plugin owns the assistant row. */
  enabled: boolean
  /** Whether the inline reasoning box follows its own stream. */
  thinkAutoExpand: boolean
}
