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
import { wrapFollowNodeView, type FollowWrapProps } from './TypewriterToolNodeView.tsx'
import { SmoothStreamCard, SmoothStreamConfigPage } from './SmoothStreamCard.tsx'
import { SmoothStreamCardController } from './smooth-stream-card-controller.ts'
import { createSmoothStreamSettingsApi } from './smooth-stream-settings-api.ts'
import { DebugPanel } from './DebugPanel.tsx'
import { debugRuntime } from './debugRuntime.ts'
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
import { DEFAULT_STREAM_SETTINGS, STREAM_SETTINGS_NS, type StreamSettings } from '../settings.ts'

/**
 * Cordis services required by the browser half. Only `slots` is load-bearing
 * for the stream itself; locale and Connection power the configuration card
 * and are wired through `ctx.inject` below so a deployment without them still
 * streams with defaults.
 */
export const inject = ['slots']

type AssistantProps = ChatNodeViewProps<'assistant-step'>

const STREAM_MODES: readonly string[] = ['typewriter', 'teleprompter']
const STREAM_PRESETS: readonly string[] = ['realtime', 'balanced', 'silky']

/**
 * The assistant renderer owns its own character queue and conversation
 * follower, so wrapping it again would create two scroll owners. Human input
 * stays immediate; every Agent-owned output renderer goes through the same
 * generic follow boundary. This is deliberately keyed by the owner that
 * provides the renderer, not by individual tool names, so new Context,
 * Command, and Tool rows are covered automatically.
 *
 * Host chrome and controllers are excluded on a different rule: `turn-process`
 * (the completed-turn process summary control) and `turn-tail` (the turn usage
 * footer) are not Agent output. The Host renders them as bare controls and
 * flips their visibility itself, so wrapping them has three measured costs and
 * no benefit:
 *
 * 1. The wrapper element defeats ChatView's `.flowItem:empty { display: none }`
 *    rule. A `turn-process` renderer returns null whenever the Host's fold is
 *    unavailable (e.g. `processWindowReady === false`), and that null render is
 *    exactly what the `:empty` rule exists to erase; with a wrapper the row
 *    stays in flow and still consumes the 16px column gap, painting an empty
 *    band where the fold control should be.
 * 2. The summary label (`N tool calls · M messages`) is not streamed model
 *    text, so pushing it through the character-reveal engine is wrong by
 *    construction.
 * 3. The row would inherit the generic entrance animation (opacity + clip-path)
 *    on a row the Host may mount and hide inside a single commit.
 */
const SKIP_WRAP = new Set([
  'assistant-step',
  'user',
  'steering',
  'command-input',
  'turn-process',
  'turn-tail',
  'tool-call',
])

/** React function/class or an exotic component such as memo/forwardRef/lazy. */
function isWrappableComponent(value: unknown): value is ComponentType<FollowWrapProps> {
  return typeof value === 'function'
    || (value !== null && typeof value === 'object' && '$$typeof' in value)
}

/**
 * Read the Host-bridged boot config. The inline script is produced by this
 * plugin's Host half from a schema-validated value, so only the structural
 * guarantees that could break between the two halves are re-checked: the
 * global is absent when the client runs without its Host entry (defaults
 * apply), and any present-but-malformed value fails loudly instead of
 * rendering a half-configured view.
 * @returns The resolved configuration for the assistant node view.
 */
function readBootConfig(): StreamConfig {
  const raw = (globalThis as Record<string, unknown>)[STREAM_BOOT_GLOBAL]
  if (raw === undefined) {
    console.info('[dsh-smooth-stream] no host config bridge; using defaults')
    return DEFAULT_STREAM_CONFIG
  }
  if (
    typeof raw !== 'object' || raw === null
    || !STREAM_MODES.includes((raw as StreamConfig).mode)
    || !STREAM_PRESETS.includes((raw as StreamConfig).preset)
    || typeof (raw as StreamConfig).revealCharsPerSec !== 'number'
    || typeof (raw as StreamConfig).scrollSpeedPxPerSec !== 'number'
    || typeof (raw as StreamConfig).maxScrollSpeedPxPerSec !== 'number'
  ) {
    throw new Error(`[dsh-smooth-stream] malformed ${STREAM_BOOT_GLOBAL} boot global: ${JSON.stringify(raw)}`)
  }
  return { ...raw as StreamConfig, translation: readTranslationConfig((raw as { translation?: unknown }).translation) }
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
 * Wrap every Agent-owned keyed Chat row except the assistant renderer in
 * place. A second
 * register with the same `children` table throws because the child slot is
 * already declared, and only the winning entry receives `renderSlot`;
 * swapping `entry.component` keeps the original children, locale, and inject
 * seats. `assistant-step` is replaced below so text and Think use the
 * typewriter reveal. The wrapper owns only the shared layout-growth/follow
 * lifecycle; the Harness keeps each renderer's controls, disclosures, and
 * cards intact.
 * @param ctx - Browser context carrying the slot registry.
 * @returns Restorer that puts the original components back.
 */
function wrapAgentChatRows(
  ctx: ClientContext,
  useControlScroll: () => boolean,
): () => void {
  const restores: Array<() => void> = []
  const wrapped = new WeakSet<object>()

  const wrapAll = (): void => {
    for (const entry of ctx.slots.entries('conversation.chat.node')) {
      const key = entry.options.key
      if (key === undefined || SKIP_WRAP.has(key)) continue
      const current = entry.component
      if (!isWrappableComponent(current) || wrapped.has(current)) continue
      const inner = current as ComponentType<FollowWrapProps>
      const next = wrapFollowNodeView(inner, useControlScroll)
      wrapped.add(next)
      entry.component = next
      restores.push(() => {
        if (entry.component === next) entry.component = inner
      })
    }
  }

  wrapAll()
  const off = ctx.on('slots/changed', (key: string) => {
    if (key === 'conversation.chat.node') wrapAll()
  })
  return () => {
    off()
    for (const restore of restores) restore()
  }
}

/**
 * A live settings cell shared by the renderer lifecycle and React views. It
 * starts on the shared defaults and follows the plugin-owned controller once
 * the optional settings services arrive.
 */
class SettingsCell {
  private readonly listeners = new Set<() => void>()
  private card: SmoothStreamCardController | undefined
  private value: StreamSettings = DEFAULT_STREAM_SETTINGS
  private pending = false

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
      && next.controlScroll === this.value.controlScroll
      && next.preset === this.value.preset
      && next.motionPreference === this.value.motionPreference
      && next.thinkAutoExpand === this.value.thinkAutoExpand
      && next.logarithmicFade === this.value.logarithmicFade
      && next.debugEnabled === this.value.debugEnabled
      && next.debugTuning === this.value.debugTuning
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
 * The optional reasoning-translation Remote shared by every think box.
 *
 * The bundled `@deepseek-ai/dsh-experimental-client-ui-cot-translation` client
 * mounts `remote.cotTranslation`; the takeover renderer never renders that
 * plugin's reasoning-body slot, so the toggle in the think box drives the same
 * Host Remote directly. The face stays undefined until the bundle's client
 * half is mounted and back to undefined when it unloads, which is what hides
 * the toggle again.
 */
/**
 * Register the typewriter renderer after the conversation package declares the
 * keyed Chat node seat. A lower priority shadows the built-in assistant row;
 * every other keyed renderer is wrapped in place so Context, commands, Tool
 * cards, retries, and workflow runs share one extensible follow boundary. The
 * Host-bridged configuration
 * selects the render direction, smoothing preset, and glide speed; the
 * plugin-owned settings RPC supplies the live auto-expand preference when the
 * settings surface is composed.
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
  const settings = new SettingsCell()
  const translation = new TranslationRuntime(config.translation)
  let translationSettingsApi: TranslationSettingsApi | undefined
  const waitTranslationApi = async (): Promise<TranslationSettingsApi> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (translationSettingsApi !== undefined) return translationSettingsApi
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('translation settings are not connected')
  }
  const useControlScroll = (): boolean => useSyncExternalStore(
    settings.subscribe,
    () => settings.getSnapshot().controlScroll,
    () => settings.getSnapshot().controlScroll,
  )

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
    const syncDebug = (): void => {
      const snapshot = card.getSnapshot()
      debugRuntime.syncSettings({
        available: snapshot.debugAvailable,
        enabled: snapshot.debugEnabled,
        writable: snapshot.writable && !snapshot.saving,
        dirty: snapshot.dirty,
        status: snapshot.status,
        tuning: snapshot.debugTuning,
      })
    }
    const detachBinding = debugRuntime.bindSettings({
      edit: patch => { card.inject().edit(patch) },
      save: () => { card.inject().save() },
      discard: () => { card.inject().discard() },
    })
    const detachDebug = card.subscribe(syncDebug)
    syncDebug()
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
    // Configuration card, up to 0.2.0: the Web Settings "plugin configuration"
    // page. Kept so the fork still renders on the Harness generation it was
    // forked from; the slot never appears on 0.2.1+, where `slots.inject`
    // simply waits forever.
    settingsCtx.slots.inject('settings.plugin.item', () => settingsCtx.slots.register({
      name: 'settings.plugin.item',
      id: 'smooth-stream',
      key: STREAM_SETTINGS_NS,
      order: 30,
      locale: SETTINGS_NS,
      inject: () => card.inject(),
    // Older Harness declares this slot as a list (`id`); newer Harness uses a
    // keyed slot filtered by the Host settings namespace (`key`).
    } as never, SmoothStreamCard))
    settingsCtx.slots.inject('conversation.session.header.utilities', () => settingsCtx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'smooth-stream-debug',
      order: 40,
      locale: SETTINGS_NS,
      inject: () => debugRuntime.panelFace(),
    }, DebugPanel))
    return () => {
      card.stop()
      detachDebug()
      detachSettings()
      detachBinding()
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
      mode: config.mode,
      // Loaded settings hold the resolved preset (user layer over the install
      // config), so they own the prop. Without them — no settings service, a
      // failed load, or the frames before the first read lands — the shared
      // client default is NOT an authority on the installed preset; the boot
      // config is.
      preset: settings.ready() ? preferences.preset ?? config.preset : config.preset,
      revealCharsPerSec: config.revealCharsPerSec,
      scrollSpeedPxPerSec: config.scrollSpeedPxPerSec,
      maxScrollSpeedPxPerSec: config.maxScrollSpeedPxPerSec,
      thinkAutoExpand: preferences.thinkAutoExpand,
      logarithmicFade: preferences.logarithmicFade,
      controlScroll: preferences.controlScroll,
      motionPreference: preferences.motionPreference,
      translation: translationSnapshot.face,
      translationLabel: translationSnapshot.label,
      autoTranslate: translationSnapshot.settings.autoTranslate,
    })
  }
  keep(ctx.slots.inject('conversation.chat.node', () => {
    let releaseTakeover: (() => void) | undefined
    let usedSwap = false

    const syncTakeover = (): void => {
      if (!settings.takeoverEnabled()) {
        releaseTakeover?.()
        releaseTakeover = undefined
        return
      }
      if (releaseTakeover !== undefined) return
      const unwrap = wrapAgentChatRows(ctx, useControlScroll)
      // dsh 0.2.x renders every keyed entry of `conversation.chat.node` as
      // its own seat, so a lower-priority registration no longer shadows the
      // built-in assistant row — the same assistant step then renders twice
      // (built-in + takeover), duplicating every reasoning block in the
      // transcript. Swap the built-in entry's component in place instead,
      // exactly like the other keyed rows below; this keeps the original
      // children, locale, and inject seats on every kernel generation. The
      // shadow registration survives only as a fallback for compositions
      // that declare no built-in assistant row to swap.
      const builtin = ctx.slots.entries('conversation.chat.node').find(
        entry => entry.options.key === 'assistant-step'
          // The pinned SlotOptions type predates `registrant`; every current
          // runtime carries it (see the register spread in the slots package).
          && (entry.options as { registrant?: string }).registrant !== 'dsh-smooth-stream'
          && entry.component !== configured,
      )
      let unshadow: () => void
      if (builtin !== undefined && isWrappableComponent(builtin.component)) {
        usedSwap = true
        const inner = builtin.component as ComponentType<FollowWrapProps>
        builtin.component = configured
        unshadow = () => {
          if (builtin.component === configured) builtin.component = inner
        }
      } else {
        unshadow = ctx.slots.register({
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
        }, configured)
      }
      releaseTakeover = () => {
        // Stop observing slot changes before the takeover is removed.
        unwrap()
        unshadow()
      }
    }

    // If the shadow fallback was taken because the built-in assistant row
    // had not registered yet, re-take through the in-place swap as soon as
    // it appears, so 0.2.x never renders the row twice.
    const offSlotChange = ctx.on('slots/changed', (key: string) => {
      if (key !== 'conversation.chat.node' || usedSwap || releaseTakeover === undefined) return
      if (!settings.takeoverEnabled()) return
      releaseTakeover()
      releaseTakeover = undefined
      syncTakeover()
    })

    const unsubscribe = settings.subscribe(syncTakeover)
    syncTakeover()
    return () => {
      unsubscribe()
      offSlotChange()
      releaseTakeover?.()
    }
  }))

  // Wind-down hook: a later instance clears the slot itself when it takes over,
  // so this only has to cover this instance being disposed on its own.
  ctx.effect(() => releaseOwnership, 'dsh-smooth-stream: client apply ownership')
}
