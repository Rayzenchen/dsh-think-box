import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState, type ReactNode } from 'react'

// The Harness primitive/attachment packages ship prebuilt browser bundles whose
// CSS imports cannot be loaded by Node. The reasoning row only needs plain text
// rendering here, so stub the visual layer instead of inlining those packages.
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Icon = () => <svg aria-hidden />
  const Text = ({ children }: { children?: ReactNode }) => <span>{children}</span>
  return {
    MarkdownText: ({ text }: { text?: string }) => <span>{text}</span>,
    JsonBlock: () => null,
    Tooltip: Text,
    writeClipboard: async () => {},
    IconChevronDownOutlineRegular: Icon,
    IconChevronDownOutline14: Icon,
    IconChevronRightOutlineRegular: Icon,
    IconChevronRightOutline14: Icon,
    IconCheckOutlineRegular: Icon,
    IconCheckOutline14: Icon,
    IconCloseOutlineRegular: Icon,
    IconCloseOutline16: Icon,
    IconCodeOutlineRegular: Icon,
    IconCodeOutline16: Icon,
    IconCopyOutlineRegular: Icon,
    IconCopyOutline16: Icon,
    IconQuestionOutlineRegular: Icon,
    IconQuestionOutline14: Icon,
    IconRefreshOutlineRegular: Icon,
    IconRefreshOutline14: Icon,
    IconRefreshOutline16: Icon,
    IconThinkOutlineRegular: Icon,
    IconThinkOutline14: Icon,
  }
})
vi.mock('@deepseek-ai/dsh-client-ui-attachment', () => ({
  ImageGallery: () => null,
}))

import { ReasoningAssistantNodeView } from '../src/client/ReasoningAssistantNodeView.tsx'
import {
  planTranslationFragments,
  type ReasoningTranslationFace,
  type TranslationPlan,
} from '../src/client/reasoningTranslation.ts'
import { useReasoningTranslation } from '../src/client/useReasoningTranslation.ts'
import { chatZh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Count non-overlapping occurrences of a fixed string. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

const PLAN: TranslationPlan = {
  provider: 'google',
  targetLanguage: 'zh',
  maxTextChars: 4000,
}

/** Resolve the plugin's real conversation dictionary so missing keys fail loudly. */
function t(key: string): string {
  return (chatZh as Record<string, string>)[key] ?? key
}

function assistantProps(
  blocks: unknown[],
  status: 'settled' | 'running' = 'settled',
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
    sessionId: 'session-translation',
    t,
  } as unknown as Parameters<typeof ReasoningAssistantNodeView>[0]
}

/** Deterministic translation Remote stand-in. */
function face(overrides: Partial<ReasoningTranslationFace> = {}): ReasoningTranslationFace {
  return {
    prepare: async () => PLAN,
    translate: async source => `译:${source}`,
    ...overrides,
  }
}

describe('planTranslationFragments', () => {
  it('translates complete lines and leaves the streaming tail in the original language while streaming', () => {
    const planned = planTranslationFragments('第一行\n第二行\n未完成', 4000, false)
    expect(planned.fragments.map(fragment => fragment.source)).toEqual(['第一行\n第二行'])
    expect(planned.fragments[0]?.suffix).toBe('\n')
    expect(planned.tail).toBe('未完成')
    expect(planned.leading).toBe('')
  })

  it('translates the final line once the block is complete', () => {
    const planned = planTranslationFragments('第一行\n第二行\n未完成', 4000)
    expect(planned.fragments.map(fragment => fragment.source)).toEqual(['第一行\n第二行', '未完成'])
    expect(planned.tail).toBe('')
  })

  it('split a long unterminated line at the provider limit while streaming', () => {
    const planned = planTranslationFragments('a'.repeat(950), 400, false)
    expect(planned.fragments.map(fragment => fragment.source.length)).toEqual([400, 400])
    expect(planned.tail).toBe('a'.repeat(150))
  })

  it('preserves the whitespace suffix outside the translated source', () => {
    const planned = planTranslationFragments('hello\n\nworld\n', 4000)
    expect(planned.fragments.map(fragment => [fragment.source, fragment.suffix])).toEqual([
      ['hello', '\n\n'],
      ['world', '\n'],
    ])
    expect(planned.tail).toBe('')
  })

  it('never splits a surrogate pair', () => {
    const planned = planTranslationFragments('ab😀cd', 3, false)
    expect(planned.fragments.map(fragment => fragment.source)).toEqual(['ab', '😀c'])
    expect(planned.tail).toBe('d')
    // No fragment may end with a lone high surrogate.
    for (const fragment of planned.fragments) {
      expect(fragment.source.charCodeAt(fragment.source.length - 1)).toBeLessThan(0xd800)
    }
  })
})

describe('reasoning translation integration', () => {
  it('shows the translated feed after the toggle is clicked and switches back to the original', async () => {
    const translation = face()
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'first line\nsecond line' }])}
      translation={translation}
    />)

    expect(view.container.textContent).not.toContain('译:')

    fireEvent.click(view.getByRole('button', { name: '查看译文' }))
    await waitFor(() => {
      expect(view.container.textContent).toContain('译:first line\n译:second line')
    })
    // Both the inline row and the opened body share the same feed.
    expect(countOccurrences(view.container.textContent ?? '', '译:first line\n译:second line')).toBe(2)

    fireEvent.click(view.getByRole('button', { name: '查看原文' }))
    expect(view.container.textContent).not.toContain('译:')
    expect(countOccurrences(view.container.textContent ?? '', 'first line\nsecond line')).toBe(2)
  })

  it('publishes each translated fragment while later fragments are still pending', async () => {
    const resolvers: Array<(value: string) => void> = []
    const translation = face({
      translate: source => new Promise<string>((resolve) => {
        resolvers.push((value: string) => { resolve(value) })
        void source
      }),
    })
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'line one\n\nline two\n' }])}
      translation={translation}
    />)

    fireEvent.click(view.getByRole('button', { name: '查看译文' }))
    await waitFor(() => { expect(resolvers.length).toBe(1) })
    resolvers[0]?.('译:line one')
    await waitFor(() => { expect(view.container.textContent).toContain('译:line one') })
    // The second fragment is queued behind the first; its translation is still missing.
    await waitFor(() => { expect(resolvers.length).toBe(2) })
    expect(view.container.textContent).toContain('line two')
    expect(view.container.textContent).not.toContain('译:line two')

    resolvers[1]?.('译:line two')
    await waitFor(() => { expect(view.container.textContent).toContain('译:line two') })
  })

  it('does not start a translation until the reader opts in', async () => {
    const prepare = vi.fn(async () => PLAN)
    const translate = vi.fn(async (source: string) => `译:${source}`)
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'first line\nsecond line' }])}
      translation={face({ prepare, translate })}
    />)

    await act(async () => { await Promise.resolve() })
    expect(prepare).not.toHaveBeenCalled()
    expect(translate).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('button', { name: '查看译文' }))
    await waitFor(() => { expect(translate).toHaveBeenCalledTimes(1) })
  })

  it('keeps the original text and offers a retry when translation fails', async () => {
    let fail = true
    const translation = face({
      translate: async source => {
        if (fail) throw new Error('provider down')
        return `译:${source}`
      },
    })
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'first line\nsecond line' }])}
      translation={translation}
    />)

    fireEvent.click(view.getByRole('button', { name: '查看译文' }))
    await waitFor(() => { expect(view.getByText('翻译失败')).toBeTruthy() })
    expect(view.container.textContent).toContain('first line\nsecond line')
    expect(view.container.textContent).not.toContain('译:')

    fail = false
    fireEvent.click(view.getByRole('button', { name: '重试' }))
    await waitFor(() => {
      expect(countOccurrences(view.container.textContent ?? '', '译:first line\n译:second line')).toBe(2)
    })
  })

  it('translates a live reasoning block automatically when autoTranslate is on', async () => {
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'first line\nsecond line' }], 'running')}
      translation={face()}
      autoTranslate
    />)
    await waitFor(() => { expect(view.container.textContent).toContain('译:first line') })
  })

  it('hides the toggle when the translation bundle is not mounted', () => {
    const view = render(<ReasoningAssistantNodeView
      {...assistantProps([{ kind: 'reasoning', text: 'first line' }])}
    />)
    expect(view.queryByRole('button', { name: '查看译文' })).toBeNull()
  })
})

/** Minimal harness for the hook-level opt-in contract. */
function TranslationProbe({ translation, text, autoActive = false }: {
  translation: ReasoningTranslationFace
  text: string
  autoActive?: boolean
}) {
  const control = useReasoningTranslation(text, 'session-translation', translation, true, autoActive)
  const [shown, setShown] = useState('')
  return (
    <div>
      <button type="button" onClick={() => control.toggle()}>toggle</button>
      <button type="button" onClick={() => setShown(control.displayText)}>read</button>
      <span data-testid="active">{control.active ? 'active' : 'original'}</span>
      <span data-testid="display">{shown}</span>
    </div>
  )
}

describe('useReasoningTranslation', () => {
  it('switches to the translated feed without a click when auto translation is on', async () => {
    const view = render(<TranslationProbe translation={face()} text={'first line\nsecond line'} autoActive />)
    await waitFor(() => { expect(view.getByTestId('active').textContent).toBe('active') })
    await waitFor(() => {
      fireEvent.click(view.getByRole('button', { name: 'read' }))
      expect(view.getByTestId('display').textContent).toBe('译:first line\n译:second line')
    })
    // Turning auto translation off still restores the original feed.
    fireEvent.click(view.getByRole('button', { name: 'toggle' }))
    await waitFor(() => { expect(view.getByTestId('active').textContent).toBe('original') })
  })

  it('reports the streaming feed through displayText after the first toggle', async () => {
    const view = render(<TranslationProbe translation={face()} text={'first line\nsecond line'} />)
    expect(view.getByTestId('active').textContent).toBe('original')

    fireEvent.click(view.getByRole('button', { name: 'toggle' }))
    await waitFor(() => { expect(view.getByTestId('active').textContent).toBe('active') })
    await waitFor(() => {
      // displayText is read on the next render, after the engine publishes.
      fireEvent.click(view.getByRole('button', { name: 'read' }))
      expect(view.getByTestId('display').textContent).toBe('译:first line\n译:second line')
    })
  })
})
