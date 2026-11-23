import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TranslationModelPicker } from '../src/client/TranslationModelPicker.tsx'
import { en } from '../src/client/locales.ts'
import type { TranslationCatalog } from '../src/translation-protocol.ts'

afterEach(cleanup)

const t = (key: keyof typeof en): string => en[key]

const catalog: TranslationCatalog = {
  providers: [
    {
      id: 'alpha',
      name: 'Alpha Provider',
      models: [
        {
          id: 'm1',
          name: 'Model One',
          description: 'fast text model',
          reasoning: {
            efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }],
            defaultEffort: 'high',
          },
        },
        { id: 'm2', name: 'Model Two' },
      ],
    },
    {
      id: 'beta',
      name: 'Beta Provider',
      models: [
        { id: 'b1', name: 'Beta One' },
        { id: 'b2', name: 'Beta Two' },
        { id: 'b3', name: 'Beta Three' },
      ],
    },
  ],
  failures: [],
}

interface ProbeOptions {
  provider?: string
  model?: string
  effort?: string
  backend?: 'bundle' | 'llm'
  disabled?: boolean
  load?: (signal?: AbortSignal) => Promise<TranslationCatalog>
}

function probe(options: ProbeOptions = {}) {
  const onSelect = vi.fn()
  const view = render(
    <TranslationModelPicker
      t={t}
      provider={options.provider ?? 'alpha'}
      model={options.model ?? 'm1'}
      reasoningEffort={options.effort ?? 'low'}
      backend={options.backend ?? 'llm'}
      disabled={options.disabled ?? false}
      loadCatalog={options.load ?? (async () => catalog)}
      onSelect={onSelect}
    />,
  )
  return { view, onSelect }
}

const trigger = (): HTMLButtonElement => screen.getByRole('button', { name: new RegExp(en.translationRoute) }) as HTMLButtonElement

describe('translation model picker', () => {
  it('shows ids while loading and display names once the catalog resolves', async () => {
    let resolve!: (value: TranslationCatalog) => void
    const load = vi.fn(() => new Promise<TranslationCatalog>((done) => { resolve = done }))
    probe({ load })
    expect(trigger().textContent).toContain('alpha · m1 · low')
    resolve(catalog)
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider · Model One · Low'))
  })

  it('opens the root pane, drills into the model list and closes on outside click', async () => {
    probe()
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider'))
    fireEvent.click(trigger())
    const dialog = screen.getByRole('dialog', { name: en.translationRoute })
    expect(dialog.textContent).toContain(en.translationModel)
    expect(dialog.textContent).toContain('Model One')
    expect(dialog.textContent).toContain(en.translationEffort)

    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('hides the effort row for a model without reasoning levels', async () => {
    probe({ model: 'm2', effort: '' })
    await waitFor(() => expect(trigger().textContent).toContain('Model Two'))
    fireEvent.click(trigger())
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain(en.translationModel)
    expect(dialog.textContent).not.toContain(en.translationEffort)
  })

  it('groups models by provider, filters with search and stages the pick', async () => {
    const { onSelect } = probe()
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider'))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByText(en.translationModel))
    expect(screen.getByText('Alpha Provider')).toBeTruthy()
    expect(screen.getByText('Beta Provider')).toBeTruthy()
    const search = screen.getByPlaceholderText(en.translationSearchModels)
    fireEvent.change(search, { target: { value: 'Beta Two' } })
    expect(screen.queryByText('Model One')).toBeNull()
    fireEvent.click(screen.getByText('Beta Two'))
    expect(onSelect).toHaveBeenCalledWith({ provider: 'beta', model: 'b2', reasoningEffort: '' })
    // Selecting a model returns to the root pane; nothing is written yet.
    expect(screen.getByRole('dialog').textContent).toContain(en.translationModel)
  })

  it('uses the model default effort when selecting a model', async () => {
    const { onSelect } = probe()
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider'))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByText(en.translationModel))
    fireEvent.click(screen.getByText('Model One'))
    expect(onSelect).toHaveBeenCalledWith({ provider: 'alpha', model: 'm1', reasoningEffort: 'high' })
  })

  it('selects a reasoning effort and closes the card', async () => {
    const { onSelect } = probe()
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider'))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByText(en.translationEffort))
    fireEvent.click(screen.getByText('High'))
    expect(onSelect).toHaveBeenCalledWith({ provider: 'alpha', model: 'm1', reasoningEffort: 'high' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows the raw ids and a missing-route hint when the current route is absent', async () => {
    const { onSelect } = probe({ provider: 'gone', model: 'nope', effort: '' })
    expect(trigger().textContent).toContain('gone · nope')
    await waitFor(() => expect(trigger().textContent).toContain('gone'))
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog').textContent).toContain(en.translationRouteMissing)
    // A stale route never blocks picking a new one from the catalog.
    fireEvent.click(screen.getByText(en.translationModel))
    fireEvent.click(screen.getByText('Model One'))
    expect(onSelect).toHaveBeenCalledWith({ provider: 'alpha', model: 'm1', reasoningEffort: 'high' })
  })

  it('shows a failure and retries the catalog load', async () => {
    let calls = 0
    const load = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('boom')
      return catalog
    })
    probe({ load })
    await waitFor(() => expect(trigger().textContent).toContain('alpha'))
    fireEvent.click(trigger())
    await waitFor(() => expect(screen.getByText(en.translationCatalogFailed)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await waitFor(() => expect(screen.getByText('Model One')).toBeTruthy())
  })

  it('does not open while disabled', async () => {
    probe({ disabled: true })
    expect(trigger().disabled).toBe(true)
    fireEvent.click(trigger())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the bundle notice instead of a picker for the official backend', () => {
    probe({ backend: 'bundle' })
    expect(screen.getByText(en.translationBundleDecides)).toBeTruthy()
    expect(screen.queryByRole('button', { name: new RegExp(en.translationRoute) })).toBeNull()
  })

  it('closes with Escape and never stages a write by itself', async () => {
    const { onSelect } = probe()
    await waitFor(() => expect(trigger().textContent).toContain('Alpha Provider'))
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onSelect).not.toHaveBeenCalled()
  })
})
