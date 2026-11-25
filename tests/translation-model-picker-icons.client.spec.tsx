/**
 * Regression for the runtime-only icon crash.
 *
 * The published primitives package used for development still exposes the
 * size-suffixed icon names, while current Harness ships weight-suffixed names.
 * A direct primitives import therefore type-checks and passes the old tests but
 * resolves to `undefined` at runtime, and React unmounts the whole Plugins-page
 * card when the picker opens. The picker must go through harnessIcons' runtime
 * resolver, which has to work with either export set.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TranslationCatalog } from '../src/translation-protocol.ts'
import type { TranslationModelPickerProps } from '../src/client/TranslationModelPicker.tsx'

const catalog: TranslationCatalog = {
  providers: [{
    id: 'alpha',
    name: 'Alpha',
    models: [{
      id: 'm1',
      name: 'Model One',
      reasoning: { efforts: [{ id: 'low', name: 'Low' }] },
    }],
  }],
  failures: [],
}

function MockInput(props: Record<string, unknown>) {
  return createElement('input', props)
}

function mockIcon(name: string) {
  return function Icon(props: Record<string, unknown>) {
    return createElement('span', { ...props, 'data-icon': name })
  }
}

function props(): TranslationModelPickerProps {
  return {
    t: (key) => key,
    provider: 'alpha',
    model: 'm1',
    reasoningEffort: 'low',
    backend: 'llm',
    disabled: false,
    loadCatalog: async () => catalog,
    onSelect: () => {},
  }
}

afterEach(() => {
  cleanup()
  vi.resetModules()
  vi.unmock('@deepseek-ai/dsh-client-ui-primitives')
})

describe('picker icon compatibility', () => {
  it('resolves weight-suffixed exports and opens the card without throwing', async () => {
    vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
      Input: MockInput,
      IconChevronDownOutlineRegular: mockIcon('down'),
      IconChevronRightOutlineRegular: mockIcon('right'),
      IconCheckOutlineRegular: mockIcon('check'),
      IconThinkOutlineRegular: mockIcon('think'),
    }))
    const icons = await import('../src/client/harnessIcons.ts')
    expect(typeof icons.IconChevronDown).toBe('function')
    expect(typeof icons.IconChevronRight).toBe('function')
    expect(typeof icons.IconCheck).toBe('function')

    const { TranslationModelPicker } = await import('../src/client/TranslationModelPicker.tsx')
    expect(() => render(createElement(TranslationModelPicker, props()))).not.toThrow()
    const trigger = await screen.findByRole('button', { name: /translationRoute/ })
    expect(trigger.querySelector('[data-icon="down"]')).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('dialog').querySelector('[data-icon="right"]')).toBeTruthy()

    // Drill into the model list so the selected-row check icon also renders.
    fireEvent.click(screen.getByText('translationModel'))
    await waitFor(() => expect(screen.getByText('Model One')).toBeTruthy())
    expect(screen.getByRole('dialog').textContent).toContain('Model One')
  })

  it('falls back to the legacy size-suffixed exports', async () => {
    vi.resetModules()
    vi.doUnmock('@deepseek-ai/dsh-client-ui-primitives')
    vi.doMock('@deepseek-ai/dsh-client-ui-primitives', () => ({
      Input: MockInput,
      IconChevronDownOutline14: mockIcon('down-14'),
      IconChevronRightOutline14: mockIcon('right-14'),
      IconCheckOutline14: mockIcon('check-14'),
      IconThinkOutline14: mockIcon('think-14'),
    }))
    const icons = await import('../src/client/harnessIcons.ts')
    expect(typeof icons.IconChevronDown).toBe('function')
    expect(typeof icons.IconChevronRight).toBe('function')
    expect(typeof icons.IconCheck).toBe('function')

    const { TranslationModelPicker } = await import('../src/client/TranslationModelPicker.tsx')
    expect(() => render(createElement(TranslationModelPicker, props()))).not.toThrow()
    const trigger = await screen.findByRole('button', { name: /translationRoute/ })
    expect(trigger.querySelector('[data-icon="down-14"]')).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('dialog').querySelector('[data-icon="right-14"]')).toBeTruthy()
    fireEvent.click(screen.getByText('translationModel'))
    await waitFor(() => expect(screen.getByText('Model One')).toBeTruthy())
  })
})
