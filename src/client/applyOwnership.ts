/**
 * Single-live-instance gate for this plugin's browser half.
 *
 * `apply` runs once per *module instance*, and a client reload (HMR reconnect,
 * a `connection lost` recovery, a second bundle URL for the same id) can leave
 * the previous instance's registrations alive: its module state is unreachable
 * from the new instance, but the slot registry it wrote to is shared. Two live
 * instances mean two conversation followers driving the same scroller - a state
 * this package's own row takeover documents as "two scroll owners", where each
 * instance restores styles it captured from the other's mid-flight values.
 *
 * Module-scoped state cannot detect that, so the handoff goes through one
 * global slot: a new instance asks the previous one to stand down, and only
 * then installs its own.
 */

/** Global slot holding the current instance's stand-down callback. */
export const APPLY_OWNER_GLOBAL = '__DSH_SMOOTH_STREAM_APPLY__'

/** Releases everything one `apply` instance installed. */
export type StandDown = () => void

interface OwnerBag {
  [APPLY_OWNER_GLOBAL]?: StandDown | undefined
}

function bag(): OwnerBag {
  return globalThis as unknown as OwnerBag
}

/**
 * Take ownership of the browser half, standing the previous instance down.
 *
 * Must be called at the top of `apply`, before anything is registered: the
 * instance being replaced has to release the slot registry first, otherwise
 * both ends up wrapping the same rows.
 *
 * @param run Teardown of the claiming instance. Read lazily, so the slot can be
 * claimed before the registrations exist; swapping in the real teardown later
 * is what a stand-down of this instance will run.
 * @returns Idempotent release. Clears the slot only while this instance still
 * owns it, so an older instance winding down can never unregister a newer one.
 */
export function claimApplyOwnership(run: StandDown): StandDown {
  const slot = bag()
  const previous = slot[APPLY_OWNER_GLOBAL]
  if (typeof previous === 'function') {
    slot[APPLY_OWNER_GLOBAL] = undefined
    try {
      previous()
    } catch (error) {
      // A failed stand-down must not stop the new instance from taking over:
      // it is strictly better to have one live owner with leftovers than two
      // live owners fighting over the same scroller.
      console.error('[dsh-smooth-stream] previous client instance failed to stand down', error)
    }
  }
  slot[APPLY_OWNER_GLOBAL] = run
  return () => {
    if (slot[APPLY_OWNER_GLOBAL] === run) slot[APPLY_OWNER_GLOBAL] = undefined
  }
}
