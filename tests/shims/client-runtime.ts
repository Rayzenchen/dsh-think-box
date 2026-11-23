/**
 * Test-only stand-in for `@deepseek-ai/dsh-client-runtime(/client)`.
 *
 * The real package ships a prebuilt browser bundle that registers itself
 * through `window.__ModuleLoader__.load({...})` at module scope, which cannot
 * run inside Vitest. The deleted `repro/` shim used to borrow the harness
 * source registry from a sibling `deepseek-harness` checkout; that tree is not
 * part of this fork, so this mirror keeps the same public shape with zero
 * browser-bundle machinery:
 *
 * - `createSnapshotStore` is copied verbatim from the old repro shim
 *   (zustand-style snapshot store with an immer-style mutable draft).
 * - `SlotRegistry` is the thin cordis `Service` layer over the INSTALLED
 *   `@deepseek-ai/dsh-client-ui-slots` `SlotCore` (version-locked with the
 *   pinned dev dependencies). Registration semantics, declaration ledger and
 *   the unload cascade stay in the real core; this file only owns what needs
 *   a runtime: the `slots/changed` event bridge, registration/injection
 *   through the caller's `ctx.effect`, and the `entries` inspection surface.
 *
 * Test files keep importing the real package for TYPES; only the Vitest alias
 * routes the runtime import here.
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'

/** One registered entry as the tests observe it (`component` is swappable). */
export interface SlotEntryLike {
  /** The contributed renderer; writable so a takeover can replace it in place. */
  component: unknown
  /** Entry shape fields; the pinned types predate `registrant`, so keep it open. */
  readonly options: {
    readonly key?: string
    readonly id?: string
    readonly order?: number
    readonly label?: string
    readonly priority?: number
    readonly registrant?: string
    readonly [extra: string]: unknown
  }
  /** Registrant's business-face factory, when the registration declared one. */
  readonly inject?: unknown
  /** Child declaration table, when this registration declared child slots. */
  readonly children?: Record<string, unknown>
  readonly [extra: string]: unknown
}

/** Loose structural face of `SlotCore`: the test shim only needs these reads. */
interface CoreLike {
  register(options: Record<string, unknown>, component: unknown): () => void
  entries(key: string): readonly SlotEntryLike[]
  entriesOfSlot(key: string): readonly SlotEntryLike[]
  spec(key: string): unknown
  specDynamic(key: string): unknown
  declarationEpoch(key: string): number
  subscribeDeclaration(key: string, listener: () => void): () => void
  subscribe(key: string, listener: () => void): () => void
  getVersion(key: string): number
  onMutate(listener: (key: string) => void): () => void
  isLive(entry: unknown): boolean
  snapshot(root?: string): unknown
}

/** Cordis surfaces whose ambient event types differ from the pinned packages. */
interface EffectContext {
  effect(body: () => unknown, label?: string): () => void
  emit(name: string, ...args: unknown[]): void
}

/**
 * Cordis Service layer of the slot system, mirroring the shipped runtime:
 * registration and declaration injection run through the CALLER's fiber (the
 * cordis service proxy rebinds `this.ctx`), so plugin unload collects both.
 * The `slots/changed` bridge is wired from the real core's mutation hook.
 */
export class SlotRegistry extends Service {
  private readonly core: CoreLike

  constructor(ctx: Context) {
    super(ctx, 'slots')
    this.core = new SlotCore() as unknown as CoreLike
    const loose = ctx as unknown as EffectContext
    this.core.onMutate((key) => { loose.emit('slots/changed', key) })
  }

  /**
   * Register a component into a declared slot.
   * @param options - registration options (name/children/key/id/priority/...).
   * @param component - the contributed renderer.
   * @returns effect-scoped disposer removing the contribution.
   */
  register(options: Record<string, unknown>, component: unknown): () => void {
    return this.effect(() => this.core.register(options, component), 'slots.register()')
  }

  /**
   * Run a contribution for each declaration lifetime of a slot; a slot
   * declared after this call triggers the callback when it appears.
   * @param key - slot key to depend on.
   * @param callback - creates the contribution and returns its disposer(s).
   * @returns disposer cancelling the wait and the active contribution.
   */
  inject(key: string, callback: () => unknown): () => void {
    const ctx = this.effectContext()
    const disposeController = ctx.effect(() => {
      let active: (() => void) | undefined
      let activeEpoch: number | undefined
      let stopped = false
      let unsubscribe = (): void => {}

      const stop = (): void => {
        if (stopped) return
        stopped = true
        unsubscribe()
        const dispose = active
        active = undefined
        activeEpoch = undefined
        dispose?.()
      }

      const reconcile = (): void => {
        if (stopped) return
        const spec = this.core.specDynamic(key)
        const epoch = this.core.declarationEpoch(key)
        if (active !== undefined && activeEpoch === epoch) return
        const dispose = active
        active = undefined
        activeEpoch = undefined
        dispose?.()
        if (spec === undefined) return
        const disposeEffect = ctx.effect(callback, `slots.inject(${JSON.stringify(key)}): declaration`)
        active = () => { disposeEffect() }
        activeEpoch = epoch
      }

      const changed = (): void => {
        try {
          reconcile()
        } catch (error) {
          stop()
          throw error
        }
      }

      unsubscribe = this.core.subscribeDeclaration(key, changed)
      try {
        reconcile()
      } catch (error) {
        stop()
        throw error
      }
      return stop
    }, `slots.inject(${JSON.stringify(key)})`)
    return () => { disposeController() }
  }

  /** Snapshot entries for a key (the cached, live, mutable list). */
  entries(key: string): readonly SlotEntryLike[] { return this.core.entries(key) }

  /** Shadowing winners per cell for a key. */
  entriesOfSlot(key: string): readonly SlotEntryLike[] { return this.core.entriesOfSlot(key) }

  /** Look up a declared spec (dynamic-key wide form). */
  spec(key: string): unknown { return this.core.spec(key) }

  /** Subscription/version surface the renderer would use. */
  subscribe(key: string, listener: () => void): () => void { return this.core.subscribe(key, listener) }

  /** Version counter for uSES pairing. */
  getVersion(key: string): number { return this.core.getVersion(key) }

  /** Whether a previously obtained entry is still registered. */
  isLive(entry: unknown): boolean { return this.core.isLive(entry) }

  /** JSON-safe declaration topology. */
  snapshot(root?: string): unknown { return this.core.snapshot(root) }

  /** The caller-bound effect surface (cordis rebinds it through the service proxy). */
  private effectContext(): EffectContext {
    return this.ctx as unknown as EffectContext
  }

  /** Run a body through the caller's fiber effect and return a sync disposer. */
  private effect(body: () => unknown, label: string): () => void {
    return this.effectContext().effect(body, label)
  }
}

/** Snapshot store shape consumed by the debug panel. */
export interface SnapshotStoreLike<T> {
  getSnapshot(): T
  subscribe(listener: (state: T) => void): () => void
  update(mutator: (draft: T) => void): void
  set(next: T): void
}

/**
 * Zustand-style snapshot store with an immer-style mutable draft, mirroring
 * the shipped runtime's `createSnapshotStore` without per-update deep clones
 * (the debug panel's per-frame writes must not distort frame timing).
 * @param init - initial state.
 * @returns the store handle.
 */
export function createSnapshotStore<T extends object>(init: T): SnapshotStoreLike<T> {
  let state = init
  const listeners = new Set<(state: T) => void>()
  return {
    getSnapshot: () => state,
    subscribe: listener => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update: mutator => {
      const draft = Object.create(
        Object.getPrototypeOf(state),
        Object.getOwnPropertyDescriptors(state),
      ) as T
      mutator(draft)
      state = draft
      for (const listener of [...listeners]) listener(state)
    },
    set: next => {
      state = next
      for (const listener of [...listeners]) listener(state)
    },
  }
}
