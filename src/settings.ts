/**
 * User-editable settings shared by the Host schema and the browser fallback.
 *
 * The body streaming engine is gone: only two preferences remain. Both live in
 * the profile entry config as volatile fields, so the Plugins-page card can
 * change them without re-activating the entry or restarting the harness.
 */

/** Settings namespace kept for the card's legacy registration helpers. */
export const STREAM_SETTINGS_NS = 'smooth-stream'

/** Preferences a user may set. */
export interface StreamSettings {
  /** Whether this plugin takes over the assistant row for the reasoning box. */
  enabled: boolean
  /** Whether the inline reasoning box follows its own stream while collapsed. */
  thinkAutoExpand: boolean
}

/** Defaults shared by the Host schema and the client-side fallback. */
export const DEFAULT_STREAM_SETTINGS: StreamSettings = {
  enabled: true,
  thinkAutoExpand: true,
}
