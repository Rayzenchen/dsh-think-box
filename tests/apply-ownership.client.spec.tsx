/**
 * Single-owner contract for the browser half.
 *
 * `apply` runs once per module instance, and a client reload can load a second
 * instance while the first one's registrations are still live. These assertions
 * pin the handoff: the incoming instance stands the outgoing one down first, a
 * stale instance winding down never unregisters the live one, and a throwing
 * stand-down does not block the takeover.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { APPLY_OWNER_GLOBAL, claimApplyOwnership } from '../src/client/applyOwnership.ts'

interface OwnerBag {
  [APPLY_OWNER_GLOBAL]?: (() => void) | undefined
}

const slot = (): OwnerBag => globalThis as unknown as OwnerBag

afterEach(() => {
  delete slot()[APPLY_OWNER_GLOBAL]
})

describe('claimApplyOwnership', () => {
  it('stands the previous instance down before installing the new one', () => {
    const order: string[] = []
    const first = { run: () => { order.push('first-stood-down') } }
    claimApplyOwnership(() => first.run())

    claimApplyOwnership(() => { order.push('second') })

    // The outgoing instance released before the incoming one took the slot.
    expect(order).toEqual(['first-stood-down'])
    expect(typeof slot()[APPLY_OWNER_GLOBAL]).toBe('function')
  })

  it('ignores a stale release so an older instance cannot unregister a newer one', () => {
    const releaseFirst = claimApplyOwnership(() => {})
    const standDownSecond = (): void => {}
    claimApplyOwnership(standDownSecond)

    // The first instance winds down late, after the second one took over.
    releaseFirst()

    expect(slot()[APPLY_OWNER_GLOBAL]).toBe(standDownSecond)
  })

  it('still takes over when the previous instance fails to stand down', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      claimApplyOwnership(() => { throw new Error('boom') })
      const standDown = (): void => {}
      claimApplyOwnership(standDown)

      expect(slot()[APPLY_OWNER_GLOBAL]).toBe(standDown)
      expect(logged).toHaveBeenCalledWith(
        '[dsh-think-box] previous client instance failed to stand down',
        expect.any(Error),
      )
    } finally {
      logged.mockRestore()
    }
  })

  it('stands down each predecessor exactly once across a chain of takeovers', () => {
    const stoodDown: string[] = []
    // A reload storm: three instances in a row, each replacing the last.
    claimApplyOwnership(() => { stoodDown.push('a') })
    claimApplyOwnership(() => { stoodDown.push('b') })
    const releaseC = claimApplyOwnership(() => { stoodDown.push('c') })

    expect(stoodDown).toEqual(['a', 'b'])

    // Winding the live instance down releases the slot without replaying a
    // predecessor's teardown.
    releaseC()
    releaseC()
    expect(stoodDown).toEqual(['a', 'b'])
    expect(slot()[APPLY_OWNER_GLOBAL]).toBeUndefined()
  })
})
