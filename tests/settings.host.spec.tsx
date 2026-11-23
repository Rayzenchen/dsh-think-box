/**
 * Host half: the Plugins-page card reads the resolved profile config and
 * writes it back through `configEditor`; volatile fields make the write land in
 * the running plugin without re-activating the entry.
 *
 * These tests fake the 0.2.x services (`configEditor`, `webServer`,
 * `connection`) and the Loader entry, because the real ones only exist inside a
 * running dsh profile.
 */

import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, ConnectionRpcHandlerOptions } from '@deepseek-ai/dsh-client-connection'
import { afterEach, describe, expect, it } from 'vitest'
import type { StreamConfig, Volatile } from '../src/config.ts'
import { apply, Config, type Config as ResolvedConfig } from '../src/plugin.ts'
import { STREAM_SETTINGS_RPC } from '../src/settings-api.ts'

/** One recorded RPC registration, so a test can drive the handler directly. */
interface RpcRegistration {
  channel: string
  handler: ConnectionRpcHandler
  options: ConnectionRpcHandlerOptions
}

/** Fake Loader entry the plugin's fiber/settings write targets. */
interface FakeEntry {
  options: { id: string; name?: string; config?: unknown }
}

/** In-memory stand-in for the 0.2.x `configEditor` service. */
class FakeConfigEditor {
  editCalls = 0
  persisted: Record<string, unknown> | undefined
  fail = false

  constructor(readonly entry: FakeEntry, readonly inherited: Record<string, unknown> = {}) {}

  entries(): FakeEntry[] {
    return [this.entry]
  }

  async edit(
    entry: FakeEntry,
    change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<void> {
    this.editCalls += 1
    const current = { ...(entry.options.config as Record<string, unknown> | undefined) }
    const next = change(current, this.inherited)
    if (this.fail) throw new Error('profile write failed')
    this.persisted = next
    entry.options.config = next
  }
}

/** Fake web server that records index taps and mounted routes. */
function fakeWebServer(): {
  service: {
    tapIndex(tap: (html: string) => string): () => void
    register(route: unknown): () => void
  }
  bootHtml: () => string
  routes: unknown[]
} {
  let tap: ((html: string) => string) | undefined
  const routes: unknown[] = []
  return {
    service: {
      tapIndex(next): () => void { tap = next; return () => { tap = undefined } },
      register(route): () => void {
        routes.push(route)
        return () => { routes.splice(routes.indexOf(route), 1) }
      },
    },
    bootHtml: () => tap?.('<html><body></body></html>') ?? '',
    routes,
  }
}

/** Symbol the host Loader uses to commit a new volatile snapshot. */
const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

/** Stable config reference, shaped like the host Schemastery's volatile output. */
function ref<T>(value: T): Volatile<T> {
  let current = value
  return {
    get: () => current,
    [VOLATILE_WRITE]: (next: unknown) => { current = next as T },
  } as unknown as Volatile<T>
}

/**
 * Resolve raw profile config like the deployed Loader does: defaults filled,
 * preference fields as stable references. The pinned test dependency
 * (schemastery 3.18) predates native `.volatile()` wrapping, so the references
 * are built here; the deployed 0.2.2 host creates the identical shape.
 */
function resolveConfig(raw: unknown = {}): ResolvedConfig {
  const withDefaults = Config(raw as never) as unknown as StreamConfig
  return {
    ...withDefaults,
    enabled: ref(withDefaults.enabled),
    thinkAutoExpand: ref(withDefaults.thinkAutoExpand),
  }
}

const disposers: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose()
})

interface HostOptions {
  rawConfig?: unknown
  entryConfig?: Record<string, unknown>
  inherited?: Record<string, unknown>
  withEditor?: boolean
  withWebServer?: boolean
  withSettings?: boolean
  withConnection?: boolean
  failWrite?: boolean
}

interface Host {
  ctx: Context
  fiber: ReturnType<Context['plugin']>
  editor?: FakeConfigEditor
  registration?: RpcRegistration
  web?: ReturnType<typeof fakeWebServer>
  settingsCalls: Array<{ presentation: { auto?: boolean }; owner: unknown }>
  read(): ReturnType<ConnectionRpcHandler>
  write(payload: unknown): ReturnType<ConnectionRpcHandler>
  unknown(): ReturnType<ConnectionRpcHandler>
}

const signal = (): AbortSignal => new AbortController().signal

async function mountHost(options: HostOptions = {}): Promise<Host> {
  const ctx = new Context()
  const entry: FakeEntry = {
    options: { id: 'think-box', name: '@local/dsh-think-box', config: options.entryConfig ?? {} },
  }
  const editor = options.withEditor === false
    ? undefined
    : new FakeConfigEditor(entry, options.inherited)
  if (editor !== undefined) {
    editor.fail = options.failWrite === true
    ctx.provide('configEditor', editor as never)
  }
  const web = options.withWebServer === true ? fakeWebServer() : undefined
  if (web !== undefined) ctx.provide('webServer', web.service as never)
  const settingsCalls: Array<{ presentation: { auto?: boolean }; owner: unknown }> = []
  if (options.withSettings === true) {
    ctx.provide('settings', {
      configure(presentation: { auto?: boolean }, owner: unknown): () => void {
        settingsCalls.push({ presentation, owner })
        return () => {}
      },
    } as never)
  }
  let registration: RpcRegistration | undefined
  if (web === undefined && options.withConnection !== false) {
    ctx.provide('connection', {
      rpc: {
        handle(channel: string, handler: ConnectionRpcHandler, rpcOptions: ConnectionRpcHandlerOptions): () => Promise<void> {
          registration = { channel, handler, options: rpcOptions }
          return async () => {}
        },
      },
    } as never)
  }
  const resolved = resolveConfig(options.rawConfig)
  const fiber = ctx.plugin({ apply: (runtimeCtx: Context) => { apply(runtimeCtx, resolved) } })
  await fiber.await()
  const handler = (): ConnectionRpcHandler => {
    if (registration === undefined) throw new Error('settings RPC was not registered')
    return registration.handler
  }
  return {
    ctx,
    fiber,
    ...(editor === undefined ? {} : { editor }),
    ...(registration === undefined ? {} : { registration }),
    ...(web === undefined ? {} : { web }),
    settingsCalls,
    read: () => handler()(STREAM_SETTINGS_RPC.read, {}, signal()),
    write: payload => handler()(STREAM_SETTINGS_RPC.write, payload, signal()),
    unknown: () => handler()('debug.read', {}, signal()),
  }
}

describe('think-box host settings', () => {
  it('reads the three-field view and reports the card writable', async () => {
    const host = await mountHost({ rawConfig: { enabled: false, thinkAutoExpand: true } })
    disposers.push(host.fiber.dispose)
    const read = await host.read()
    expect(read).toMatchObject({
      ok: true,
      value: { writable: true, enabled: false, thinkAutoExpand: true },
    })
    // The old engine/installation fields are gone from the wire.
    const value = (read as { value?: Record<string, unknown> }).value ?? {}
    expect(value).not.toHaveProperty('version')
    expect(value).not.toHaveProperty('installation')
    expect(value).not.toHaveProperty('preset')
    expect(value).not.toHaveProperty('debugEnabled')
  })

  it('writes the new shape and drops legacy profile fields on first save', async () => {
    const host = await mountHost({
      rawConfig: { enabled: true },
      entryConfig: {
        mode: 'teleprompter',
        preset: 'silky',
        controlScroll: false,
        logarithmicFade: false,
        translation: { backend: 'llm', provider: 'seed', model: 'seed-model' },
        enabled: true,
        thinkAutoExpand: false,
      },
    })
    disposers.push(host.fiber.dispose)
    const written = await host.write({ enabled: false, thinkAutoExpand: true })
    expect(written).toMatchObject({ ok: true, value: { enabled: false, thinkAutoExpand: true } })
    expect(host.editor?.editCalls).toBe(1)
    expect(host.editor?.persisted).toEqual({
      enabled: false,
      thinkAutoExpand: true,
      translation: { backend: 'llm', provider: 'seed', model: 'seed-model' },
    })
  })

  it('keeps the inherited translation seed when the profile row has none', async () => {
    const host = await mountHost({
      entryConfig: { enabled: true },
      inherited: { thinkAutoExpand: false, translation: { backend: 'bundle', provider: 'inherited', model: 'm' } },
    })
    disposers.push(host.fiber.dispose)
    await host.write({ enabled: false, thinkAutoExpand: true })
    expect(host.editor?.persisted).toMatchObject({
      enabled: false,
      thinkAutoExpand: true,
      translation: { backend: 'bundle', provider: 'inherited', model: 'm' },
    })
  })

  it('stays readable but rejects writes without a config editor entry', async () => {
    const host = await mountHost({ withEditor: false })
    disposers.push(host.fiber.dispose)
    expect(await host.read()).toMatchObject({ ok: true, value: { writable: false } })
    expect(await host.write({ enabled: false, thinkAutoExpand: false })).toMatchObject({
      ok: false,
      error: { code: 'settings-rejected' },
    })
  })

  it('rejects every malformed payload before touching the profile', async () => {
    const host = await mountHost()
    disposers.push(host.fiber.dispose)
    const bad: unknown[] = [
      null,
      [],
      { enabled: 'yes' },
      { thinkAutoExpand: 1 },
      { enabled: false, thinkAutoExpand: 'no' },
    ]
    for (const payload of bad) {
      const result = await host.write(payload)
      expect(result).toMatchObject({ ok: false, error: { code: 'settings-rejected' } })
    }
    expect(host.editor?.editCalls).toBe(0)
  })

  it('leaves the live references untouched when the profile write fails', async () => {
    const host = await mountHost({ failWrite: true, rawConfig: { enabled: true, thinkAutoExpand: true } })
    disposers.push(host.fiber.dispose)
    expect(await host.write({ enabled: false, thinkAutoExpand: false })).toMatchObject({
      ok: false,
      error: { code: 'settings-rejected' },
    })
    expect(await host.read()).toMatchObject({ ok: true, value: { enabled: true, thinkAutoExpand: true } })
  })

  it('commits the accepted write into the volatile references for the response', async () => {
    const host = await mountHost({ rawConfig: { enabled: true, thinkAutoExpand: true } })
    disposers.push(host.fiber.dispose)
    await host.write({ enabled: false, thinkAutoExpand: false })
    expect(await host.read()).toMatchObject({ ok: true, value: { enabled: false, thinkAutoExpand: false } })
  })

  it('reports unknown endpoints as an internal error', async () => {
    const host = await mountHost()
    disposers.push(host.fiber.dispose)
    expect(await host.unknown()).toMatchObject({ ok: false, error: { code: 'internal' } })
  })

  it('injects a plain boot snapshot with only the three fields', async () => {
    const host = await mountHost({ withWebServer: true })
    disposers.push(host.fiber.dispose)
    const html = host.web?.bootHtml() ?? ''
    expect(html).toContain('__DSH_SMOOTH_STREAM_CONFIG__')
    const payload = JSON.parse(/window\[[^\]]+\]=(\{.*?\})<\/script>/.exec(html)?.[1] ?? '{}') as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['enabled', 'thinkAutoExpand', 'translation'])
    expect(payload).toMatchObject({ enabled: true, thinkAutoExpand: true })
  })

  it('disables the auto-generated settings page for this entry', async () => {
    const host = await mountHost({ withSettings: true })
    disposers.push(host.fiber.dispose)
    expect(host.settingsCalls).toHaveLength(1)
    expect(host.settingsCalls[0]?.presentation).toEqual({ auto: false })
    // The owner is this plugin's fiber; its internals are proxies that throw
    // when inspected, so only presence/identity shape is asserted here.
    expect(host.settingsCalls[0]?.owner).toBeDefined()
  })

  it('applies without any optional services', async () => {
    const host = await mountHost({ withEditor: false, withConnection: false })
    disposers.push(host.fiber.dispose)
    expect(host.ctx.get('configEditor')).toBeUndefined()
  })
})

describe('plugin Config schema', () => {
  it('fills the three defaults when the overlay config is omitted', () => {
    const resolved = Config({} as never) as unknown as StreamConfig
    expect(resolved).toMatchObject({ enabled: true, thinkAutoExpand: true })
    expect(resolved.translation).toMatchObject({ backend: 'bundle' })
  })

  it('accepts a full override and ignores legacy engine keys', () => {
    const resolved = Config({
      enabled: false,
      thinkAutoExpand: false,
      translation: { backend: 'llm', provider: 'p', model: 'm' },
      mode: 'teleprompter',
      preset: 'silky',
      debugEnabled: true,
    } as never) as unknown as StreamConfig
    expect(resolved).toMatchObject({
      enabled: false,
      thinkAutoExpand: false,
      translation: { backend: 'llm', provider: 'p', model: 'm' },
    })
  })

  it('rejects a non-boolean preference', () => {
    expect(() => Config({ enabled: 'yes' } as never)).toThrow()
    expect(() => Config({ thinkAutoExpand: 1 } as never)).toThrow()
  })
})
