import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import Schema from '@deepseek-ai/schemastery'
import {
  DEFAULT_TRANSLATION_CONFIG,
  type ThinkBoxConfig,
  type Volatile,
} from './config.ts'
import {
  createLlmTranslationRoute,
  createTranslationCatalogReader,
  createTranslationHandler,
  type LlmServiceLike,
} from './translation-host.ts'
import { TRANSLATION_RPC_CHANNEL } from './translation-protocol.ts'
import { createTranslationSettingsStore } from './translation-settings.ts'
import { injectThinkBoxConfig } from './boot-config.ts'
import { registerSettingsChannel } from './settings-channel.ts'
import {
  THINK_BOX_SETTINGS_RPC,
  THINK_BOX_SETTINGS_RPC_CHANNEL,
  type ThinkBoxSettingsView,
} from './settings-api.ts'
import {
  DEFAULT_THINK_BOX_SETTINGS,
  THINK_BOX_SETTINGS_NS,
  type ThinkBoxSettings,
} from './settings.ts'

/** Display name shown by the Host loader while the plugin is mounted. */
export const name = '@local/dsh-think-box'

/**
 * Profile entry id this package is inserted under by `cordis.patch.yml`. The
 * fallback entry lookup (see {@link resolveConfigTarget}) matches this id.
 */
const CONFIG_ENTRY_ID = 'think-box'

/**
 * Plugin configuration: the live preferences persisted in the profile entry
 * config (0.2.x replacement for the removed `settings.register` namespace)
 * plus the composition-time translation seed.
 *
 * The two preference fields are volatile references at runtime, so every read
 * goes through `.get()`; translation is an ordinary composition value.
 */
export interface Config {
  /** Whether this plugin takes over the assistant row for the reasoning box. */
  readonly enabled: Volatile<boolean>
  /** Whether the inline reasoning box follows its own stream while collapsed. */
  readonly thinkAutoExpand: Volatile<boolean>
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
export type ConfigInput = Partial<ThinkBoxConfig>

/** Plugin configuration schema. Both preferences live in the profile entry. */
export const Config = Schema.object({
  enabled: volatileField(Schema.boolean().default(DEFAULT_THINK_BOX_SETTINGS.enabled)),
  thinkAutoExpand: volatileField(Schema.boolean().default(DEFAULT_THINK_BOX_SETTINGS.thinkAutoExpand)),
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
function readSettings(config: Config): ThinkBoxSettings {
  return {
    enabled: config.enabled.get(),
    thinkAutoExpand: config.thinkAutoExpand.get(),
  }
}

/**
 * Complete JSON-safe boot snapshot for one page load: every volatile reference
 * is read here, so the inline script never receives (or stringifies) a
 * reference. The card's RPC then picks up the live values.
 * @param config - resolved plugin configuration.
 * @returns plain config object for the browser half.
 */
function bootSnapshot(config: Config): ThinkBoxConfig {
  return {
    ...readSettings(config),
    translation: { ...config.translation },
  }
}

/** Validation verdict for one settings write. */
type PatchResult =
  | { readonly ok: true; readonly settings: ThinkBoxSettings }
  | { readonly ok: false; readonly message: string }

/**
 * Validate a partial settings patch and merge it over the live snapshot.
 * @param current - live preference snapshot.
 * @param payload - raw RPC payload.
 * @returns the complete settings object to persist, or the rejection message.
 */
function mergeSettingsPatch(current: ThinkBoxSettings, payload: unknown): PatchResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, message: 'settings payload must be an object' }
  }
  const next = payload as Partial<Record<keyof ThinkBoxSettings, unknown>>
  if (next.enabled !== undefined && typeof next.enabled !== 'boolean') {
    return { ok: false, message: 'enabled must be a boolean' }
  }
  if (next.thinkAutoExpand !== undefined && typeof next.thinkAutoExpand !== 'boolean') {
    return { ok: false, message: 'thinkAutoExpand must be a boolean' }
  }
  const merged: ThinkBoxSettings = {
    enabled: typeof next.enabled === 'boolean' ? next.enabled : current.enabled,
    thinkAutoExpand: typeof next.thinkAutoExpand === 'boolean' ? next.thinkAutoExpand : current.thinkAutoExpand,
  }
  return { ok: true, settings: merged }
}

/** Commit every preference field into its volatile reference. */
function writeSettingsRefs(config: Config, settings: ThinkBoxSettings): void {
  writeConfigRef(config.enabled, settings.enabled)
  writeConfigRef(config.thinkAutoExpand, settings.thinkAutoExpand)
}

/**
 * Persist one complete preference snapshot into the owning profile entry.
 *
 * `configEditor.edit()` replaces the entry's whole config, so the callback
 * merges the inherited bundle layer and adds this plugin's fields explicitly.
 * Only the current fields are written: the first save also drops legacy
 * engine/preference keys an older row may still carry. The translation seed is
 * taken from the current row, else the inherited bundle layer.
 * @param target - profile row plus editor.
 * @param settings - complete preference snapshot to persist.
 * @returns fulfillment after the Loader reconciled the profile patch.
 */
async function persistSettings(target: ConfigTarget, settings: ThinkBoxSettings): Promise<void> {
  await target.editor.edit(target.entry, (current, inherited) => {
    const translation = current.translation ?? inherited.translation
    const next: Record<string, unknown> = {
      ...inherited,
      enabled: settings.enabled,
      thinkAutoExpand: settings.thinkAutoExpand,
    }
    if (translation !== undefined) next.translation = translation
    return next
  })
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
    `[dsh-think-box] plugin loaded! enabled=${String(config.enabled.get())} `
    + `thinkAutoExpand=${String(config.thinkAutoExpand.get())} `
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
      () => httpCtx.webServer.tapIndex(html => injectThinkBoxConfig(html, bootSnapshot(config))),
      'dsh-think-box: boot config bridge',
    )
  })
  // The LLM service can live in a fiber the web-server child cannot resolve
  // (0.2.x looks services up per injection scope). Capture the handle from its
  // own injection and share it with both the translator and the catalog reader;
  // the web-server child lookup stays as a fallback for compositions where the
  // service mounts later.
  let llmHandle: LlmServiceLike | undefined
  ctx.inject(['llm'], (llmCtx) => {
    llmHandle = llmCtx.get('llm') as unknown as LlmServiceLike | undefined
    return () => { llmHandle = undefined }
  })
  // Opt-in LLM translation bridge: any registered Harness route can translate
  // the think box (for example a free OpenAI-compatible provider). The route is
  // resolved per request, so a changed catalog reaches the next translation
  // without restarting; only the backend choice itself needs a reload.
  const translationStore = createTranslationSettingsStore(config.translation)
  ctx.inject(['webServer'], (translateCtx) => {
    const resolveLlm = (): LlmServiceLike | undefined => {
      if (llmHandle !== undefined) return llmHandle
      try {
        return translateCtx.get('llm') as unknown as LlmServiceLike | undefined
      } catch {
        return undefined
      }
    }
    const route = createLlmTranslationRoute(
      () => translationStore.snapshot(),
      resolveLlm,
    )
    const catalog = createTranslationCatalogReader(resolveLlm)
    registerSettingsChannel(
      translateCtx,
      TRANSLATION_RPC_CHANNEL,
      createTranslationHandler(route, translationStore, catalog) as unknown as ConnectionRpcHandler,
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
    }, 'dsh-think-box: settings page policy')
  })

  /** The current card view, including whether a profile write is possible. */
  const view = (): ThinkBoxSettingsView => {
    const settings = readSettings(config)
    return {
      writable: resolveConfigTarget(ctx) !== undefined,
      enabled: settings.enabled,
      thinkAutoExpand: settings.thinkAutoExpand,
    }
  }

  /** Reject a write when this deployment cannot persist profile config. */
  const readOnly = <T>(): T => ({
    ok: false,
    error: {
      code: 'settings-rejected',
      message: 'think-box settings are read-only: no config editor entry is available in this profile',
      details: { ns: THINK_BOX_SETTINGS_NS },
    },
  }) as T

  const handle: ConnectionRpcHandler = async (endpoint, payload) => {
    if (endpoint === THINK_BOX_SETTINGS_RPC.read) return { ok: true, value: view() }
    if (endpoint === THINK_BOX_SETTINGS_RPC.write) {
      const target = resolveConfigTarget(ctx)
      if (target === undefined) return readOnly()
      const merged = mergeSettingsPatch(readSettings(config), payload)
      if (!merged.ok) {
        return { ok: false, error: { code: 'settings-rejected', message: merged.message, details: { ns: THINK_BOX_SETTINGS_NS } } }
      }
      try {
        await persistSettings(target, merged.settings)
      } catch {
        return {
          ok: false,
          error: {
            code: 'settings-rejected',
            message: 'think-box settings could not be saved to the profile',
            details: { ns: THINK_BOX_SETTINGS_NS },
          },
        }
      }
      // The Loader commits volatile config as part of the reconcile above; the
      // local write keeps the RPC response consistent even on kernels whose
      // reconcile returns before the reference update lands.
      writeSettingsRefs(config, merged.settings)
      return { ok: true, value: view() }
    }
    return { ok: false, error: { code: 'internal', message: `unknown think-box endpoint ${JSON.stringify(endpoint)}`, details: {} } }
  }

  // Mount the card channel on whichever fiber can own it: the Connection
  // service path when that service is injectable, otherwise the web server's
  // direct route (registerSettingsChannel serves the same envelopes and keeps
  // the loopback-only policy). Mounting is unconditional: the card must not
  // disappear because no settings namespace exists any more.
  let mounted = false
  const mountChannel = (mountCtx: Context): void => {
    if (mounted) return
    // A fiber that can see `connection` but not `webServer` (the usual
    // 0.2.x split) throws out of the registration attempt. Only a successful
    // mount may claim the slot: otherwise the other inject fiber - the one
    // that can actually reach the web server - would be skipped and the card
    // would stay unreachable for the whole session.
    let dispose: () => void
    try {
      dispose = registerSettingsChannel(mountCtx, THINK_BOX_SETTINGS_RPC_CHANNEL, handle)
    } catch (error) {
      console.warn('[dsh-think-box] settings channel could not mount on this fiber; trying another', error)
      return
    }
    mounted = true
    mountCtx.effect(() => () => {
      mounted = false
      dispose()
    }, 'dsh-think-box: settings channel lifetime')
  }
  ctx.inject(['connection'], mountChannel)
  ctx.inject(['webServer'], mountChannel)
}
