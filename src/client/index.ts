import { createElement, useSyncExternalStore, type ComponentType } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the connection Context merge and the legacy settings section's
// SlotMap entry ('settings.plugin.item'). The 0.2.1+ Plugins page slot
// ('plugins.bundle.config') has no type package in the pinned dev deps; its
// registration is narrowed with a cast below.
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { claimApplyOwnership, type StandDown } from './applyOwnership.ts'
import { TypewriterAssistantNodeView } from './TypewriterAssistantNodeView.tsx'
import { SmoothStreamConfigPage } from './SmoothStreamCard.tsx'
import { SmoothStreamCardController } from './smooth-stream-card-controller.ts'
import { createSmoothStreamSettingsApi } from './smooth-stream-settings-api.ts'
import {
  createReasoningTranslationFace,
  type CotTranslationRemote,
} from './reasoningTranslation.ts'
import { createHostTranslationFace } from './host-translation.ts'
import { createTranslationSettingsApi, type TranslationSettingsApi } from './translation-settings-api.ts'
import { TranslationRuntime } from './translation-runtime.ts'
import type { TranslationCardBridge } from './smooth-stream-card-controller.ts'
import { NS as SETTINGS_NS, CHAT_NS, en, zh, chatEn, chatZh } from './locales.ts'
import {
  DEFAULT_STREAM_CONFIG,
  STREAM_BOOT_GLOBAL,
  type StreamConfig,
  type TranslationConfig,
} from '../config.ts'
import { DEFAULT_STREAM_SETTINGS, type StreamSettings } from '../settings.ts'

/**
 * Cordis services required by the browser half. Only `slots` is load-bearing
 * for the stream itself; locale and Connection power the configuration card
 * and are wired through `ctx.inject` below so a deployment without them still
 * streams with defaults.
 */
export const inject = ['slots']

type AssistantProps = ChatNodeViewProps<'assistant-step'>

/**
 * Preference keys the older Host build may have carried instead of the current
 * snapshot. Their presence alone is a real disagreement only when the two
 * remaining booleans are malformed; extra legacy fields are ignored.
 */
const BOOT_SETTING_KEYS = ['enabled', 'thinkAutoExpand'] as const

/** Whether any preference field is present in a boot global value. */
function hasPreferenceFields(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false
  return BOOT_SETTING_KEYS.some(key => key in raw)
}

/** React function/class or an exotic component such as memo/forwardRef/lazy. */
function isWrappableComponent(value: unknown): value is ComponentType<AssistantProps> {
  return typeof value === 'function'
    || (value !== null && typeof value === 'object' && '$$typeof' in value)
}

/**
 * Read the Host-bridged boot config. The inline script is produced by this
 * plugin's Host half from a schema-validated value, so only the structural
 * guarantees that could break between the two halves are re-checked: the
 * global is absent when the client runs without its Host entry (defaults
 * apply), and a malformed preference fails loudly instead of rendering a
 * half-configured view.
 *
 * Extra keys are ignored: during the build window the running Host can still
 * serve its previous boot HTML (old engine fields) while the new client bundle
 * is already on disk. Missing preferences fall back to defaults with an info
 * line; a present-but-broken preference is a hard error.
 * @returns The resolved configuration for the assistant node view.
 */
function readBootConfig(): StreamConfig {
  const raw = (globalThis as Record<string, unknown>)[STREAM_BOOT_GLOBAL]
  if (raw === undefined) {
    console.info('[dsh-smooth-stream] no host config bridge; using defaults')
    return DEFAULT_STREAM_CONFIG
  }
  const malformed = (): Error =>
    new Error(`[dsh-smooth-stream] malformed ${STREAM_BOOT_GLOBAL} boot global: ${JSON.stringify(raw)}`)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw malformed()
  const snapshot = readSettingsSnapshot(raw)
  if (snapshot === undefined && hasPreferenceFields(raw)) throw malformed()
  if (snapshot === undefined) {
    console.info(
      `[dsh-smooth-stream] ${STREAM_BOOT_GLOBAL} predates the preference snapshot; using defaults`,
    )
    return DEFAULT_STREAM_CONFIG
  }
  return {
    enabled: snapshot.enabled,
    thinkAutoExpand: snapshot.thinkAutoExpand,
    translation: readTranslationConfig((raw as { translation?: unknown }).translation),
  }
}

/**
 * Validate the two preference fields the Host folds into the boot global. The
 * Host reads both volatile references before injecting the script, so these are
 * plain values here; malformed values mean the two halves disagree.
 * @param raw - boot global value.
 * @returns the validated preferences, or `undefined` when malformed.
 */
function readSettingsSnapshot(raw: unknown): StreamSettings | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>
  if (typeof value.enabled !== 'boolean' || typeof value.thinkAutoExpand !== 'boolean') return undefined
  return { enabled: value.enabled, thinkAutoExpand: value.thinkAutoExpand }
}

/**
 * Validate the optional translation block of the boot config. A Host older
 * than the LLM bridge omits it, which falls back to the official bundle.
 * @param raw - serialized translation config from the boot global.
 * @returns the validated translation config.
 */
function readTranslationConfig(raw: unknown): TranslationConfig {
  if (raw === undefined) return DEFAULT_STREAM_CONFIG.translation
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`[dsh-smooth-stream] malformed translation boot config: ${JSON.stringify(raw)}`)
  }
  const value = raw as Record<string, unknown>
  if (
    value.backend !== 'bundle' && value.backend !== 'llm'
    || typeof value.provider !== 'string' || value.provider === ''
    || typeof value.model !== 'string' || value.model === ''
    || value.reasoningEffort !== undefined && typeof value.reasoningEffort !== 'string'
    || typeof value.targetLanguage !== 'string' || value.targetLanguage === ''
    || typeof value.maxTextChars !== 'number' || !Number.isInteger(value.maxTextChars) || value.maxTextChars < 2
    || typeof value.maxTokens !== 'number' || !Number.isInteger(value.maxTokens) || value.maxTokens < 1
    || typeof value.timeoutMs !== 'number' || value.timeoutMs < 1
    || value.autoTranslate !== undefined && typeof value.autoTranslate !== 'boolean'
  ) {
    throw new Error(`[dsh-smooth-stream] malformed translation boot config: ${JSON.stringify(raw)}`)
  }
  return {
    backend: value.backend,
    provider: value.provider,
    model: value.model,
    reasoningEffort: typeof value.reasoningEffort === 'string' && value.reasoningEffort !== ''
      ? value.reasoningEffort
      : DEFAULT_STREAM_CONFIG.translation.reasoningEffort,
    targetLanguage: value.targetLanguage,
    maxTextChars: value.maxTextChars,
    maxTokens: value.maxTokens,
    timeoutMs: value.timeoutMs,
    autoTranslate: typeof value.autoTranslate === 'boolean'
      ? value.autoTranslate
      : DEFAULT_STREAM_CONFIG.translation.autoTranslate,
  }
}

/**
 * A live settings cell shared by the renderer lifecycle and React views. It
 * starts on the Host's boot snapshot (the resolved profile config read through
 * the volatile references at Host apply time) and follows the plugin-owned
 * controller once the optional settings services arrive. Without a Host bridge
 * the shared defaults apply.
 */
class SettingsCell {
  private readonly listeners = new Set<() => void>()
  private card: SmoothStreamCardController | undefined
  private value: StreamSettings
  private pending = false

  /** @param initial - boot-time snapshot to render before the card resolves. */
  constructor(initial: StreamSettings = DEFAULT_STREAM_SETTINGS) {
    this.value = initial
  }

  /** Re-point the cell at the plugin-owned settings controller. */
  attach(card: SmoothStreamCardController): () => void {
    this.card = card
    this.refresh()
    const unsubscribe = card.subscribe(() => { this.refresh() })
    return () => {
      unsubscribe()
      if (this.card !== card) return
      this.card = undefined
      this.refresh()
    }
  }

  private read(): StreamSettings {
    const snapshot = this.card?.getSnapshot()
    if (snapshot === undefined || snapshot.status !== 'ready') return this.value
    return this.card?.values() ?? this.value
  }

  private refresh(): void {
    const next = this.read()
    const pending = this.card?.getSnapshot().status === 'loading'
    if (
      pending === this.pending
      && next.enabled === this.value.enabled
      && next.thinkAutoExpand === this.value.thinkAutoExpand
    ) return
    this.pending = pending
    this.value = next
    for (const listener of this.listeners) listener()
  }

  /** False while an available settings service is resolving its authority. */
  takeoverEnabled(): boolean {
    return !this.pending && this.value.enabled
  }

  /**
   * True only once an attached settings service has produced its loaded values.
   * Until then — and when no settings service is composed at all — `value` is
   * still the shared client default, so callers that must not let that default
   * shadow the install-time config have to ask before trusting it.
   */
  ready(): boolean {
    return this.card?.getSnapshot().status === 'ready'
  }

  readonly getSnapshot = (): StreamSettings => this.value

  readonly subscribe = (listener: () => void): () => void => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}


/**
 * Register the typewriter renderer after the conversation package declares the
 * keyed Chat node seat. A lower priority shadows the built-in assistant row;
 * every other keyed renderer is wrapped in place so Context, commands, Tool
 * cards, retries, and workflow runs share one extensible follow boundary. The
 * Host-bridged configuration
 * no longer selects engine knobs: the reasoning box ships one cadence. The
 * plugin-owned settings RPC supplies the live enable/auto-follow preferences
 * when the settings surface is composed.
 * @param ctx - Browser context carrying the shared slot registry.
 */
export function apply(ctx: ClientContext): void {
  // Everything this instance installs, released in reverse order when a newer
  // instance takes over. Collected lazily: ownership has to be claimed before
  // the first registration, but the teardown only exists once they have run.
  const disposers: StandDown[] = []
  const keep = (value: unknown): void => {
    if (typeof value === 'function') {
      disposers.push(value as StandDown)
      return
    }
    // Cordis hands back a Fiber in some versions; accept either shape so the
    // stand-down never silently degrades into "nothing to release".
    const disposable = value as { dispose?: unknown } | null
    if (disposable !== null && typeof disposable?.dispose === 'function') {
      disposers.push(() => { (disposable as { dispose: () => void }).dispose() })
    }
  }
  const releaseOwnership = claimApplyOwnership(() => {
    for (const dispose of [...disposers].reverse()) dispose()
  })
  const config = readBootConfig()
  // First render uses the Host's resolved snapshot; the card RPC then supplies
  // live values and edits.
  const settings = new SettingsCell(readSettingsSnapshot(config) ?? DEFAULT_STREAM_SETTINGS)
  const translation = new TranslationRuntime(config.translation)
  let translationSettingsApi: TranslationSettingsApi | undefined
  const waitTranslationApi = async (): Promise<TranslationSettingsApi> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (translationSettingsApi !== undefined) return translationSettingsApi
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('translation settings are not connected')
  }
  // Translation backends. `llm` talks to this plugin's Host bridge, which
  // forwards to any registered Harness route; `bundle` uses the official
  // reasoning-translation bundle's Host Remote. Both faces stay attached, and
  // the runtime picks one from the settings the Host store reports - so a
  // backend change saved on the Plugins page reaches open rows without a
  // reload, and a page that loaded before the boot injection was ready still
  // converges once the settings read completes.
  keep(ctx.inject(['connection', 'locale'], (hostCtx) => {
    const connection = hostCtx.get('connection') as unknown as ConnectionHandle
    const settingsApi = createTranslationSettingsApi(connection)
    translationSettingsApi = settingsApi
    translation.setHostFace(createHostTranslationFace(
      connection,
      () => String(hostCtx.locale.getLocale().active),
    ))
    translation.start(settingsApi)
    return () => {
      translation.stop()
      translation.setHostFace(undefined)
      translationSettingsApi = undefined
    }
  }))
  keep(ctx.inject(['remote.cotTranslation', 'locale'], (cotCtx) => {
    // Read the flat `remote.cotTranslation` service through the untyped `get`
    // overload: the generated service name is outside this package's pinned
    // `Context` surface.
    const remote = cotCtx.get('remote.cotTranslation') as CotTranslationRemote | undefined
    if (remote === undefined) return
    translation.setBundleFace(createReasoningTranslationFace(
      remote,
      () => String(cotCtx.locale.getLocale().active),
    ))
    return () => { translation.setBundleFace(undefined) }
  }))

  /**
   * Layered `t` for the assistant renderer.
   *
   * The renderer's keys have no single owner: `conversation` owns the
   * `image.*` family in every Harness version, `chat` (0.1.5+) owns
   * `message.think`, and three `message.*` keys MOVED from `conversation` to
   * `chat` between the version this package pins and the current one. Binding
   * the slot to either namespace alone degrades a real slice of the UI to raw
   * keys, which is the defect this replaces.
   *
   * The order is deliberate: `conversation` first, so the pinned Harness keeps
   * resolving the keys it still owns there; then `chat` for what moved or is
   * new; then this plugin's own namespace for keys no Harness version
   * provides. A namespace that is not registered returns its key unchanged
   * (`LocaleRuntime.bind` does not throw), so an older Harness without `chat`
   * falls straight through.
   *
   * The reference is built once and held stable: the seat feeds a memoized
   * renderer, and a fresh identity per render would defeat that memoization.
   * Until the locale service arrives the seat's own binding stays in use.
   */
  let assistantT: AssistantProps['t'] | undefined

  // Locale routing belongs to the renderer lifecycle, not to the optional
  // Connection-backed settings card. Keeping this injection independent means
  // a deployment can stream localized replies without Connection, and a
  // transient disconnect cannot dispose the renderer's fallback dictionary.
  keep(ctx.inject(['locale'], (localeCtx) => {
    localeCtx.effect(
      () => localeCtx.locale.register(CHAT_NS, { zh: chatZh, en: chatEn }),
      'dsh-smooth-stream: conversation fallback dictionary',
    )
    const conversationT = localeCtx.locale.bind('conversation')
    const chatT = localeCtx.locale.bind('chat') as (key: string, params?: Record<string, unknown>) => string
    const fallbackT = localeCtx.locale.bind(CHAT_NS) as (key: string, params?: Record<string, unknown>) => string
    const merged = (key: string, params?: Record<string, unknown>): string => {
      const primary = (conversationT as (k: string, p?: unknown) => string)(key, params)
      if (primary !== key) return primary
      const secondary = chatT(key, params)
      if (secondary !== key) return secondary
      return fallbackT(key, params)
    }
    const bound = merged as unknown as AssistantProps['t']
    assistantT = bound
    return () => {
      if (assistantT === bound) assistantT = undefined
    }
  }))

  // The card talks to the plugin-owned loopback RPC, so the core settings
  // namespace allowlist cannot make it disappear. The stream still applies
  // with defaults when the optional Settings UI or Connection is absent.
  keep(ctx.inject(['slots', 'locale', 'connection'], (settingsCtx) => {
    const translationBridge: TranslationCardBridge = {
      initial: translation.getSnapshot().settings,
      read: async (signal?: AbortSignal) => await (await waitTranslationApi()).read(signal),
      write: async (patch) => {
        const next = await (await waitTranslationApi()).write(patch)
        translation.apply(next)
        return next
      },
      apply: (settings) => { translation.apply(settings) },
    }
    const card = new SmoothStreamCardController(
      // The shared Context augmentation also carries the Host-side Connection
      // shape. This browser entry runs after the client provider installs its
      // handle, so narrow through unknown to its client contract here.
      createSmoothStreamSettingsApi(settingsCtx.get('connection') as unknown as ConnectionHandle),
      translationBridge,
    )
    const detachSettings = settings.attach(card)
    card.start()
    settingsCtx.effect(() => settingsCtx.locale.register(SETTINGS_NS, { zh, en }), 'dsh-smooth-stream: settings dictionaries')
    // Configuration page, 0.2.1+: plugin configuration moved out of Settings
    // onto the sidebar Plugins page. A bundle registers `plugins.bundle.config`
    // keyed by its package name, and the page renders the entry between the
    // bundle description and its rows (`view: 'page'`). Both the slot name and
    // the entry are narrowed with casts because the pinned type packages
    // predate the slot this generation added.
    settingsCtx.slots.inject('plugins.bundle.config' as never, () => settingsCtx.slots.register({
      name: 'plugins.bundle.config',
      key: '@local/dsh-think-box',
      locale: SETTINGS_NS,
      inject: () => card.inject(),
    } as never, SmoothStreamConfigPage as never))
    return () => {
      card.stop()
      detachSettings()
    }
  }))


  const configured = function StreamConfiguredView(props: AssistantProps) {
    const preferences = useSyncExternalStore(
      settings.subscribe,
      settings.getSnapshot,
      settings.getSnapshot,
    )
    const translationSnapshot = useSyncExternalStore(
      translation.subscribe,
      translation.getSnapshot,
      translation.getSnapshot,
    )
    return createElement(TypewriterAssistantNodeView, {
      ...props,
      // Override the seat's single-namespace binding with the layered lookup
      // described above. Falls back to the seat's own binding only if the
      // locale service never arrived (renderer then receives the prop it
      // already had).
      ...(assistantT === undefined ? {} : { t: assistantT }),
      // The body is rendered by the Harness primitives now; only the reasoning
      // box keeps a live preference (whether it follows its own stream).
      thinkAutoExpand: preferences.thinkAutoExpand,
      translation: translationSnapshot.face,
      translationLabel: translationSnapshot.label,
      autoTranslate: translationSnapshot.settings.autoTranslate,
    })
  }
  keep(ctx.slots.inject('conversation.chat.node', () => {
    // dsh 0.2.x renders every keyed `conversation.chat.node` entry as its own
    // seat, so a lower-priority registration no longer shadows the built-in
    // assistant row - the same assistant step would then render twice. Swap the
    // built-in entry's component in place instead; that keeps its children,
    // locale, and inject seats. Only the assistant step needs replacing: the
    // reasoning box rides on that row, and no other chat row is touched.
    let taken: { entry: { component: unknown }; original: unknown } | undefined
    let releaseFallback: (() => void) | undefined
    // Slot registration emits `slots/changed` synchronously from inside the
    // registration itself. Without this guard the handler re-enters while the
    // first call is still between "decide to register" and "remember the
    // disposer", and the fallback gets registered twice (SlotCore rejects the
    // duplicate at the same priority).
    let syncing = false

    const findBuiltin = (): { component: unknown } | undefined => ctx.slots.entries('conversation.chat.node').find(
      entry => entry.options.key === 'assistant-step'
        // The pinned SlotOptions type predates `registrant`; every current
        // runtime carries it (see the register spread in the slots package).
        && (entry.options as { registrant?: string }).registrant !== 'dsh-smooth-stream'
        && entry.component !== configured,
    )

    const entryPresent = (entry: { component: unknown }): boolean =>
      (ctx.slots.entries('conversation.chat.node') as unknown[]).includes(entry)

    /**
     * Drop whatever takeover this instance owns.
     * @param restore - put the built-in component back when this instance still
     * owns the entry; a component installed by someone else is never clobbered.
     */
    const release = (restore: boolean): void => {
      if (releaseFallback !== undefined) {
        releaseFallback()
        releaseFallback = undefined
      }
      if (taken !== undefined) {
        if (restore && taken.entry.component === configured) taken.entry.component = taken.original
        taken = undefined
      }
    }

    const takeOver = (): void => {
      const builtin = findBuiltin()
      if (builtin !== undefined && isWrappableComponent(builtin.component)) {
        taken = { entry: builtin, original: builtin.component }
        builtin.component = configured as never
        return
      }
      // Shadow registration survives only as the fallback for compositions
      // that declare no built-in assistant row to swap.
      releaseFallback = ctx.slots.register({
        name: 'conversation.chat.node',
        key: 'assistant-step',
        priority: -100,
        // `conversation` (not `chat`): it is the namespace the pinned Harness
        // actually registers, so it is the one whose keys must keep resolving.
        // The layered `t` handed to the renderer covers what this namespace
        // does not own. A namespace the composition does not declare would
        // degrade every `t()` call to its raw key.
        locale: 'conversation',
        registrant: 'dsh-smooth-stream',
      }, configured as never)
    }

    const syncTakeover = (): void => {
      if (syncing) return
      syncing = true
      try {
        syncTakeoverUnsafe()
      } finally {
        syncing = false
      }
    }

    const syncTakeoverUnsafe = (): void => {
      if (!settings.takeoverEnabled()) {
        release(true)
        return
      }
      if (taken !== undefined) {
        // Keep the swap while this instance still owns the live entry. A slot
        // re-registration in the same tick detaches the old entry; release it
        // without restoring (the new entry never held our component) and take
        // the fresh built-in row instead.
        if (entryPresent(taken.entry) && taken.entry.component === configured) return
        release(false)
      } else if (releaseFallback !== undefined) {
        // Fallback is live: migrate to the in-place swap as soon as the
        // built-in assistant row appears, so 0.2.x never renders it twice.
        if (findBuiltin() === undefined) return
        release(false)
      }
      takeOver()
    }

    const offSlotChange = ctx.on('slots/changed', (key: string) => {
      if (key !== 'conversation.chat.node') return
      syncTakeover()
    })
    const unsubscribe = settings.subscribe(syncTakeover)
    syncTakeover()
    return () => {
      unsubscribe()
      offSlotChange()
      // Dispose must restore the built-in row even though no slot change
      // follows: leaving `entry.component` pointing at the dead instance made
      // the row render nothing after a plugin reload.
      release(true)
    }
  }))

  // Wind-down hook: a later instance clears the slot itself when it takes over,
  // so this only has to cover this instance being disposed on its own.
  ctx.effect(() => releaseOwnership, 'dsh-smooth-stream: client apply ownership')
}
