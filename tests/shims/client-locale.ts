/**
 * Test-only stand-in for `@deepseek-ai/dsh-client-locale/client`.
 *
 * Like the runtime package, the real locale client ships as a prebuilt
 * `window.__ModuleLoader__.load({...})` browser bundle and cannot be imported
 * under Vitest. The real `LocaleRuntime` is a plain class (not a cordis
 * Service): the locale plugin constructs it and publishes it with
 * `ctx.provide('locale', ...)`, and the tests do exactly the same, so this
 * mirror keeps that contract and implements only the surface the tests and
 * plugin touch:
 *
 * - `register(ns, { zh, en })` / `register(ns, locale, dict)` — dictionaries.
 * - `setLocale(id)` / `getLocale()` — active language and catalog snapshot.
 * - `bind(ns)` — stable per-namespace translate function.
 * - `getSnapshot()` / `subscribe(fn)` — the LocaleFace pair used by the slot
 *   renderer; kept minimal because tests render entries directly.
 *
 * Lookup chain matches the shipped runtime: active language → English →
 * the shared `common` namespace → the key itself. `{name}` placeholders are
 * interpolated from the params object.
 */
import type { Context } from '@deepseek-ai/cordis'

const FALLBACK_LOCALE = 'en'
const COMMON_NS = 'common'

/** One selectable language. */
export interface LocaleDefinition {
  readonly id: string
  readonly label: string
  readonly fallback?: string
}

/** Immutable locale state published on every change. */
export interface LocaleSnapshot {
  readonly active: string
  readonly locales: readonly LocaleDefinition[]
  readonly revision: number
}

/** Translate function handed to consumers of {@link LocaleRuntime.bind}. */
export type LocaleTranslate = (key: string, params?: Record<string, unknown>) => string

type Dict = Record<string, string>

/**
 * Browser-side locale registry mirror.
 *
 * Constructor note: the owning plugin is expected to publish the instance with
 * `ctx.provide('locale', instance)`; mirroring the real class, this constructor
 * does not register a service itself.
 */
export class LocaleRuntime {
  private readonly ctx: Context
  private readonly dicts = new Map<string, Map<string, Dict>>()
  private readonly bound = new Map<string, LocaleTranslate>()
  private readonly listeners = new Set<() => void>()
  private activeLocale = 'en'
  private revision = 0
  private snapshot: LocaleSnapshot = {
    active: 'en',
    locales: [
      { id: 'en', label: 'English' },
      { id: 'zh', label: '中文', fallback: 'en' },
    ] as readonly LocaleDefinition[],
    revision: 0,
  }

  /** @param ctx - owning context, only used for the `locale/change` event. */
  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * Register a declared namespace's dictionaries, all locales in one call.
   * @param ns - namespace.
   * @param dicts - dictionaries keyed by locale id.
   * @returns idempotent disposer removing the dictionaries.
   */
  register(ns: string, dicts: Record<string, Dict>): () => void
  /**
   * Single-locale untyped form.
   * @param ns - namespace.
   * @param locale - locale id.
   * @param dict - dictionary.
   * @returns idempotent disposer removing the dictionary.
   */
  register(ns: string, locale: string, dict: Dict): () => void
  register(ns: string, dictsOrLocale: Record<string, Dict> | string, maybeDict?: Dict): () => void {
    const entries: Array<[string, Dict]> = typeof dictsOrLocale === 'string'
      ? [[dictsOrLocale, maybeDict ?? {}]]
      : Object.entries(dictsOrLocale)
    let localeDicts = this.dicts.get(ns)
    if (localeDicts === undefined) {
      localeDicts = new Map()
      this.dicts.set(ns, localeDicts)
    }
    for (const [locale, dict] of entries) {
      // Single occupant per (namespace, locale), exactly like the shipped
      // runtime: a second owner cannot silently overwrite the first.
      if (localeDicts.has(locale)) {
        throw new Error(`locale dictionary "${ns}" already has an owner for "${locale}"`)
      }
      localeDicts.set(locale, { ...dict })
    }
    this.publish()
    return () => {
      const current = this.dicts.get(ns)
      if (current === undefined) return
      for (const [locale] of entries) current.delete(locale)
      this.publish()
    }
  }

  /**
   * Switch the active locale.
   * @param id - locale id; unknown ids keep the fallback chain resolving.
   */
  setLocale(id: string): void {
    if (this.activeLocale === id) return
    this.activeLocale = id
    this.publish()
    const ctx = this.ctx as unknown as { emit(name: string, ...args: unknown[]): void }
    ctx.emit('locale/change', this.getLocale())
  }

  /** @returns the current immutable snapshot (stable reference between changes). */
  getLocale(): LocaleSnapshot {
    return this.snapshot
  }

  /** LocaleFace getSnapshot alias. */
  getSnapshot(): LocaleSnapshot {
    return this.snapshot
  }

  /**
   * Subscribe to snapshot changes (locale switches and dictionary
   * registrations both bump the revision).
   * @param listener - change callback.
   * @returns unsubscribe.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Bind a namespace to a translate function. The returned reference is
   * stable per namespace, so it can ride inject surfaces without breaking
   * memoization.
   * @param ns - namespace.
   * @returns the translate function.
   */
  bind(ns: string): LocaleTranslate {
    let translate = this.bound.get(ns)
    if (translate === undefined) {
      translate = (key, params) => this.translate(ns, key, params)
      this.bound.set(ns, translate)
    }
    return translate
  }

  /** Resolve one key through the active → English → common → key chain. */
  private translate(ns: string, key: string, params?: Record<string, unknown>): string {
    const hit = this.lookup(ns, this.activeLocale, key) ?? this.lookup(ns, FALLBACK_LOCALE, key)
      ?? this.lookup(COMMON_NS, this.activeLocale, key) ?? this.lookup(COMMON_NS, FALLBACK_LOCALE, key)
    if (hit === undefined) return key
    if (params === undefined) return hit
    return hit.replace(/\{(\w+)\}/gu, (match, name: string) => {
      const value = params[name]
      return value === undefined ? match : String(value)
    })
  }

  /** Dictionary read for one (namespace, locale) pair. */
  private lookup(ns: string, locale: string, key: string): string | undefined {
    return this.dicts.get(ns)?.get(locale)?.[key]
  }

  /** Advance the revision and notify LocaleFace subscribers. */
  private publish(): void {
    this.revision += 1
    this.snapshot = {
      active: this.activeLocale,
      locales: [
        { id: 'en', label: 'English' },
        { id: 'zh', label: '中文', fallback: 'en' },
      ] as readonly LocaleDefinition[],
      revision: this.revision,
    }
    for (const listener of [...this.listeners]) listener()
  }
}
