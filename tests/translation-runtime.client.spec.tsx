import { describe, expect, it, vi } from 'vitest'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from '../src/config.ts'
import type { ReasoningTranslationFace } from '../src/client/reasoningTranslation.ts'
import { createTranslationSettingsApi } from '../src/client/translation-settings-api.ts'
import { TranslationRuntime } from '../src/client/translation-runtime.ts'
import { TRANSLATION_RPC, TRANSLATION_RPC_CHANNEL } from '../src/translation-protocol.ts'

const SETTINGS: TranslationConfig = {
  ...DEFAULT_TRANSLATION_CONFIG,
  backend: 'llm',
  provider: 'opencode-go',
  model: 'deepseek-v4.1-flash',
}

function fakeFace(): ReasoningTranslationFace {
  return {
    prepare: async () => ({ provider: 'opencode-go', targetLanguage: 'zh', maxTextChars: 4000 }),
    translate: async source => `译:${source}`,
  }
}

function fakeConnection(handler: (endpoint: string, payload: unknown) => unknown): ConnectionHandle {
  return {
    rpc: {
      call: vi.fn(async (_channel: string, endpoint: string, payload: unknown) => handler(endpoint, payload)),
    },
  } as unknown as ConnectionHandle
}

describe('TranslationRuntime', () => {
  it('selects the face and label from the active backend', () => {
    const runtime = new TranslationRuntime(SETTINGS)
    const hostFace = fakeFace()
    const bundleFace = fakeFace()
    runtime.setHostFace(hostFace)
    runtime.setBundleFace(bundleFace)
    expect(runtime.getSnapshot().face).toBe(hostFace)
    expect(runtime.getSnapshot().label).toBe('opencode-go · deepseek-v4.1-flash')

    runtime.apply({ ...SETTINGS, backend: 'bundle' })
    expect(runtime.getSnapshot().face).toBe(bundleFace)
    expect(runtime.getSnapshot().label).toBe('官方思考过程翻译组合包')
  })

  it('notifies subscribers only when the projected state changes', () => {
    const runtime = new TranslationRuntime(SETTINGS)
    runtime.setHostFace(fakeFace())
    const listener = vi.fn()
    runtime.subscribe(listener)
    runtime.apply({ ...SETTINGS })
    expect(listener).not.toHaveBeenCalled()
    runtime.apply({ ...SETTINGS, autoTranslate: false })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reads the Host store through the settings client and applies it', async () => {
    const runtime = new TranslationRuntime({ ...SETTINGS, backend: 'bundle' })
    const api = createTranslationSettingsApi(fakeConnection(() => ({ ok: true, value: SETTINGS })))
    runtime.start(api)
    try {
      const applied = await runtime.refresh()
      expect(applied).toMatchObject({ backend: 'llm' })
    } finally {
      runtime.stop()
    }
  })
})

describe('createTranslationSettingsApi', () => {
  it('reads and writes through the translation channel', async () => {
    const calls: Array<{ endpoint: string, payload: unknown }> = []
    const api = createTranslationSettingsApi(fakeConnection((endpoint, payload) => {
      calls.push({ endpoint, payload })
      return { ok: true, value: { ...SETTINGS, autoTranslate: false } }
    }))
    await expect(api.read()).resolves.toMatchObject({ backend: 'llm', autoTranslate: false })
    await api.write({ backend: 'bundle' })
    expect(calls[0]).toEqual({ endpoint: TRANSLATION_RPC.settingsRead, payload: {} })
    expect(calls[1]).toEqual({ endpoint: TRANSLATION_RPC.settingsWrite, payload: { backend: 'bundle' } })
  })

  it('throws a coded failure when the host rejects the request', async () => {
    const api = createTranslationSettingsApi(fakeConnection(() => ({
      ok: false,
      error: { code: 'translation/bad-request', message: 'provider must not be empty' },
    })))
    const failure = await api.read().catch((error: unknown) => error)
    expect(failure).toMatchObject({ name: 'TranslationSettingsFailure', code: 'translation/bad-request' })
  })
})

// The channel constant is part of the wire contract; keep it pinned here.
expect(TRANSLATION_RPC_CHANNEL).toBe('/smooth-stream-translate')
