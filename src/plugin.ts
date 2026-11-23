import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import Schema from '@deepseek-ai/schemastery'
import {
  DEFAULT_STREAM_CONFIG,
  DEFAULT_TRANSLATION_CONFIG,
  type StreamConfig,
  type StreamMode,
  type Volatile,
} from './config.ts'
import { createLlmTranslationRoute, createTranslationHandler, type LlmServiceLike } from './translation-host.ts'
import { TRANSLATION_RPC_CHANNEL } from './translation-protocol.ts'
import { createTranslationSettingsStore } from './translation-settings.ts'
import { injectStreamConfig } from './boot-config.ts'
import { registerSettingsChannel } from './settings-channel.ts'
import {
  STREAM_SETTINGS_RPC,
  STREAM_SETTINGS_RPC_CHANNEL,
  type StreamDebugSettingsView,
  type StreamSettingsView,
} from './settings-api.ts'
import {
  DEFAULT_STREAM_SETTINGS,
  STREAM_SETTINGS_NS,
  type StreamDebugTuning,
  type StreamMotionPreference,
  type StreamSettings,
  type StreamSmoothingPreset,
} from './settings.ts'

/** Display name shown by the Host loader while the plugin is mounted. */
export const name = '@local/dsh-think-box'

/**
 * Profile entry id this package is inserted under by `cordis.patch.yml`. The
 * fallback entry lookup (see {@link resolveConfigTarget}) matches this id.
 */
const CONFIG_ENTRY_ID = 'think-box'

/**
 * Plugin configuration: the composition-time engine settings plus the
 * user-editable preferences the Plugins page now persists in the same profile
 * entry (0.2.x replacement for the removed `settings.register` namespace).
 *
 * The volatile fields are references at runtime, so every read goes through
 * `.get()`; the plain fields are ordinary composition values.
 */
export interface Config {
  /** Compatibility field; both values use the current adaptive reveal engine. */
  readonly mode: StreamMode
  /** Smoothing preset for the reveal cadence (live user preference). */
  readonly preset: Volatile<StreamSmoothingPreset>
  /** Unused at runtime; kept so existing overlays load. */
  readonly revealCharsPerSec: number
  /** Unused at runtime; kept so existing overlays load. */
  readonly scrollSpeedPxPerSec: number
  /** Unused at runtime; retained so existing overlays continue to load. */
  readonly maxScrollSpeedPxPerSec: number
  /** Reasoning-translation backend and request limits (composition seed). */
  readonly translation: {
    readonly backend: 'bundle' | 'llm'
    readonly provider: string
    readonly model: string
    readonly reasoningEffort: string
    readonly targetLanguage: string
    readonly maxTextChars: number
    readonly maxTokens: number
    readonly timeoutMs: number
    readonly autoTranslate: boolean
  }
  /** Whether this plugin owns conversation rendering. */
  readonly enabled: Volatile<boolean>
  /** Whether this plugin also owns conversation bottom-follow. */
  readonly controlScroll: Volatile<boolean>
  /** How the reveal honors the OS reduced-motion preference. */
  readonly motionPreference: Volatile<StreamMotionPreference>
  /** Whether a reasoning block follows while it is the streaming tail. */
  readonly thinkAutoExpand: Volatile<boolean>
  /** Logarithmic text fade for the answer and expanded thinking body. */
  readonly logarithmicFade: Volatile<boolean>
  /** Whether the live renderer diagnostics panel is enabled. */
  readonly debugEnabled: Volatile<boolean>
  /** Values edited by the diagnostics panel. */
  readonly debugTuning: Volatile<StreamDebugTuning>
}

/** Symbol the Loader uses to commit a new volatile snapshot into a reference. */
const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

/** Commit a new snapshot into one config reference (the Loader's own protocol). */
function writeConfigRef<T>(ref: Volatile<T>, value: T): void {
  const writable = ref as unknown as { [key: symbol]: ((value: unknown) => void) | undefined }
  writable[VOLATILE_WRITE]?.(value)
}

/**
 * Mark one schema field volatile exactly like Schemastery's `.volatile()` does
 * (`extra('volatile', true)`). Local helper because the pinned dev dependency
 * (schemastery 3.18) does not ship the builder method yet, while the deployed
 * host does.
 * @param schema - leaf schema to mark.
 * @returns the marked schema.
 */
function volatileField<T>(schema: Schema<T>): Schema<T> {
  const candidate = schema as unknown as { extra?: (key: string, value: unknown) => Schema<T> }
  return typeof candidate.extra === 'function' ? candidate.extra('volatile', true) : schema
}

/**
 * Raw plugin configuration accepted from the profile patch: the same shape
 * with plain values (the schema output turns the preference fields into
 * references).
 */
export type ConfigInput = Partial<StreamConfig>

/**
 * Plugin configuration schema. Ordinary fields keep Cordis' load-time
 * validation; the preference fields are volatile, so profile-patch edits reach
 * the running plugin without re-activating it.
 */
export const Config = Schema.object({
  mode: Schema.union(['typewriter', 'teleprompter'] as const).default(DEFAULT_STREAM_CONFIG.mode),
  preset: volatileField(
    Schema.union(['realtime', 'balanced', 'silky'] as const).default(DEFAULT_STREAM_SETTINGS.preset),
  ),
  revealCharsPerSec: Schema.number()
    .min(5)
    .max(200)
    .default(DEFAULT_STREAM_CONFIG.revealCharsPerSec),
  scrollSpeedPxPerSec: Schema.number()
    .min(1)
    .max(200)
    .default(DEFAULT_STREAM_CONFIG.scrollSpeedPxPerSec),
  maxScrollSpeedPxPerSec: Schema.number()
    .min(1)
    .max(2000)
    .default(DEFAULT_STREAM_CONFIG.maxScrollSpeedPxPerSec),
  translation: Schema.object({
    backend: Schema.union(['bundle', 'llm'] as const).default(DEFAULT_TRANSLATION_CONFIG.backend),
    provider: Schema.string().default(DEFAULT_TRANSLATION_CONFIG.provider),
    model: Schema.string().default(DEFAULT_TRANSLATION_CONFIG.model),
    reasoningEffort: Schema.string().default(DEFAULT_TRANSLATION_CONFIG.reasoningEffort ?? 'low'),
    targetLanguage: Schema.string().default(DEFAULT_TRANSLATION_CONFIG.targetLanguage),
    maxTextChars: Schema.number().min(2).max(1_000_000).default(DEFAULT_TRANSLATION_CONFIG.maxTextChars),
    maxTokens: Schema.number().min(1).max(1_000_000).default(DEFAULT_TRANSLATION_CONFIG.maxTokens),
    timeoutMs: Schema.number().min(1_000).max(600_000).default(DEFAULT_TRANSLATION_CONFIG.timeoutMs),
    autoTranslate: Schema.boolean().default(DEFAULT_TRANSLATION_CONFIG.autoTranslate),
  }).default(DEFAULT_TRANSLATION_CONFIG),
  enabled: volatileField(Schema.boolean().default(DEFAULT_STREAM_SETTINGS.enabled)),
  controlScroll: volatileField(Schema.boolean().default(DEFAULT_STREAM_SETTINGS.controlScroll)),
  motionPreference: volatileField(Schema.union([
    Schema.const('auto'),
    Schema.const('force-smooth'),
    Schema.const('force-reduced'),
  ] as const).default(DEFAULT_STREAM_SETTINGS.motionPreference)),
  thinkAutoExpand: volatileField(Schema.boolean().default(DEFAULT_STREAM_SETTINGS.thinkAutoExpand)),
  logarithmicFade: volatileField(Schema.boolean().default(DEFAULT_STREAM_SETTINGS.logarithmicFade)),
  debugEnabled: volatileField(Schema.boolean().default(DEFAULT_STREAM_SETTINGS.debugEnabled)),
  debugTuning: volatileField(Schema.object({
    revealScale: Schema.number().min(0.25).max(2).default(DEFAULT_STREAM_SETTINGS.debugTuning.revealScale),
    queuePressure: Schema.number().min(0).max(2).default(DEFAULT_STREAM_SETTINGS.debugTuning.queuePressure),
    maxRevealCps: Schema.number().min(120).max(1000).default(DEFAULT_STREAM_SETTINGS.debugTuning.maxRevealCps),
    springStiffness: Schema.number().min(40).max(320).default(DEFAULT_STREAM_SETTINGS.debugTuning.springStiffness),
    springDamping: Schema.number().min(8).max(80).default(DEFAULT_STREAM_SETTINGS.debugTuning.springDamping),
    springMass: Schema.number().min(0.5).max(3).default(DEFAULT_STREAM_SETTINGS.debugTuning.springMass),
    runwayPx: Schema.number().min(0).max(120).default(DEFAULT_STREAM_SETTINGS.debugTuning.runwayPx),
    reserveResponseMs: Schema.number().min(60).max(600).default(DEFAULT_STREAM_SETTINGS.debugTuning.reserveResponseMs),
    backpressureMinScale: Schema.number().min(0.25).max(1).default(DEFAULT_STREAM_SETTINGS.debugTuning.backpressureMinScale),
  })),
}) as unknown as Schema<ConfigInput, Config>

/** One registered plugin entry as the config editor exposes it. */
interface ConfigEntryLike {
  readonly options: { readonly id?: string; readonly config?: unknown }
}

/** Structural subset of the 0.2.x `configEditor` service this plugin uses. */
interface ConfigEditorLike {
  entries(): ConfigEntryLike[]
  edit(
    entry: ConfigEntryLike,
    change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<void>
}

/** The profile row this plugin owns, plus the editor that persists it. */
interface ConfigTarget {
  readonly editor: ConfigEditorLike
  readonly entry: ConfigEntryLike
}

/**
 * Locate the profile entry this plugin may edit. The Loader stamps the owning
 * entry onto the plugin fiber; when that stamp is unavailable (test contexts,
 * unusual compositions) fall back to the config editor's own entry list. A
 * target-less deployment is readable but not writable — never a load failure.
 * @param ctx - plugin context.
 * @returns editor plus entry, or `undefined` when this kernel cannot persist.
 */
function resolveConfigTarget(ctx: Context): ConfigTarget | undefined {
  let editor: ConfigEditorLike | undefined
  try {
    editor = ctx.get('configEditor') as unknown as ConfigEditorLike | undefined
  } catch {
    editor = undefined
  }
  if (editor === undefined || typeof editor.edit !== 'function' || typeof editor.entries !== 'function') return undefined
  const fiberEntry = (ctx.fiber as unknown as { entry?: ConfigEntryLike }).entry
  if (fiberEntry !== undefined) return { editor, entry: fiberEntry }
  try {
    const entry = editor.entries().find(candidate => candidate.options.id === CONFIG_ENTRY_ID)
    return entry === undefined ? undefined : { editor, entry }
  } catch {
    return undefined
  }
}

/** Read the live preference snapshot from the volatile references. */
function readSettings(config: Config): StreamSettings {
  return {
    enabled: config.enabled.get(),
    controlScroll: config.controlScroll.get(),
    preset: config.preset.get(),
    motionPreference: config.motionPreference.get(),
    thinkAutoExpand: config.thinkAutoExpand.get(),
    logarithmicFade: config.logarithmicFade.get(),
    debugEnabled: config.debugEnabled.get(),
    debugTuning: { ...config.debugTuning.get() },
  }
}

/**
 * Complete JSON-safe boot snapshot for one page load: every volatile reference
 * is read here, so the inline script never receives (or stringifies) a
 * reference. The card's RPC then picks up the live values.
 * @param config - resolved plugin configuration.
 * @returns plain config object for the browser half.
 */
function bootSnapshot(config: Config): StreamConfig {
  return {
    ...readSettings(config),
    mode: config.mode,
    revealCharsPerSec: config.revealCharsPerSec,
    scrollSpeedPxPerSec: config.scrollSpeedPxPerSec,
    maxScrollSpeedPxPerSec: config.maxScrollSpeedPxPerSec,
    translation: { ...config.translation },
  }
}

/** Validation verdict for one settings write. */
type PatchResult =
  | { readonly ok: true; readonly settings: StreamSettings }
  | { readonly ok: false; readonly message: string }

/**
 * Validate a partial settings patch and merge it over the live snapshot.
 * @param current - live preference snapshot.
 * @param payload - raw RPC payload.
 * @param extras - whether the payload may carry the diagnostics pair.
 * @returns the complete settings object to persist, or the rejection message.
 */
function mergeSettingsPatch(current: StreamSettings, payload: unknown, extras: boolean): PatchResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, message: 'settings payload must be an object' }
  }
  const next = payload as Partial<Record<keyof StreamSettings, unknown>>
  if (typeof next.enabled !== 'boolean' || typeof next.controlScroll !== 'boolean' || typeof next.thinkAutoExpand !== 'boolean') {
    return { ok: false, message: 'enabled, controlScroll and thinkAutoExpand must be booleans' }
  }
  if (next.preset !== undefined && next.preset !== 'realtime' && next.preset !== 'balanced' && next.preset !== 'silky') {
    return { ok: false, message: 'preset must be one of realtime | balanced | silky' }
  }
  if (next.motionPreference !== undefined
    && next.motionPreference !== 'auto'
    && next.motionPreference !== 'force-smooth'
    && next.motionPreference !== 'force-reduced') {
    return { ok: false, message: 'motionPreference must be one of auto | force-smooth | force-reduced' }
  }
  if (next.logarithmicFade !== undefined && typeof next.logarithmicFade !== 'boolean') {
    return { ok: false, message: 'logarithmicFade must be a boolean' }
  }
  const hasDebug = next.debugEnabled !== undefined || next.debugTuning !== undefined
  if (hasDebug) {
    if (!extras) return { ok: false, message: 'debug settings are not accepted on this endpoint' }
    if (typeof next.debugEnabled !== 'boolean' || !validDebugTuning(next.debugTuning)) {
      return { ok: false, message: 'debugEnabled and debugTuning must be provided together and be valid' }
    }
  }
  const merged: StreamSettings = {
    ...current,
    enabled: next.enabled,
    controlScroll: next.controlScroll,
    thinkAutoExpand: next.thinkAutoExpand,
    ...(next.preset === undefined ? {} : { preset: next.preset }),
    ...(next.motionPreference === undefined ? {} : { motionPreference: next.motionPreference }),
    ...(next.logarithmicFade === undefined ? {} : { logarithmicFade: next.logarithmicFade }),
    ...(hasDebug
      ? { debugEnabled: next.debugEnabled as boolean, debugTuning: next.debugTuning as StreamDebugTuning }
      : {}),
  }
  return { ok: true, settings: merged }
}

/** Whether a diagnostics tuning object matches the published bounds. */
function validDebugTuning(value: unknown): value is StreamDebugTuning {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const tuning = value as Record<string, unknown>
  return typeof tuning.revealScale === 'number'
    && tuning.revealScale >= 0.25 && tuning.revealScale <= 2
    && typeof tuning.queuePressure === 'number'
    && tuning.queuePressure >= 0 && tuning.queuePressure <= 2
    && typeof tuning.maxRevealCps === 'number'
    && tuning.maxRevealCps >= 120 && tuning.maxRevealCps <= 1000
    && typeof tuning.springStiffness === 'number'
    && tuning.springStiffness >= 40 && tuning.springStiffness <= 320
    && typeof tuning.springDamping === 'number'
    && tuning.springDamping >= 8 && tuning.springDamping <= 80
    && typeof tuning.springMass === 'number'
    && tuning.springMass >= 0.5 && tuning.springMass <= 3
    && typeof tuning.runwayPx === 'number'
    && tuning.runwayPx >= 0 && tuning.runwayPx <= 120
    && typeof tuning.reserveResponseMs === 'number'
    && tuning.reserveResponseMs >= 60 && tuning.reserveResponseMs <= 600
    && typeof tuning.backpressureMinScale === 'number'
    && tuning.backpressureMinScale >= 0.25 && tuning.backpressureMinScale <= 1
}

/** Commit every preference field into its volatile reference. */
function writeSettingsRefs(config: Config, settings: StreamSettings): void {
  writeConfigRef(config.enabled, settings.enabled)
  writeConfigRef(config.controlScroll, settings.controlScroll)
  writeConfigRef(config.preset, settings.preset)
  writeConfigRef(config.motionPreference, settings.motionPreference)
  writeConfigRef(config.thinkAutoExpand, settings.thinkAutoExpand)
  writeConfigRef(config.logarithmicFade, settings.logarithmicFade)
  writeConfigRef(config.debugEnabled, settings.debugEnabled)
  writeConfigRef(config.debugTuning, { ...settings.debugTuning })
}

/**
 * Persist one complete preference snapshot into the owning profile entry.
 *
 * `configEditor.edit()` replaces the entry's whole config, so the callback
 * merges the inherited bundle layer and the current profile row before adding
 * this plugin's fields; otherwise composition seeds such as `translation`
 * would fall back to the schema defaults on the first card save.
 * @param target - profile row plus editor.
 * @param settings - complete preference snapshot to persist.
 * @returns fulfillment after the Loader reconciled the profile patch.
 */
async function persistSettings(target: ConfigTarget, settings: StreamSettings): Promise<void> {
  await target.editor.edit(target.entry, (current, inherited) => ({
    ...inherited,
    ...current,
    ...settings,
  }))
}

/**
 * Host half: bridge the composition config to the browser half, keep the
 * reasoning-translation bridge alive, and serve the Plugins-page card over the
 * plugin-owned loopback RPC. Preferences are stored in the profile entry config
 * through `configEditor` (0.2.x native path); volatile fields make an edit reach
 * the running renderer without re-activating this entry.
 * @param ctx - Host context carrying the web server service when composed.
 * @param config - Schema-validated configuration (volatile fields are refs).
 */
export function apply(ctx: Context, config: Config): void {
  console.log(
    `[dsh-think-box] plugin loaded! mode=${config.mode} preset=${readSettings(config).preset} `
    + `seed=${config.revealCharsPerSec}cps scroll=${config.scrollSpeedPxPerSec}px/s `
    + `maxScroll=${config.maxScrollSpeedPxPerSec}px/s `
    + `translation=${config.translation.backend}`
    + (config.translation.backend === 'llm'
      ? ` route=${config.translation.provider}/${config.translation.model}`
      : ''),
  )
  // The web boot graph carries no per-entry config, so the validated value is
  // injected into every served index response as a boot global the client
  // entry reads at apply time. Volatile references are read here - the inline
  // script only ever receives plain data.
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.tapIndex(html => injectStreamConfig(html, bootSnapshot(config))),
      'dsh-smooth-stream: boot config bridge',
    )
  })
  // Opt-in LLM translation bridge: any registered Harness route can translate
  // the think box (for example a free OpenAI-compatible provider). The route is
  // resolved per request, so a changed catalog reaches the next translation
  // without restarting; only the backend choice itself needs a reload.
  const translationStore = createTranslationSettingsStore(config.translation)
  ctx.inject(['webServer'], (translateCtx) => {
    const route = createLlmTranslationRoute(
      () => translationStore.snapshot(),
      () => translateCtx.get('llm') as unknown as LlmServiceLike | undefined,
    )
    registerSettingsChannel(
      translateCtx,
      TRANSLATION_RPC_CHANNEL,
      createTranslationHandler(route, translationStore) as unknown as ConnectionRpcHandler,
    )
  })
  // The preferences are no longer a settings namespace, so the auto-generated
  // settings page would render a second, empty form for this entry. Disable it;
  // the card below owns the edit surface.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => {
      const forms = settingsCtx.get('settings') as unknown as {
        configure?: (presentation: { auto?: boolean }, owner: unknown) => () => void
      }
      if (typeof forms.configure !== 'function') return () => {}
      return forms.configure({ auto: false }, ctx.fiber)
    }, 'dsh-smooth-stream: settings page policy')
  })

  /** The current card view, including whether a profile write is possible. */
  const view = (): StreamSettingsView => {
    const settings = readSettings(config)
    return {
      version: '',
      installation: 'unmanaged',
      writable: resolveConfigTarget(ctx) !== undefined,
      enabled: settings.enabled,
      controlScroll: settings.controlScroll,
      preset: settings.preset,
      motionPreference: settings.motionPreference,
      thinkAutoExpand: settings.thinkAutoExpand,
      logarithmicFade: settings.logarithmicFade,
      canUpgrade: false,
    }
  }

  /** The diagnostics view; the tuning object is a detached copy. */
  const debugView = (): StreamDebugSettingsView => {
    const settings = readSettings(config)
    return {
      debugEnabled: settings.debugEnabled,
      tuning: { ...settings.debugTuning },
    }
  }


  /** Reject a write when this deployment cannot persist profile config. */
  const readOnly = <T>(): T => ({
    ok: false,
    error: {
      code: 'settings-rejected',
      message: 'smooth-stream settings are read-only: no config editor entry is available in this profile',
      details: { ns: STREAM_SETTINGS_NS },
    },
  }) as T

  const handle: ConnectionRpcHandler = async (endpoint, payload) => {
    if (endpoint === STREAM_SETTINGS_RPC.read) return { ok: true, value: view() }
    if (endpoint === STREAM_SETTINGS_RPC.write) {
      const target = resolveConfigTarget(ctx)
      if (target === undefined) return readOnly()
      const merged = mergeSettingsPatch(readSettings(config), payload, true)
      if (!merged.ok) {
        return { ok: false, error: { code: 'settings-rejected', message: merged.message, details: { ns: STREAM_SETTINGS_NS } } }
      }
      try {
        await persistSettings(target, merged.settings)
      } catch {
        return {
          ok: false,
          error: {
            code: 'settings-rejected',
            message: 'smooth-stream settings could not be saved to the profile',
            details: { ns: STREAM_SETTINGS_NS },
          },
        }
      }
      // The Loader commits volatile config as part of the reconcile above; the
      // local write keeps the RPC response consistent even on kernels whose
      // reconcile returns before the reference update lands.
      writeSettingsRefs(config, merged.settings)
      return { ok: true, value: view() }
    }
    if (endpoint === STREAM_SETTINGS_RPC.debugRead) return { ok: true, value: debugView() }
    if (endpoint === STREAM_SETTINGS_RPC.debugWrite) {
      const target = resolveConfigTarget(ctx)
      if (target === undefined) return readOnly()
      const current = readSettings(config)
      const merged = mergeSettingsPatch(current, {
        enabled: current.enabled,
        controlScroll: current.controlScroll,
        thinkAutoExpand: current.thinkAutoExpand,
        debugEnabled: (payload as { debugEnabled?: unknown }).debugEnabled,
        debugTuning: (payload as { tuning?: unknown }).tuning,
      }, true)
      if (!merged.ok) {
        return { ok: false, error: { code: 'settings-rejected', message: merged.message, details: { ns: STREAM_SETTINGS_NS } } }
      }
      try {
        await persistSettings(target, merged.settings)
      } catch {
        return {
          ok: false,
          error: {
            code: 'settings-rejected',
            message: 'smooth-stream debug settings could not be saved to the profile',
            details: { ns: STREAM_SETTINGS_NS },
          },
        }
      }
      writeSettingsRefs(config, merged.settings)
      return { ok: true, value: debugView() }
    }
    return { ok: false, error: { code: 'internal', message: `unknown smooth-stream endpoint ${JSON.stringify(endpoint)}`, details: {} } }
  }

  // Mount the card channel on whichever fiber can own it: the Connection
  // service path when that service is injectable, otherwise the web server's
  // direct route (registerSettingsChannel serves the same envelopes and keeps
  // the loopback-only policy). Mounting is unconditional: the card must not
  // disappear because no settings namespace exists any more.
  let mounted = false
  const mountChannel = (mountCtx: Context): void => {
    if (mounted) return
    mounted = true
    const dispose = registerSettingsChannel(mountCtx, STREAM_SETTINGS_RPC_CHANNEL, handle)
    mountCtx.effect(() => () => {
      mounted = false
      dispose()
    }, 'dsh-smooth-stream: settings channel lifetime')
  }
  ctx.inject(['connection'], mountChannel)
  ctx.inject(['webServer'], mountChannel)
}
