/**
 * Host half: the Plugins-page card reads the resolved profile config and
 * writes it back through `configEditor`; volatile fields make the write land in
 * the running plugin without re-activating the entry.
 *
 * These tests fake the two 0.2.x services (`configEditor`, `webServer`) and the
 * Loader entry, because the real ones only exist inside a running dsh profile.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, ConnectionRpcHandlerOptions } from '@deepseek-ai/dsh-client-connection'
import { afterEach, describe, expect, it } from 'vitest'
import type { StreamConfig, Volatile } from '../src/config.ts'
import { STREAM_PACKAGE_NAME, STREAM_PACKAGE_VERSION } from '../src/package-meta.ts'
import { apply, Config, type Config as ResolvedConfig } from '../src/plugin.ts'
import { STREAM_SETTINGS_RPC, STREAM_SETTINGS_RPC_CHANNEL } from '../src/settings-api.ts'
import {
  DEFAULT_STREAM_SETTINGS,
  STREAM_SETTINGS_NS,
  type StreamDebugTuning,
} from '../src/settings.ts'

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
  readonly inherited: Record<string, unknown>

  constructor(readonly entry: FakeEntry, inherited: Record<string, unknown> = {}) {
    this.inherited = inherited
  }

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
    controlScroll: ref(withDefaults.controlScroll),
    preset: ref(withDefaults.preset),
    motionPreference: ref(withDefaults.motionPreference),
    thinkAutoExpand: ref(withDefaults.thinkAutoExpand),
    logarithmicFade: ref(withDefaults.logarithmicFade),
    debugEnabled: ref(withDefaults.debugEnabled),
    debugTuning: ref({ ...withDefaults.debugTuning }),
  }
}

const tempProfiles = new Set<string>()

afterEach(() => {
  for (const directory of tempProfiles) rmSync(directory, { recursive: true, force: true })
  tempProfiles.clear()
})

function profileBaseUrl(specifier: string, bundled = true): string {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-think-box-profile-'))
  tempProfiles.add(directory)
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    name: 'dsh-profile-test',
    private: true,
    dsh: { profile: { bundles: bundled ? [STREAM_PACKAGE_NAME] : [] } },
    dependencies: { [STREAM_PACKAGE_NAME]: specifier },
  }), 'utf8')
  return `${pathToFileURL(directory).href}/`
}

interface HostOptions {
  /** Raw profile-patch config handed to the Loader. */
  rawConfig?: unknown
  /** Persisted profile row the entry carries before this write. */
  entryConfig?: Record<string, unknown>
  /** Inherited bundle-layer config merged into the write callback. */
  inherited?: Record<string, unknown>
  /** Omit the config editor to model a kernel that cannot persist profile rows. */
  withEditor?: boolean
  /** Provide the web server (boot snapshot + direct channel route). */
  withWebServer?: boolean
  /** Provide the core settings service (page-policy call is recorded). */
  withSettings?: boolean
  /** Make the profile write reject. */
  failWrite?: boolean
  baseUrl?: string
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
  debugRead(): ReturnType<ConnectionRpcHandler>
  debugWrite(payload: unknown): ReturnType<ConnectionRpcHandler>
  upgrade(): ReturnType<ConnectionRpcHandler>
}

const signal = (): AbortSignal => new AbortController().signal

async function mountHost(options: HostOptions = {}): Promise<Host> {
  const ctx = new Context()
  ctx.baseUrl = options.baseUrl ?? `${pathToFileURL(process.cwd()).href}/`
  const entry: FakeEntry = {
    options: { id: 'think-box', name: STREAM_PACKAGE_NAME, config: options.entryConfig ?? {} },
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
  if (web === undefined) {
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
    if (registration === undefined) throw new Error('smooth-stream RPC was not registered')
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
    debugRead: () => handler()(STREAM_SETTINGS_RPC.debugRead, {}, signal()),
    debugWrite: payload => handler()(STREAM_SETTINGS_RPC.debugWrite, payload, signal()),
    upgrade: () => handler()(STREAM_SETTINGS_RPC.upgrade, {}, signal()),
  }
}

describe('smooth-stream host settings', () => {
  it('reads the resolved profile config and reports the card writable', async () => {
    const increment: Partial<StreamDebugTuning> = { springDamping: 31 }
    const host = await mountHost({
      baseUrl: profileBaseUrl(`link:${process.cwd()}`),
      rawConfig: { preset: 'balanced', enabled: false, debugTuning: { ...DEFAULT_STREAM_SETTINGS.debugTuning, ...increment } },
    })
    const read = await host.read()
    expect(read).toMatchObject({
      ok: true,
      value: {
        version: STREAM_PACKAGE_VERSION,
        installation: 'development',
        writable: true,
        enabled: false,
        controlScroll: DEFAULT_STREAM_SETTINGS.controlScroll,
        preset: 'balanced',
        motionPreference: DEFAULT_STREAM_SETTINGS.motionPreference,
        thinkAutoExpand: DEFAULT_STREAM_SETTINGS.thinkAutoExpand,
        logarithmicFade: DEFAULT_STREAM_SETTINGS.logarithmicFade,
        canUpgrade: false,
      },
    })
    await host.fiber.dispose()
  })

  it('writes the complete preference snapshot into the entry and keeps composition seeds', async () => {
    const host = await mountHost({
      rawConfig: { preset: 'balanced' },
      entryConfig: { mode: 'teleprompter', translation: { backend: 'llm', model: 'seed-model' } },
      inherited: {
        translation: { backend: 'bundle', provider: 'seed-provider', model: 'inherited-model' },
        revealCharsPerSec: 60,
      },
    })
    const written = await host.write({
      enabled: false,
      controlScroll: false,
      thinkAutoExpand: false,
      logarithmicFade: false,
      preset: 'silky',
      motionPreference: 'force-smooth',
    })
    expect(written).toMatchObject({
      ok: true,
      value: { enabled: false, controlScroll: false, thinkAutoExpand: false, logarithmicFade: false, preset: 'silky', motionPreference: 'force-smooth' },
    })
    expect(host.editor?.editCalls).toBe(1)
    // The write callback replaces the entry config wholesale, so it must merge
    // the inherited bundle layer and the existing profile row first: the
    // translation seed and the ordinary composition fields stay intact.
    expect(host.editor?.persisted).toMatchObject({
      revealCharsPerSec: 60,
      translation: { backend: 'llm', model: 'seed-model' },
      enabled: false,
      controlScroll: false,
      thinkAutoExpand: false,
      logarithmicFade: false,
      preset: 'silky',
      motionPreference: 'force-smooth',
    })
    await host.fiber.dispose()
  })

  it('writes the diagnostics pair through the debug endpoint', async () => {
    const host = await mountHost()
    const tuning = { ...DEFAULT_STREAM_SETTINGS.debugTuning, springMass: 2 }
    const written = await host.debugWrite({ debugEnabled: true, tuning })
    expect(written).toMatchObject({ ok: true, value: { debugEnabled: true, tuning: { springMass: 2 } } })
    expect(host.editor?.persisted).toMatchObject({ debugEnabled: true, debugTuning: { springMass: 2 } })
    const read = await host.debugRead()
    expect(read).toMatchObject({ ok: true, value: { debugEnabled: true, tuning: { springMass: 2 } } })
    await host.fiber.dispose()
  })

  it('stays readable but rejects writes when no config editor exists', async () => {
    const host = await mountHost({ withEditor: false })
    const read = await host.read()
    expect(read).toMatchObject({ ok: true, value: { writable: false } })
    const written = await host.write({ enabled: false, controlScroll: true, thinkAutoExpand: true })
    expect(written).toMatchObject({ ok: false, error: { code: 'settings-rejected' } })
    const debug = await host.debugWrite({
      debugEnabled: true,
      tuning: DEFAULT_STREAM_SETTINGS.debugTuning,
    })
    expect(debug).toMatchObject({ ok: false, error: { code: 'settings-rejected' } })
    await host.fiber.dispose()
  })

  it('rejects a failed profile write and keeps the previous values', async () => {
    const host = await mountHost({ failWrite: true })
    const written = await host.write({ enabled: false, controlScroll: true, thinkAutoExpand: true })
    expect(written).toMatchObject({ ok: false, error: { code: 'settings-rejected' } })
    const read = await host.read()
    expect(read).toMatchObject({ ok: true, value: { enabled: DEFAULT_STREAM_SETTINGS.enabled } })
    await host.fiber.dispose()
  })

  it('validates every write field before persisting', async () => {
    const host = await mountHost()
    const cases: unknown[] = [
      { enabled: true, controlScroll: true },
      { enabled: true, controlScroll: true, thinkAutoExpand: 'false' },
      { enabled: true, controlScroll: true, thinkAutoExpand: true, preset: 'wide' },
      { enabled: true, controlScroll: true, thinkAutoExpand: true, motionPreference: 'shake' },
      { enabled: true, controlScroll: true, thinkAutoExpand: true, logarithmicFade: 'yes' },
      { enabled: true, controlScroll: true, thinkAutoExpand: true, debugEnabled: true },
      { enabled: true, controlScroll: true, thinkAutoExpand: true, debugEnabled: true, debugTuning: { ...DEFAULT_STREAM_SETTINGS.debugTuning, springMass: 99 } },
    ]
    for (const payload of cases) {
      expect(await host.write(payload)).toMatchObject({ ok: false, error: { code: 'settings-rejected' } })
    }
    expect(host.editor?.editCalls).toBe(0)
    await host.fiber.dispose()
  })

  it('turns off the auto-generated settings page for this entry', async () => {
    const host = await mountHost({ withSettings: true })
    expect(host.settingsCalls).toHaveLength(1)
    expect(host.settingsCalls[0]?.presentation).toEqual({ auto: false })
    // `ctx.plugin()` hands back a Fiber handle whose context is the owning
    // instance's context; the policy must be registered against that instance.
    const owner = host.settingsCalls[0]?.owner as { ctx?: { fiber?: unknown } }
    const handle = host.fiber as unknown as { ctx?: { fiber?: unknown } }
    expect(owner?.ctx === handle?.ctx).toBe(true)
    await host.fiber.dispose()
  })

  it('injects a plain boot snapshot without config references', async () => {
    const host = await mountHost({
      rawConfig: { mode: 'teleprompter', preset: 'realtime', enabled: false },
      withWebServer: true,
    })
    const html = host.web?.bootHtml() ?? ''
    expect(html).toContain('window["__DSH_SMOOTH_STREAM_CONFIG__"]=')
    const serialized = /window\["__DSH_SMOOTH_STREAM_CONFIG__"\]=(.*?)<\/script>/s.exec(html)?.[1]
    expect(serialized).toBeDefined()
    const snapshot = JSON.parse(serialized as string) as Record<string, unknown>
    expect(snapshot).toMatchObject({
      mode: 'teleprompter',
      preset: 'realtime',
      enabled: false,
      controlScroll: DEFAULT_STREAM_SETTINGS.controlScroll,
    })
    // A reference would serialize as `{}`; every snapshot value must be data.
    expect(typeof snapshot.enabled).toBe('boolean')
    expect(snapshot.debugTuning).toMatchObject({ springMass: DEFAULT_STREAM_SETTINGS.debugTuning.springMass })
    expect(host.web?.routes.some(route => (route as { path?: string }).path === STREAM_SETTINGS_RPC_CHANNEL)).toBe(true)
    await host.fiber.dispose()
  })

  it('reads the running package version from its manifest', () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { name: string; version: string }
    expect(STREAM_PACKAGE_NAME).toBe(manifest.name)
    expect(STREAM_PACKAGE_VERSION).toBe(manifest.version)
  })

  it('enables the upgrade action only for a confirmed npm profile dependency', async () => {
    for (const [specifier, bundled, expected] of [
      ['^0.1.0', true, { installation: 'npm', canUpgrade: true }],
      [`npm:${STREAM_PACKAGE_NAME}@^0.1.0`, true, { installation: 'npm', canUpgrade: true }],
      [`npm:${STREAM_PACKAGE_NAME}@file:../think-box`, true, { installation: 'unmanaged', canUpgrade: false }],
      ['workspace:*', true, { installation: 'unmanaged', canUpgrade: false }],
      ['^0.1.0', false, { installation: 'unmanaged', canUpgrade: false }],
    ] as const) {
      const host = await mountHost({ baseUrl: profileBaseUrl(specifier, bundled) })
      expect(await host.read()).toMatchObject({ ok: true, value: expected })
      await host.fiber.dispose()
    }
  })

  it('rejects an upgrade on a non-npm installation', async () => {
    const host = await mountHost({ baseUrl: profileBaseUrl(`link:${process.cwd()}`) })
    expect(await host.upgrade()).toMatchObject({ ok: false, error: { code: 'internal' } })
    await host.fiber.dispose()
  })

  it('applies without the optional services present', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({ apply: (runtimeCtx: Context) => { apply(runtimeCtx, resolveConfig()) } })
    await fiber.await()
    await fiber.dispose()
  })

  it('keeps the settings namespace out of the core settings registry', async () => {
    const host = await mountHost()
    const settings = host.ctx.get('settings') as { describe?: () => Array<{ ns: string }> } | undefined
    expect(settings?.describe?.().map(row => row.ns) ?? []).not.toContain(STREAM_SETTINGS_NS)
    await host.fiber.dispose()
  })
})
