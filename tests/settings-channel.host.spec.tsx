/**
 * Host half mounts its settings channel even when the kernel's own
 * `connection.rpc.handle()` cannot resolve `webServer` from inside that
 * service. The browser then reaches the card instead of reporting the
 * connection as unable to read plugin settings.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, ConnectionRpcHandlerOptions } from '@deepseek-ai/dsh-client-connection'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import * as DshSettings from '@deepseek-ai/dsh-settings'
const { SettingsProvider } = DshSettings
type SettingsNamespace = DshSettings.SettingsNamespace
import { afterEach, describe, expect, it } from 'vitest'
import type { StreamConfig, Volatile } from '../src/config.ts'
import { apply, Config } from '../src/plugin.ts'
import { STREAM_SETTINGS_RPC, STREAM_SETTINGS_RPC_CHANNEL } from '../src/settings-api.ts'
import { DEFAULT_STREAM_SETTINGS } from '../src/settings.ts'
import { TRANSLATION_RPC, TRANSLATION_RPC_CHANNEL } from '../src/translation-protocol.ts'

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
 * Resolve the packageless default config into the shape the deployed Loader
 * hands to `apply`: preference fields are stable references. The pinned test
 * schemastery predates native `.volatile()` wrapping, so it is built here.
 * @returns resolved plugin config.
 */
function resolveConfig(): Config {
  const withDefaults = Config({}) as unknown as StreamConfig
  return {
    ...withDefaults,
    enabled: ref(withDefaults.enabled),
    thinkAutoExpand: ref(withDefaults.thinkAutoExpand),
  } as unknown as Config
}

/** In-memory settings provider -- same shape as the Harness's own specs. */
class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

/** One recorded reply, so a route can be driven without a real socket. */
interface Exchange {
  status: number
  body: string
}

/** Web server stand-in that records routes and drops them on disposal. */
function fakeWebServer(routes: WebRoute[]): {
  register(route: WebRoute): () => void
  tapIndex(): () => void
} {
  return {
    register(route: WebRoute): () => void {
      routes.push(route)
      return () => {
        const index = routes.indexOf(route)
        if (index >= 0) routes.splice(index, 1)
      }
    },
    tapIndex(): () => void { return () => {} },
  }
}

/**
 * Mount the Host half over a connection service whose `rpc.handle()` fails the
 * way the broken kernel generation does.
 * @param fenced - whether the fake connection also exposes its request fence.
 */
async function mountHost(fenced: boolean): Promise<{
  ctx: Context
  routes: WebRoute[]
  persisted: () => Record<string, unknown> | undefined
  dispose: () => Promise<void>
}> {
  const ctx = new Context()
  ctx.baseUrl = `${pathToFileURL(process.cwd()).href}/`
  const routes: WebRoute[] = []
  ctx.provide('webServer', fakeWebServer(routes) as never)
  // 0.2.x persistence path: the card writes the profile entry through the
  // config editor service instead of a settings namespace.
  const entry = { options: { id: 'think-box', name: '@local/dsh-think-box', config: {} } }
  let persisted: Record<string, unknown> | undefined
  ctx.provide('configEditor', {
    entries: () => [entry],
    async edit(target: typeof entry, change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>) {
      const next = change({ ...(target.options.config as Record<string, unknown>) }, {})
      persisted = next
      target.options.config = next
    },
  } as never)
  ctx.provide('connection', {
    rpc: {
      handle(_channel: string, _handler: ConnectionRpcHandler, _options: ConnectionRpcHandlerOptions): () => Promise<void> {
        throw new Error('cannot get property "webServer" without inject')
      },
    },
    ...fenced
      ? {
        requestRejection(request: unknown): 401 | undefined {
          return (request as IncomingMessage).headers.cookie === undefined ? 401 : undefined
        },
      }
      : {},
  } as never)
  await ctx.plugin(MemorySettings).await()
  const fiber = ctx.plugin({ apply: (runtimeCtx: Context) => { apply(runtimeCtx, resolveConfig()) } })
  await fiber.await()
  return { ctx, routes, persisted: () => persisted, dispose: () => fiber.dispose() }
}

const mounted: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const dispose of mounted.splice(0)) await dispose()
})

/** Drive one route with a request envelope and capture the reply. */
async function call(
  route: WebRoute,
  endpoint: string,
  payload: unknown,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<Exchange> {
  const method = options.method ?? 'POST'
  const headers = options.headers ?? { 'content-type': 'application/json', cookie: 'dsh=browser' }
  const body = options.body
    ?? JSON.stringify({ type: 'client-request', rpcId: 'probe-1', method: endpoint, payload })
  const req = Readable.from([Buffer.from(body)]) as unknown as IncomingMessage
  req.method = method
  req.url = `${route.path}/${endpoint}`
  req.headers = headers
  const state: Exchange = { status: 0, body: '' }
  const res = {
    writeHead(status: number) { state.status = status; return res },
    end(value?: string) { state.body = value ?? '' },
    on() { return res },
  } as unknown as ServerResponse
  await route.handler(req, res)
  return state
}

describe('smooth-stream settings channel fallback', () => {
  it('mounts the channel directly when the connection service cannot, and serves the settings', async () => {
    const host = await mountHost(true)
    mounted.push(host.dispose)

    const route = host.routes.find(candidate => candidate.path === STREAM_SETTINGS_RPC_CHANNEL)
    expect(route).toMatchObject({ kind: 'prefix', path: STREAM_SETTINGS_RPC_CHANNEL })

    const read = await call(route as WebRoute, STREAM_SETTINGS_RPC.read, {})
    expect(read.status).toBe(200)
    expect(JSON.parse(read.body)).toEqual({
      type: 'server-response',
      rpcId: 'probe-1',
      result: {
        ok: true,
        value: {
          writable: true,
          enabled: DEFAULT_STREAM_SETTINGS.enabled,
          thinkAutoExpand: DEFAULT_STREAM_SETTINGS.thinkAutoExpand,
        },
      },
    })

    const write = await call(route as WebRoute, STREAM_SETTINGS_RPC.write, {
      enabled: false,
      thinkAutoExpand: true,
    })
    expect(JSON.parse(write.body)).toMatchObject({
      result: { ok: true, value: { enabled: false, thinkAutoExpand: true } },
    })
    expect(host.persisted()).toMatchObject({ enabled: false, thinkAutoExpand: true })

    await host.dispose()
    mounted.pop()
    expect(host.routes).toEqual([])
  })

  it('keeps the connection request fence and the router rules on the direct route', async () => {
    const host = await mountHost(true)
    mounted.push(host.dispose)
    const route = host.routes.find(candidate => candidate.path === STREAM_SETTINGS_RPC_CHANNEL) as WebRoute

    const anonymous = await call(route, STREAM_SETTINGS_RPC.read, {}, { headers: { 'content-type': 'application/json' } })
    expect(anonymous).toEqual({ status: 401, body: 'unauthorized' })

    const wrongMethod = await call(route, STREAM_SETTINGS_RPC.read, {}, { method: 'GET' })
    expect(wrongMethod.status).toBe(404)

    const wrongType = await call(route, STREAM_SETTINGS_RPC.read, {}, { headers: { 'content-type': 'text/plain', cookie: 'dsh=browser' } })
    expect(wrongType.status).toBe(415)

    const notJson = await call(route, STREAM_SETTINGS_RPC.read, {}, { body: 'not json' })
    expect(notJson.status).toBe(400)

    const mismatched = await call(route, STREAM_SETTINGS_RPC.read, {}, {
      body: JSON.stringify({ type: 'client-request', rpcId: 'probe-2', method: 'settings.write', payload: {} }),
    })
    expect(JSON.parse(mismatched.body)).toMatchObject({
      rpcId: 'probe-2',
      result: { ok: false, error: { code: 'gateway/bad-request' } },
    })

    const malformed = await call(route, STREAM_SETTINGS_RPC.read, {}, { body: JSON.stringify({ rpcId: 7 }) })
    expect(JSON.parse(malformed.body)).toMatchObject({
      rpcId: 'invalid-request',
      result: { ok: false, error: { code: 'gateway/bad-request' } },
    })
  })

  it('rejects the removed debug and upgrade endpoints as unknown', async () => {
    const host = await mountHost(true)
    mounted.push(host.dispose)
    const route = host.routes.find(candidate => candidate.path === STREAM_SETTINGS_RPC_CHANNEL) as WebRoute
    for (const endpoint of ['debug.read', 'debug.write', 'plugin.upgrade']) {
      const reply = await call(route, endpoint, {})
      expect(JSON.parse(reply.body)).toMatchObject({
        result: { ok: false, error: { code: 'internal' } },
      })
    }
  })

  it('keeps the translation channel and its four endpoints', async () => {
    const host = await mountHost(true)
    mounted.push(host.dispose)
    const route = host.routes.find(candidate => candidate.path === TRANSLATION_RPC_CHANNEL)
    expect(route).toMatchObject({ kind: 'prefix', path: TRANSLATION_RPC_CHANNEL })
    const read = await call(route as WebRoute, TRANSLATION_RPC.settingsRead, {})
    const reply = JSON.parse(read.body) as { result?: { ok?: boolean; value?: Record<string, unknown> } }
    expect(reply.result?.ok).toBe(true)
    expect(typeof reply.result?.value?.backend).toBe('string')
    expect(typeof reply.result?.value?.autoTranslate).toBe('boolean')
  })

  it('fails closed instead of exposing the channel without the connection fence', async () => {
    const host = await mountHost(false)
    mounted.push(host.dispose)
    expect(host.routes).toEqual([])
    // The plugin still applies (mountHost awaited its fiber): only the card's
    // read is unavailable on this unprotected kernel.
    expect(host.ctx.get('configEditor')).toBeDefined()
  })
})
