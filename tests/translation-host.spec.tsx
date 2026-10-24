import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createLlmTranslationRoute,
  createTranslationHandler,
  TranslationRouteError,
  type LlmServiceLike,
} from '../src/translation-host.ts'
import { TRANSLATION_RPC } from '../src/translation-protocol.ts'
import {
  createTranslationSettingsStore,
  mergeTranslationSettings,
  TranslationSettingsError,
} from '../src/translation-settings.ts'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from '../src/config.ts'

function memoryStore(initial: TranslationConfig = CONFIG) {
  let current = { ...DEFAULT_TRANSLATION_CONFIG, ...initial }
  return {
    snapshot: () => current,
    update: (patch: unknown) => {
      current = mergeTranslationSettings(current, patch)
      return current
    },
  }
}

interface Chunk {
  type: string
  text?: string
  blockType?: string
  block?: { blockType?: string }
  reason?: { kind: string }
}

function streamOf(chunks: readonly Chunk[]): AsyncIterable<Chunk> {
  return (async function* () {
    for (const chunk of chunks) yield chunk
  })()
}

function textOf(...texts: string[]): Chunk[] {
  return [
    ...texts.map(text => ({ type: 'text-delta', text })),
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

const CONFIG: TranslationConfig = {
  backend: 'llm',
  provider: 'opencode-go',
  model: 'deepseek-v4.1-flash',
  reasoningEffort: 'low',
  targetLanguage: 'auto',
  maxTextChars: 4000,
  maxTokens: 8192,
  timeoutMs: 10_000,
  autoTranslate: true,
}

function llmOf(options: {
  providers?: readonly string[]
  models?: readonly string[]
  chunks?: readonly Chunk[]
  prepareError?: (config: { reasoningEffort?: string | undefined }) => unknown
} = {}): LlmServiceLike {
  const models = options.models ?? ['deepseek-v4.1-flash']
  return {
    listProviders: () => (options.providers ?? ['opencode-go']).map(id => ({ id })),
    listModels: async () => models.map(id => ({ id })),
    prepareCall: vi.fn(async config => {
      const error = options.prepareError?.(config)
      if (error !== undefined) throw error
      return {
        config: { ...config },
        stream: () => streamOf(options.chunks ?? textOf('译文')),
      }
    }),
  }
}

describe('translation settings store', () => {
  it('validates updates and reloads them from disk', () => {
    const home = mkdtempSync(join(tmpdir(), 'dsh-think-box-'))
    const path = join(home, 'translation.json')
    try {
      const store = createTranslationSettingsStore({ ...CONFIG }, path)
      expect(store.snapshot()).toMatchObject({ backend: 'llm', provider: 'opencode-go', autoTranslate: true })
      expect(() => store.update({ maxTextChars: 1 })).toThrow(TranslationSettingsError)
      expect(() => store.update({ backend: 'nonsense' })).toThrow(TranslationSettingsError)
      store.update({ provider: 'other-provider', autoTranslate: false })
      const reloaded = createTranslationSettingsStore({ ...CONFIG }, path)
      expect(reloaded.snapshot()).toMatchObject({ provider: 'other-provider', autoTranslate: false })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe('createLlmTranslationRoute', () => {
  const signal = (): AbortSignal => new AbortController().signal

  it('reports the configured route and request limit', async () => {
    const route = createLlmTranslationRoute(() => CONFIG, () => llmOf())
    await expect(route.plan(signal())).resolves.toEqual({
      provider: 'opencode-go',
      model: 'deepseek-v4.1-flash',
      maxTextChars: 4000,
      targetLanguage: 'auto',
    })
  })

  it('rejects a route whose provider or model is not registered', async () => {
    const missingProvider = createLlmTranslationRoute(() => CONFIG, () => llmOf({ providers: ['other'] }))
    await expect(missingProvider.plan(signal())).rejects.toMatchObject({ code: 'translation/route-unavailable' })
    const missingModel = createLlmTranslationRoute(() => CONFIG, () => llmOf({ models: ['other-model'] }))
    await expect(missingModel.plan(signal())).rejects.toMatchObject({ code: 'translation/route-unavailable' })
  })

  it('assembles text deltas and ignores reasoning and usage frames', async () => {
    const route = createLlmTranslationRoute(() => CONFIG, () => llmOf({
      chunks: [
        { type: 'block-start', blockType: 'text' },
        { type: 'reasoning-delta', text: 'thinking…' },
        { type: 'text-delta', text: '你' },
        { type: 'usage' },
        { type: 'text-delta', text: '好' },
        { type: 'block-end', block: { blockType: 'text' } },
        { type: 'finish', reason: { kind: 'stop' } },
      ],
    }))
    await expect(route.translate({
      text: 'hello', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh',
    }, signal())).resolves.toBe('你好')
  })

  it('falls back from an unsupported reasoning effort to low', async () => {
    const prepare = vi.fn(async (config: { reasoningEffort?: string | undefined }) => {
      if (config.reasoningEffort === 'off') {
        const error = new Error('unsupported') as Error & { code: string }
        error.code = 'UNSUPPORTED_REASONING_EFFORT'
        throw error
      }
      return { config: { ...config }, stream: () => streamOf(textOf('ok')) }
    })
    const llm: LlmServiceLike = {
      listProviders: () => [{ id: 'opencode-go' }],
      listModels: async () => [{ id: 'deepseek-v4.1-flash' }],
      prepareCall: prepare,
    }
    const route = createLlmTranslationRoute(() => ({ ...CONFIG, reasoningEffort: 'off' }), () => llm)
    await expect(route.translate({
      text: 'hello', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh',
    }, signal())).resolves.toBe('ok')
    expect(prepare.mock.calls.map(call => call[0].reasoningEffort)).toEqual(['off', 'low'])
  })

  it('forwards the owning Session id and falls back when it is missing', async () => {
    const seen: Array<Record<string, unknown>> = []
    const llm: LlmServiceLike = {
      listProviders: () => [{ id: 'opencode-go' }],
      listModels: async () => [{ id: 'deepseek-v4.1-flash' }],
      prepareCall: async config => ({
        config: { ...config },
        stream: (options) => {
          seen.push(options)
          return streamOf(textOf('ok'))
        },
      }),
    }
    const route = createLlmTranslationRoute(() => CONFIG, () => llm)
    const request = { text: 'hello', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh' }
    await route.translate({ ...request, sessionId: 'session-abc' }, signal())
    await route.translate(request, signal())
    expect(seen[0]?.sessionId).toBe('session-abc')
    expect(typeof seen[1]?.sessionId).toBe('string')
    expect((seen[1]?.sessionId as string).length).toBeGreaterThan(0)
  })

  it('rejects fragments beyond the request limit', async () => {
    const route = createLlmTranslationRoute(() => ({ ...CONFIG, maxTextChars: 4 }), () => llmOf())
    await expect(route.translate({
      text: 'too long', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh',
    }, signal())).rejects.toMatchObject({ code: 'translation/text-limit' })
  })

  it('maps abnormal finishes, tool output, and empty translations to failures', async () => {
    const translateOf = (chunks: readonly Chunk[]) => createLlmTranslationRoute(() => CONFIG, () => llmOf({ chunks })).translate(
      { text: 'hello', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh' },
      signal(),
    )
    await expect(translateOf([{ type: 'text-delta', text: 'x' }, { type: 'finish', reason: { kind: 'error' } }]))
      .rejects.toMatchObject({ code: 'translation/request-failed' })
    await expect(translateOf([{ type: 'block-start', blockType: 'tool-call' }, { type: 'finish', reason: { kind: 'stop' } }]))
      .rejects.toMatchObject({ code: 'translation/invalid-response' })
    await expect(translateOf([{ type: 'finish', reason: { kind: 'stop' } }]))
      .rejects.toMatchObject({ code: 'translation/invalid-response' })
  })

  it('exposes failures as sanitized envelopes on the handler', async () => {
    const handler = createTranslationHandler(createLlmTranslationRoute(() => CONFIG, () => llmOf({ providers: ['other'] })), memoryStore())
    await expect(handler(TRANSLATION_RPC.plan, {}, signal())).resolves.toMatchObject({
      ok: false,
      error: { code: 'translation/route-unavailable' },
    })
  })

  it('rejects unknown endpoints and mismatched routes', async () => {
    const handler = createTranslationHandler(createLlmTranslationRoute(() => CONFIG, () => llmOf()), memoryStore())
    await expect(handler('translation.unknown', {}, signal())).resolves.toMatchObject({ ok: false })
    await expect(handler(TRANSLATION_RPC.translate, {
      text: 'hello', provider: 'other', model: 'deepseek-v4.1-flash', targetLanguage: 'zh',
    }, signal())).resolves.toMatchObject({ ok: false, error: { code: 'translation/route-mismatch' } })
  })

  it('serves and persists runtime settings on the handler', async () => {
    const store = memoryStore()
    const handler = createTranslationHandler(createLlmTranslationRoute(() => CONFIG, () => llmOf()), store)
    await expect(handler(TRANSLATION_RPC.settingsRead, {}, signal())).resolves.toMatchObject({
      ok: true,
      value: { backend: 'llm', provider: 'opencode-go', maxTextChars: 4000 },
    })
    await expect(handler(TRANSLATION_RPC.settingsWrite, { backend: 'llm', model: 'other-model' }, signal()))
      .resolves.toMatchObject({ ok: true, value: { backend: 'llm', model: 'other-model' } })
    await expect(handler(TRANSLATION_RPC.settingsRead, {}, signal())).resolves.toMatchObject({
      ok: true,
      value: { backend: 'llm', model: 'other-model' },
    })
    await expect(handler(TRANSLATION_RPC.settingsWrite, { backend: 'nonsense' }, signal()))
      .resolves.toMatchObject({ ok: false, error: { code: 'translation/bad-request' } })
  })

  it('keeps provider diagnostics out of error messages', async () => {
    const llm = llmOf({
      prepareError: config => {
        if (config.reasoningEffort === 'low') {
          const error = new Error('secret provider detail') as Error & { code: string }
          error.code = 'PROVIDER_DOWN'
          throw error
        }
        return undefined
      },
    })
    const route = createLlmTranslationRoute(() => CONFIG, () => llm)
    const failure = await route.translate({
      text: 'hello', provider: 'opencode-go', model: 'deepseek-v4.1-flash', targetLanguage: 'zh',
    }, signal()).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(TranslationRouteError)
    expect((failure as TranslationRouteError).code).toBe('translation/request-failed')
    expect((failure as Error).message).not.toContain('secret')
  })
})
