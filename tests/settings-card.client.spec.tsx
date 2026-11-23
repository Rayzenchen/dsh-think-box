/** The browser half uses the plugin-owned RPC instead of core settings.describe. */

import { useSyncExternalStore } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { SmoothStreamCard, type SmoothStreamCardProps } from '../src/client/SmoothStreamCard.tsx'
import type { SmoothStreamCardFace } from '../src/client/smooth-stream-card-controller.ts'
import { en } from '../src/client/locales.ts'
import {
  STREAM_SETTINGS_RPC,
  STREAM_SETTINGS_RPC_CHANNEL,
  type StreamSettingsView,
} from '../src/settings-api.ts'
import { TRANSLATION_RPC, TRANSLATION_RPC_CHANNEL } from '../src/translation-protocol.ts'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from '../src/config.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const readyView: StreamSettingsView = {
  writable: true,
  enabled: true,
  thinkAutoExpand: true,
}

interface BenchOptions {
  view?: StreamSettingsView
  readValue?: unknown
  failRead?: boolean
  readGate?: Promise<void>
  writeGate?: Promise<void>
  failWrite?: boolean
  translation?: Partial<TranslationConfig>
  failTranslationRead?: boolean
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

/** Compose only the optional browser services used by the configuration card. */
async function bench(options: BenchOptions = {}): Promise<{
  ctx: Context
  slots: SlotRegistry
  call: ReturnType<typeof vi.fn>
  view: () => StreamSettingsView
  setView: (next: StreamSettingsView) => void
  removeConnection: () => void
}> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)

  let view = options.view ?? readyView
  let translation: TranslationConfig = {
    ...DEFAULT_TRANSLATION_CONFIG,
    autoTranslate: false,
    ...options.translation,
  }
  const call = vi.fn(async (channel: string, endpoint: string, payload: unknown) => {
    if (channel === STREAM_SETTINGS_RPC_CHANNEL) {
      if (endpoint === STREAM_SETTINGS_RPC.read) {
        if (options.failRead === true) throw new Error('RPC unavailable')
        await options.readGate
        return { ok: true as const, value: options.readValue ?? view }
      }
      if (endpoint === STREAM_SETTINGS_RPC.write) {
        const settings = payload as { enabled?: unknown, thinkAutoExpand?: unknown }
        if (typeof settings.enabled !== 'boolean' || typeof settings.thinkAutoExpand !== 'boolean') {
          return { ok: false as const, error: { code: 'internal', message: 'bad payload' } }
        }
        if (options.failWrite === true) {
          return { ok: false as const, error: { code: 'settings-rejected', message: 'write failed' } }
        }
        await options.writeGate
        view = { ...view, enabled: settings.enabled, thinkAutoExpand: settings.thinkAutoExpand }
        return { ok: true as const, value: view }
      }
      return { ok: false as const, error: { code: 'internal', message: 'unknown endpoint' } }
    }
    if (channel === TRANSLATION_RPC_CHANNEL) {
      if (endpoint === TRANSLATION_RPC.settingsRead) {
        if (options.failTranslationRead === true) throw new Error('translation RPC unavailable')
        return { ok: true as const, value: translation }
      }
      if (endpoint === TRANSLATION_RPC.settingsWrite) {
        translation = { ...translation, ...(payload as Partial<TranslationConfig>) }
        return { ok: true as const, value: translation }
      }
    }
    return { ok: false as const, error: { code: 'internal', message: 'unexpected channel' } }
  })
  const removeConnection = ctx.provide('connection', { rpc: { call } } as never)
  return {
    ctx,
    slots: ctx.get('slots') as SlotRegistry,
    call,
    view: () => view,
    setView: (next) => { view = next },
    removeConnection,
  }
}

function declareCardSlot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: {
      'plugins.bundle.config': { kind: 'keyed', scope: 'root' },
      'conversation.chat.node': { kind: 'keyed', scope: 'session' },
    },
  } as never, () => null)
}

function cardFace(slots: SlotRegistry): SmoothStreamCardFace {
  const entry = slots.entries('plugins.bundle.config' as never)
    .find(item => item.options.key === '@local/dsh-think-box')
  if (entry === undefined) throw new Error('settings card was not registered')
  return (entry.inject as unknown as () => SmoothStreamCardFace)()
}

const cardTitle = new RegExp(en.title, 'i')

function cardProps(face: SmoothStreamCardFace): SmoothStreamCardProps {
  return {
    ...face,
    t: (key: keyof typeof en) => en[key],
    // The real slot helpers are React hook adapters; mirror them with
    // useSyncExternalStore so edits re-render the card.
    useSmoothStreamCard: (selector: (state: ReturnType<typeof face.hooks.smoothStreamCard.getSnapshot>) => unknown) => (
      selector(useSyncExternalStore(
        face.hooks.smoothStreamCard.subscribe,
        face.hooks.smoothStreamCard.getSnapshot,
        face.hooks.smoothStreamCard.getSnapshot,
      ))
    ),
    useTranslationCard: (selector: (state: ReturnType<typeof face.hooks.translationCard.getSnapshot>) => unknown) => (
      selector(useSyncExternalStore(
        face.hooks.translationCard.subscribe,
        face.hooks.translationCard.getSnapshot,
        face.hooks.translationCard.getSnapshot,
      ))
    ),
  } as unknown as SmoothStreamCardProps
}

async function renderCard(options: BenchOptions = {}): Promise<{
  face: SmoothStreamCardFace
  view: () => StreamSettingsView
  screen: ReturnType<typeof render>
  bench: Awaited<ReturnType<typeof bench>>
}> {
  const harness = await bench(options)
  declareCardSlot(harness.slots)
  const fiber = harness.ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const face = cardFace(harness.slots)
  await waitFor(() => expect(face.hooks.smoothStreamCard.getSnapshot().status)
    .toBe(options.failRead === true ? 'unavailable' : 'ready'))
  const view = render(<SmoothStreamCard {...cardProps(face)} />)
  fireEvent.click(view.getByRole('button', { name: cardTitle }))
  return { face, view: harness.view, screen: view, bench: harness }
}

describe('reasoning settings card', () => {
  it('renders the three sections and no removed controls', async () => {
    const { screen } = await renderCard()
    expect(screen.getByText(en.enabled)).toBeTruthy()
    expect(screen.getByText(en.thinkAutoExpand)).toBeTruthy()
    expect(screen.getByText(en.translationTitle)).toBeTruthy()
    // Version, update, presets, scroll/fade and diagnostics are gone.
    expect(screen.queryByText(/preset|silky|realtime/i)).toBeNull()
    expect(screen.queryByText(en.translationBackend)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /update/i })).toBeNull()
  })

  it('stages the enable switch and writes both preferences', async () => {
    const { face, screen, bench } = await renderCard()
    const enable = screen.getByRole('checkbox', { name: new RegExp(en.enabled) }) as HTMLInputElement
    fireEvent.click(enable)
    expect(face.hooks.smoothStreamCard.getSnapshot().enabled).toBe(false)
    // The first Save belongs to the base preferences; the translation channel
    // renders its own Save after it.
    fireEvent.click(screen.getAllByRole('button', { name: en.save })[0] as HTMLElement)
    await waitFor(() => expect(bench.call).toHaveBeenCalledWith(
      STREAM_SETTINGS_RPC_CHANNEL,
      STREAM_SETTINGS_RPC.write,
      { enabled: false, thinkAutoExpand: true },
    ))
    await waitFor(() => expect(face.hooks.smoothStreamCard.getSnapshot().dirty).toBe(false))
  })

  it('disables auto-follow while the master switch is off', async () => {
    const { face, screen } = await renderCard({ view: { ...readyView, enabled: false } })
    const follow = screen.getByRole('checkbox', { name: new RegExp(en.thinkAutoExpand) }) as HTMLInputElement
    expect(follow.disabled).toBe(true)
    expect(face.hooks.smoothStreamCard.getSnapshot().thinkAutoExpand).toBe(true)
  })

  it('reports a read-only deployment and blocks edits', async () => {
    const { screen } = await renderCard({ view: { ...readyView, writable: false } })
    expect(screen.getByText(en.readOnly)).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: new RegExp(en.enabled) }) as HTMLInputElement).disabled).toBe(true)
  })

  it('shows an unavailable card and retries the read', async () => {
    const { face, screen, bench } = await renderCard({ failRead: true })
    expect(face.hooks.smoothStreamCard.getSnapshot().status).toBe('unavailable')
    expect(screen.getByText(en.unavailable)).toBeTruthy()
    bench.call.mockClear()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    // The read is retried; this fake still fails it, so the card stays in its
    // unavailable state rather than pretending the deployment recovered.
    await waitFor(() => expect(bench.call).toHaveBeenCalledWith(STREAM_SETTINGS_RPC_CHANNEL, STREAM_SETTINGS_RPC.read, {}))
  })

  it('keeps the staged value and reports a failed save', async () => {
    const { face, screen } = await renderCard({ failWrite: true })
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(en.enabled) }))
    fireEvent.click(screen.getAllByRole('button', { name: en.save })[0] as HTMLElement)
    await waitFor(() => expect(face.hooks.smoothStreamCard.getSnapshot().failed).toBe(true))
    expect(face.hooks.smoothStreamCard.getSnapshot().enabled).toBe(false)
    expect(screen.getByText(en.saveFailed)).toBeTruthy()
  })

  it('edits and saves the translation channel', async () => {
    const { face, screen, bench } = await renderCard()
    await waitFor(() => expect(face.hooks.translationCard.getSnapshot().status).toBe('ready'))
    const auto = screen.getByRole('checkbox', { name: new RegExp(en.translationAutoTranslate) }) as HTMLInputElement
    expect(auto.checked).toBe(false)
    fireEvent.click(auto)
    const saves = screen.getAllByRole('button', { name: en.save })
    fireEvent.click(saves[saves.length - 1] as HTMLElement)
    // The translation bridge forwards its AbortSignal as the fourth argument.
    await waitFor(() => expect(bench.call).toHaveBeenCalledWith(
      TRANSLATION_RPC_CHANNEL,
      TRANSLATION_RPC.settingsWrite,
      expect.objectContaining({ autoTranslate: true }),
      undefined,
    ))
  })

  it('returns the assistant row to Harness once the saved switch is off', async () => {
    function BuiltIn(): null { return null }
    const harness = await bench({ view: { ...readyView, enabled: false } })
    declareCardSlot(harness.slots)
    const builtin = harness.slots.register({
      name: 'conversation.chat.node',
      key: 'assistant-step',
    } as never, BuiltIn as never)
    const fiber = harness.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await waitFor(() => {
      const entry = harness.slots.entries('conversation.chat.node')
        .find(item => item.options.key === 'assistant-step')
      expect(entry?.component).toBe(BuiltIn)
    })
    builtin()
  })

  it('does not take the row over before the saved setting resolves', async () => {
    function BuiltIn(): null { return null }
    const gate = deferred()
    const harness = await bench({ readGate: gate.promise })
    declareCardSlot(harness.slots)
    harness.slots.register({
      name: 'conversation.chat.node',
      key: 'assistant-step',
    } as never, BuiltIn as never)
    const fiber = harness.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = harness.slots.entries('conversation.chat.node')
      .find(item => item.options.key === 'assistant-step')
    expect(entry?.component).toBe(BuiltIn)
    gate.resolve()
    await waitFor(() => {
      const current = harness.slots.entries('conversation.chat.node')
        .find(item => item.options.key === 'assistant-step')
      expect(current?.component).not.toBe(BuiltIn)
    })
  })

  it('ignores core settings describe and stays on the plugin RPC', async () => {
    const { screen } = await renderCard()
    expect(screen.getByText(en.enabledHint)).toBeTruthy()
    // No version/installation copy can appear without the removed view fields.
    expect(screen.container.textContent).not.toContain('0.1.0')
  })
})
