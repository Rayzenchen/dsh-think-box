import { describe, expect, it, vi } from 'vitest'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { createHostTranslationFace } from '../src/client/host-translation.ts'
import { TranslationFailure } from '../src/client/reasoningTranslation.ts'
import { TRANSLATION_RPC, TRANSLATION_RPC_CHANNEL } from '../src/translation-protocol.ts'

type Result = { ok: true, value: unknown } | { ok: false, error: { code: string, message: string } }

function connectionOf(handler: (endpoint: string, payload: unknown) => Result): {
  connection: ConnectionHandle
  call: ReturnType<typeof vi.fn>
} {
  const call = vi.fn(async (_channel: string, endpoint: string, payload: unknown) => handler(endpoint, payload))
  return { connection: { rpc: { call } } as unknown as ConnectionHandle, call }
}

const PLAN = {
  provider: 'opencode-go',
  model: 'deepseek-v4.1-flash',
  maxTextChars: 4000,
  targetLanguage: 'auto',
}

const signal = (): AbortSignal => new AbortController().signal

describe('createHostTranslationFace', () => {
  it('resolves auto to the active UI language', async () => {
    const { connection, call } = connectionOf(() => ({ ok: true, value: PLAN }))
    const face = createHostTranslationFace(connection, () => 'zh')
    await expect(face.prepare(signal())).resolves.toEqual({
      provider: 'opencode-go',
      model: 'deepseek-v4.1-flash',
      targetLanguage: 'zh',
      maxTextChars: 4000,
    })
    expect(call).toHaveBeenCalledWith(TRANSLATION_RPC_CHANNEL, TRANSLATION_RPC.plan, {}, expect.any(AbortSignal))
  })

  it('reuses the accepted plan for a few seconds', async () => {
    const { connection, call } = connectionOf(() => ({ ok: true, value: PLAN }))
    const face = createHostTranslationFace(connection, () => 'zh')
    await face.prepare(signal())
    await face.prepare(signal())
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('translates fragments and caches identical requests', async () => {
    const { connection, call } = connectionOf((endpoint) => {
      if (endpoint === TRANSLATION_RPC.plan) return { ok: true, value: PLAN }
      return { ok: true, value: '你好' }
    })
    const face = createHostTranslationFace(connection, () => 'zh')
    const plan = await face.prepare(signal())
    await expect(face.translate('hello', plan, 'session-1', signal())).resolves.toBe('你好')
    await expect(face.translate('hello', plan, 'session-1', signal())).resolves.toBe('你好')
    expect(call).toHaveBeenCalledTimes(2)
    const translateCall = call.mock.calls.find(([, endpoint]) => endpoint === TRANSLATION_RPC.translate)
    expect(translateCall?.[2]).toMatchObject({ text: 'hello', sessionId: 'session-1' })
  })

  it('maps rejected envelopes to translation failures', async () => {
    const { connection } = connectionOf(() => ({
      ok: false,
      error: { code: 'translation/route-unavailable', message: 'route is unavailable' },
    }))
    const face = createHostTranslationFace(connection, () => 'zh')
    const failure = await face.prepare(signal()).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(TranslationFailure)
    expect((failure as TranslationFailure).code).toBe('translation/route-unavailable')
  })
})
