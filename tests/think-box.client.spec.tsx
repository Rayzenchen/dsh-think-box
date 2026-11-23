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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ReasoningAssistantNodeView } from '../src/client/ReasoningAssistantNodeView.tsx'
import { apply, inject } from '../src/client/index.ts'
import { DEFAULT_THINK_BOX_CONFIG, THINK_BOX_BOOT_GLOBAL } from '../src/config.ts'
import { chatZh } from '../src/client/locales.ts'
import { FrameCoordinator } from '../src/client/FrameCoordinator.ts'
import type { ReasoningTranslationFace } from '../src/client/reasoningTranslation.ts'

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] as const

afterEach(() => {
  cleanup()
  FrameCoordinator.forDocument(document).shutdown()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (globalThis as Record<string, unknown>)[THINK_BOX_BOOT_GLOBAL]
})

function assistantProps(
  status: 'running' | 'settled',
  blocks: unknown[],
  extra: Record<string, unknown> = {},
): Parameters<typeof ReasoningAssistantNodeView>[0] {
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
  } as unknown as Parameters<typeof ReasoningAssistantNodeView>[0]
}

const REASONING = { kind: 'reasoning', text: 'first line\nlatest tokens' }

describe('boot snapshot', () => {
  async function registeredContainer(props: Parameters<typeof ReasoningAssistantNodeView>[0]): Promise<HTMLElement> {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    ctx.slots.register({
      name: 'root',
      children: { 'conversation.chat.node': { kind: 'keyed', scope: 'session' } },
    } as never, (() => null) as never)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const component = ctx.slots.entries('conversation.chat.node')[0]?.component
    expect(component).toBeTypeOf('function')
    const view = render(createElement(component as never, props))
    await fiber.dispose()
    return view.container
  }

  it('ignores extra fields from an older Host boot snapshot', async () => {
    ;(globalThis as Record<string, unknown>)[THINK_BOX_BOOT_GLOBAL] = {
      enabled: true,
      thinkAutoExpand: true,
      translation: DEFAULT_THINK_BOX_CONFIG.translation,
      mode: 'typewriter',
      preset: 'silky',
      controlScroll: false,
      debugEnabled: true,
    }
    const container = await registeredContainer(assistantProps('running', [REASONING]))
    expect(container.querySelector('[data-variant="think"]')).not.toBeNull()
  })

  it('uses defaults when the boot snapshot predates the two preferences', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    ;(globalThis as Record<string, unknown>)[THINK_BOX_BOOT_GLOBAL] = { mode: 'typewriter', preset: 'balanced' }
    try {
      const container = await registeredContainer(assistantProps('running', [REASONING]))
      expect(container.querySelector('[data-variant="think"]')).not.toBeNull()
      expect(info).toHaveBeenCalledWith(expect.stringContaining('predates the preference snapshot'))
    } finally {
      info.mockRestore()
    }
  })

  it('fails loudly when a preference is present but malformed', async () => {
    ;(globalThis as Record<string, unknown>)[THINK_BOX_BOOT_GLOBAL] = { enabled: 'yes', thinkAutoExpand: true }
    await expect(registeredContainer(assistantProps('running', [REASONING])))
      .rejects.toThrow(/malformed/)
  })
})

describe('reasoning box', () => {
  it('renders the inline preview while reasoning streams', () => {
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [REASONING])))
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
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [REASONING])))
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
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [block])))
    expect(view.container.querySelector('[data-follow-end]')).not.toBeNull()
    view.rerender(createElement(ReasoningAssistantNodeView, assistantProps('settled', [block])))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(view.container.textContent).toContain('first line')
    expect(view.container.querySelector('[data-disclosure-row]')?.getAttribute('aria-expanded')).toBe('false')
    expect(view.container.querySelector('[data-follow-end]')).toBeNull()
    expect(view.container.querySelector('[data-settled]')).not.toBeNull()
    expect(view.container.querySelector('[data-disclosure-content]')?.hasAttribute('data-collapsed')).toBe(true)
  })

  it('keeps the groupPart split from duplicating the box or the answer', () => {
    const blocks = [REASONING, { kind: 'text', text: '**answer**' }]
    const reasoningRow = render(createElement(ReasoningAssistantNodeView,
      assistantProps('running', blocks, { groupPart: 'reasoning' })))
    expect(reasoningRow.container.querySelectorAll('[data-variant="think"]')).toHaveLength(1)
    expect(reasoningRow.container.textContent).not.toContain('**answer**')
    reasoningRow.unmount()

    const responseRow = render(createElement(ReasoningAssistantNodeView,
      assistantProps('running', blocks, { groupPart: 'response' })))
    expect(responseRow.container.querySelector('[data-variant="think"]')).toBeNull()
    expect(responseRow.getByText('answer').tagName).toBe('STRONG')
  })
})

describe('reasoning box contracts', () => {
  const cssText = readFileSync(join(process.cwd(), 'src/client/ReasoningAssistantNodeView.module.css'), 'utf8')

  it('keeps the inline preview on the three-line geometry contract', () => {
    // `--dsh-thinking-inline-span: 2` plus the row chrome is the verified
    // three-line look; the settled state swaps the same variable to one line.
    expect(cssText).toContain('--dsh-thinking-inline-span: 2;')
    expect(cssText).toContain('.thinkInline[data-settled]')
    expect(cssText).toContain('--dsh-thinking-inline-span: 1;')

    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [REASONING])))
    const inline = view.container.querySelector('[data-follow-end]') as HTMLElement
    expect(inline.className).toContain('thinkInline')
    expect(inline.hasAttribute('data-settled')).toBe(false)
  })

  it('caps the opened reasoning body at eighteen lines', () => {
    expect(cssText).toContain('--dsh-thinking-expanded-lines, 18')
  })

  it('plays the settle flourish once and never for a history mount', async () => {
    vi.useFakeTimers({ toFake: [...FAKE] })
    const block = { kind: 'reasoning', text: 'first line\nsecond line' }
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [block])))
    view.rerender(createElement(ReasoningAssistantNodeView, assistantProps('settled', [block])))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(view.container.querySelector('[data-settled]')).not.toBeNull()
    const settledAt = view.container.querySelector('[data-follow-end]')
    expect(settledAt).toBeNull()

    // Later settled rerenders must not restart the flourish.
    view.rerender(createElement(ReasoningAssistantNodeView, assistantProps('settled', [block])))
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(view.container.querySelector('[data-follow-end]')).toBeNull()
    expect(view.container.querySelector('[data-settled]')).not.toBeNull()

    // Restoring a transcript mounts already settled: no flourish at all.
    const history = render(createElement(ReasoningAssistantNodeView, assistantProps('settled', [block])))
    expect(history.container.querySelector('[data-follow-end]')).toBeNull()
    expect(history.container.querySelector('[data-settled]')).not.toBeNull()
  })

  it('hides answer-inline reasoning through the Host turnProcess fold contract', () => {
    const block = { kind: 'reasoning', text: 'folded reasoning' }
    const folded = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [block], {
      turnProcess: {
        foldable: true,
        open: false,
        spec: { answerStep: 1, inlineReasoning: true },
        setOpen: () => {},
      },
    })))
    const wrapper = folded.container.querySelector('[data-turn-process-inline]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.hasAttribute('hidden')).toBe(true)

    const open = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [block], {
      turnProcess: {
        foldable: true,
        open: true,
        spec: { answerStep: 1, inlineReasoning: true },
        setOpen: () => {},
      },
    })))
    expect(open.container.querySelector('[data-turn-process-inline]')).toBeNull()
  })

  it('renders images through ImageGallery', async () => {
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('settled', [{
      kind: 'image',
      attachment: { attachmentId: 'img-1', mediaType: 'image/png', bytes: 4, width: 1, height: 1 },
    }], { loadImage: async () => 'data:image/png;base64,iVBORw0KGgo=' })))
    await waitFor(() => { expect(view.container.querySelector('img')).not.toBeNull() })
  })

  it('leaves no follow, announcement, FPS or diagnostics traces in the tree', () => {
    const view = render(createElement(ReasoningAssistantNodeView,
      assistantProps('running', [REASONING])))
    expect(view.container.querySelector('[data-follow-text]')).toBeNull()
    expect(view.container.querySelector('[aria-live]')).toBeNull()
    expect(view.container.textContent).not.toContain('Render diagnostics')
    expect(view.container.querySelector('[data-console-scroll]')).toBeNull()
    expect((view.container.querySelector('[data-follow-end]') as HTMLElement).getAttribute('class')).toContain('thinkInline')
  })

  it('renders reasoning immediately under OS reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [REASONING])))
    await act(async () => { await Promise.resolve() })
    expect(view.container.textContent).toContain('latest tokens')
    expect(view.container.querySelector('[class*="scope"]')).toBeNull()
  })
})

describe('body renderer', () => {
  it('renders streaming Markdown directly, without a reveal or follow wrapper', () => {
    const view = render(createElement(ReasoningAssistantNodeView,
      assistantProps('running', [{ kind: 'text', text: '**bold** tail' }])))
    expect(view.getByText('bold').tagName).toBe('STRONG')
    // No body follow host / reveal wrapper owns the answer any more.
    expect(view.container.querySelector('[data-follow-text]')).toBeNull()
    expect(view.container.querySelector('[data-follow-end]')).toBeNull()
  })

  it('renders unknown blocks through JsonBlock', () => {
    const view = render(createElement(ReasoningAssistantNodeView,
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

  it('registers a priority -100 fallback seat when there is no built-in row', async () => {
    const { slots, fiber } = await bench()
    const seats = slots.entries('conversation.chat.node')
      .filter(item => item.options.key === 'assistant-step')
    expect(seats).toHaveLength(1)
    expect(seats[0]?.options.priority).toBe(-100)
    await fiber.dispose()
    expect(slots.entries('conversation.chat.node')).toHaveLength(0)
  })

  it('does not take the row over when the boot preference disables it', async () => {
    ;(globalThis as Record<string, unknown>)[THINK_BOX_BOOT_GLOBAL] = { ...DEFAULT_THINK_BOX_CONFIG, enabled: false }
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
    const view = render(createElement(ReasoningAssistantNodeView, assistantProps('running', [REASONING], {
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
