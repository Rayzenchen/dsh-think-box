/**
 * Reasoning-box regressions for the R1a split.
 *
 * The body reveal/follow engine is gone: the answer renders through the
 * Harness primitives, and only the Think box still owns an inline preview, a
 * click-to-open body, character reveal, fade and the settle flourish. The
 * takeover coverage pins the in-place `assistant-step` swap and its cleanup
 * (the two defects that survived the deleted generic wrapper).
 */

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { TypewriterAssistantNodeView } from '../src/client/TypewriterAssistantNodeView.tsx'
import { apply, inject } from '../src/client/index.ts'
import { DEFAULT_STREAM_CONFIG, STREAM_BOOT_GLOBAL } from '../src/config.ts'
import { chatZh } from '../src/client/locales.ts'
import { FrameCoordinator } from '../src/client/FrameCoordinator.ts'
import type { ReasoningTranslationFace } from '../src/client/reasoningTranslation.ts'

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] as const

afterEach(() => {
  cleanup()
  FrameCoordinator.forDocument(document).shutdown()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (globalThis as Record<string, unknown>)[STREAM_BOOT_GLOBAL]
})

function assistantProps(
  status: 'running' | 'settled',
  blocks: unknown[],
  extra: Record<string, unknown> = {},
): Parameters<typeof TypewriterAssistantNodeView>[0] {
  return {
    node: {
      kind: 'assistant-step',
      location: { kind: 'unresolved' },
      data: { status, blocks, turn: 1, step: 1, time: 0 },
    },
    useTurnData: () => undefined,
    openFile: () => {},
    fileMentions: () => undefined,
    t: (key: string) => (chatZh as Record<string, string>)[key] ?? key,
    ...extra,
  } as unknown as Parameters<typeof TypewriterAssistantNodeView>[0]
}

const REASONING = { kind: 'reasoning', text: 'first line\nlatest tokens' }

describe('reasoning box', () => {
  it('renders the inline preview while reasoning streams', () => {
    const view = render(createElement(TypewriterAssistantNodeView, assistantProps('running', [REASONING])))
    const row = view.container.querySelector('[data-disclosure-row]')
    expect(row).not.toBeNull()
    expect(row?.getAttribute('aria-expanded')).toBe('false')
    expect(view.container.querySelector('[data-variant="think"]')).not.toBeNull()
    // The inline box, not the disclosure body, carries the live text.
    expect(view.container.querySelector('[data-follow-end]')).not.toBeNull()
    expect(view.getByText(chatZh['message.think'])).toBeTruthy()
    expect(view.container.querySelector('details')).toBeNull()
  })

  it('opens the full reasoning body on a row click and closes it again', () => {
    const view = render(createElement(TypewriterAssistantNodeView, assistantProps('running', [REASONING])))
    const row = view.container.querySelector('[data-disclosure-row]') as HTMLElement
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(view.container.querySelector('[data-disclosure-content]')?.hasAttribute('data-collapsed')).toBe(false)
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(view.container.querySelector('[data-disclosure-content]')?.hasAttribute('data-collapsed')).toBe(true)
  })

  it('settles into the single-line state after the flourish', async () => {
    vi.useFakeTimers({ toFake: [...FAKE] })
    const block = { kind: 'reasoning', text: 'first line\n\nsecond' }
    const view = render(createElement(TypewriterAssistantNodeView, assistantProps('running', [block])))
    expect(view.container.querySelector('[data-follow-end]')).not.toBeNull()
    view.rerender(createElement(TypewriterAssistantNodeView, assistantProps('settled', [block])))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(view.container.textContent).toContain('first line')
    expect(view.container.querySelector('[data-disclosure-row]')?.getAttribute('aria-expanded')).toBe('false')
    expect(view.container.querySelector('[data-follow-end]')).toBeNull()
    expect(view.container.querySelector('[data-settled]')).not.toBeNull()
    expect(view.container.querySelector('[data-disclosure-content]')?.hasAttribute('data-collapsed')).toBe(true)
  })

  it('keeps the groupPart split from duplicating the box or the answer', () => {
    const blocks = [REASONING, { kind: 'text', text: '**answer**' }]
    const reasoningRow = render(createElement(TypewriterAssistantNodeView,
      assistantProps('running', blocks, { groupPart: 'reasoning' })))
    expect(reasoningRow.container.querySelectorAll('[data-variant="think"]')).toHaveLength(1)
    expect(reasoningRow.container.textContent).not.toContain('**answer**')
    reasoningRow.unmount()

    const responseRow = render(createElement(TypewriterAssistantNodeView,
      assistantProps('running', blocks, { groupPart: 'response' })))
    expect(responseRow.container.querySelector('[data-variant="think"]')).toBeNull()
    expect(responseRow.getByText('answer').tagName).toBe('STRONG')
  })
})

describe('body renderer', () => {
  it('renders streaming Markdown directly, without a reveal or follow wrapper', () => {
    const view = render(createElement(TypewriterAssistantNodeView,
      assistantProps('running', [{ kind: 'text', text: '**bold** tail' }])))
    expect(view.getByText('bold').tagName).toBe('STRONG')
    // No body follow host / reveal wrapper owns the answer any more.
    expect(view.container.querySelector('[data-follow-text]')).toBeNull()
    expect(view.container.querySelector('[data-follow-end]')).toBeNull()
  })

  it('renders unknown blocks through JsonBlock', () => {
    const view = render(createElement(TypewriterAssistantNodeView,
      assistantProps('settled', [{ kind: 'other', block: { type: 'mystery', value: 1 } }])))
    expect(view.container.textContent).toContain('message.unknownBlock')
  })
})

describe('assistant-step takeover', () => {
  function BuiltIn(): null { return null }

  async function bench(options: { withBuiltin?: boolean } = {}): Promise<{
    ctx: Context
    slots: SlotRegistry
    fiber: { dispose: () => Promise<void> }
  }> {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    slots.register({
      name: 'root',
      children: { 'conversation.chat.node': { kind: 'keyed', scope: 'session' } },
    } as never, (() => null) as never)
    if (options.withBuiltin === true) {
      slots.register({ name: 'conversation.chat.node', key: 'assistant-step' } as never, BuiltIn as never)
      slots.register({ name: 'conversation.chat.node', key: 'tool-call' } as never, (() => null) as never)
    }
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    return { ctx, slots, fiber }
  }

  const entryFor = (slots: SlotRegistry) => slots.entries('conversation.chat.node')
    .find(entry => entry.options.key === 'assistant-step')

  it('swaps the built-in assistant row in place and restores it on disposal', async () => {
    const { slots, fiber } = await bench({ withBuiltin: true })
    const entry = entryFor(slots)
    expect(entry?.component).not.toBe(BuiltIn)
    // The other keyed row is untouched.
    expect(slots.entries('conversation.chat.node').find(item => item.options.key === 'tool-call')?.component)
      .not.toBe(undefined)

    await fiber.dispose()
    expect(entryFor(slots)?.component).toBe(BuiltIn)
    expect(slots.entries('conversation.chat.node').filter(item => item.options.key === 'assistant-step'))
      .toHaveLength(1)
  })

  it('re-takes a late built-in row without leaving a duplicate seat', async () => {
    const { slots } = await bench()
    // No built-in row yet: the shadow fallback carries the renderer.
    expect(slots.entries('conversation.chat.node').filter(item => item.options.key === 'assistant-step'))
      .toHaveLength(1)

    slots.register({ name: 'conversation.chat.node', key: 'assistant-step' } as never, BuiltIn as never)
    await waitFor(() => {
      const seats = slots.entries('conversation.chat.node').filter(item => item.options.key === 'assistant-step')
      expect(seats).toHaveLength(1)
      expect(seats[0]?.component).not.toBe(BuiltIn)
    })
  })

  it('does not take the row over when the boot preference disables it', async () => {
    ;(globalThis as Record<string, unknown>)[STREAM_BOOT_GLOBAL] = { ...DEFAULT_STREAM_CONFIG, enabled: false }
    const { slots, fiber } = await bench({ withBuiltin: true })
    expect(entryFor(slots)?.component).toBe(BuiltIn)
    await fiber.dispose()
  })
})

describe('reasoning translation', () => {
  const face: ReasoningTranslationFace = {
    prepare: async () => ({ provider: 'test', model: 'test-model', targetLanguage: 'en', maxTextChars: 4000 }),
    translate: async source => `translated:${source}`,
  }

  it('switches the box to the translated feed on demand', async () => {
    const view = render(createElement(TypewriterAssistantNodeView, assistantProps('running', [REASONING], {
      translation: face,
      translationLabel: 'test · model',
      autoTranslate: false,
    })))
    const toggle = view.getByText(chatZh['message.think.translate'])
    fireEvent.click(toggle)
    await waitFor(() => {
      expect(view.container.textContent).toContain('translated:')
    })
  })
})
