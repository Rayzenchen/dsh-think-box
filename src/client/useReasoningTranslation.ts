/**
 * Per-reasoning-block translation state for the think box.
 *
 * Translation can be opt-in or automatic: the reader either clicks the toggle
 * once, or the runtime's `autoTranslate` preference switches a block that is
 * already streaming. In both cases the whole block follows the translated
 * feed, including fragments that complete while the model is still thinking.
 * The displayed string keeps the reveal engine's input contract - complete
 * fragments have translations, the unfinished tail stays in the original
 * language - so the typewriter reveal keeps running on the translated feed
 * instead of waiting for the whole block to settle.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  planTranslationFragments,
  type PlannedTranslationFragments,
  type ReasoningTranslationFace,
  type TranslationPlan,
} from './reasoningTranslation.ts'

/** Flags the toolbar renders; the displayed text is derived from them. */
export interface TranslationSnapshot {
  /** A plan read or at least one fragment request is still in flight. */
  readonly pending: boolean
  /** At least one fragment failed and was left untranslated. */
  readonly failed: boolean
  /**
   * Monotonic counter bumped whenever translated text lands or is discarded.
   * `pending` can stay true across many results, so this is what tells React
   * to re-read {@link displayFor} after each fragment.
   */
  readonly generation: number
}

/** Everything the reasoning row needs to render the toggle and the feed. */
export interface ReasoningTranslationControl {
  /** Translation is offered only when the bundle Remote is mounted. */
  readonly available: boolean
  /** The reader switched this block to the translated feed. */
  readonly active: boolean
  /** Feed to display: translated fragments plus the original streaming tail. */
  readonly displayText: string
  readonly pending: boolean
  readonly failed: boolean
  /** Switch the block between the translated feed and the original text. */
  toggle(): void
  /** Clear failures and retry the fragments that failed. */
  retry(): void
}

const IDLE_SNAPSHOT: TranslationSnapshot = { pending: false, failed: false, generation: 0 }

/**
 * Imperative translation scheduler for one reasoning block.
 *
 * React owns the view mode (original/translated); this engine owns the plan,
 * the per-fragment queue, and the in-memory results. It only schedules work
 * while the translated view is active, so leaving the original feed untouched
 * never sends reasoning text anywhere.
 */
class ReasoningTranslationEngine {
  private readonly face: ReasoningTranslationFace
  private readonly notify: (snapshot: TranslationSnapshot) => void
  private text = ''
  private complete = true
  private active = false
  private sessionId: string | undefined
  private plan: TranslationPlan | undefined
  private planFailure = false
  private preparing = false
  private running = false
  private controller: AbortController | undefined
  private enqueuedText = ''
  private readonly results = new Map<string, string>()
  private readonly failedSources = new Set<string>()
  private readonly inFlight = new Set<string>()
  private readonly queue: string[] = []
  private fragments: { text: string, limit: number, complete: boolean, value: PlannedTranslationFragments } | undefined
  private snapshot: TranslationSnapshot = IDLE_SNAPSHOT
  private generation = 0

  constructor(face: ReasoningTranslationFace, notify: (snapshot: TranslationSnapshot) => void) {
    this.face = face
    this.notify = notify
  }

  getSnapshot(): TranslationSnapshot {
    return this.snapshot
  }

  /**
   * Feed the latest view state. Text growth while active schedules the new
   * complete fragments; a rewrite of the block resets the saved results.
   */
  update(text: string, active: boolean, sessionId: string | undefined, complete: boolean): void {
    this.sessionId = sessionId
    const textChanged = text !== this.text
    this.complete = complete
    if (!active) {
      if (this.active) {
        this.active = false
        this.cancel()
        this.preparing = false
        this.publish()
      }
      this.text = text
      return
    }
    if (!this.active) {
      this.active = true
      this.cancel()
      this.controller = new AbortController()
      this.failedSources.clear()
      this.planFailure = false
    }
    if (textChanged) {
      if (!text.startsWith(this.text)) {
        this.results.clear()
        this.generation += 1
      }
      this.text = text
    }
    this.publish()
    void this.run()
  }

  /**
   * Build the displayed feed for the given source text. Pure read for the
   * render pass: untranslated fragments keep their source text, so the feed
   * only differs from the original where a translation actually landed.
   */
  displayFor(text: string): string {
    const plan = this.plan
    if (!this.active || plan === undefined) return text
    const planned = this.planFor(text, plan.maxTextChars, this.complete)
    let output = planned.leading
    for (const fragment of planned.fragments) {
      output += (this.results.get(fragment.source) ?? fragment.source) + fragment.suffix
    }
    return output + planned.tail
  }

  /** Clear failures (and a failed plan read) and dispatch the missing pieces again. */
  retry(): void {
    if (!this.active) return
    this.failedSources.clear()
    this.planFailure = false
    this.cancel()
    this.controller = new AbortController()
    this.publish()
    void this.run()
  }

  dispose(): void {
    this.active = false
    this.cancel()
  }

  private planFor(text: string, limit: number, complete: boolean): PlannedTranslationFragments {
    const cached = this.fragments
    if (
      cached !== undefined
      && cached.text === text
      && cached.limit === limit
      && cached.complete === complete
    ) return cached.value
    const value = planTranslationFragments(text, limit, complete)
    this.fragments = { text, limit, complete, value }
    return value
  }

  private publish(): void {
    const pending = this.active && (this.preparing || this.queue.length > 0 || this.inFlight.size > 0)
    const failed = this.active && (this.planFailure || this.failedSources.size > 0)
    if (
      this.snapshot.pending === pending
      && this.snapshot.failed === failed
      && this.snapshot.generation === this.generation
    ) return
    this.snapshot = { pending, failed, generation: this.generation }
    this.notify(this.snapshot)
  }

  private cancel(): void {
    this.controller?.abort()
    this.controller = undefined
    this.queue.length = 0
    this.inFlight.clear()
  }

  private async ensurePlan(signal: AbortSignal): Promise<void> {
    this.preparing = true
    this.publish()
    try {
      const plan = await this.face.prepare(signal)
      if (this.active && !signal.aborted) this.plan = plan
    } catch {
      if (this.active && !signal.aborted) this.planFailure = true
    } finally {
      this.preparing = false
      this.publish()
    }
  }

  private enqueue(): void {
    this.enqueuedText = this.text
    const plan = this.plan
    if (plan === undefined) return
    for (const fragment of this.planFor(this.text, plan.maxTextChars, this.complete).fragments) {
      const source = fragment.source
      if (this.results.has(source) || this.failedSources.has(source) || this.inFlight.has(source)) continue
      if (this.queue.includes(source)) continue
      this.queue.push(source)
    }
  }

  private async run(): Promise<void> {
    if (this.running || !this.active) return
    this.running = true
    try {
      for (;;) {
        if (!this.active) return
        const controller = this.controller
        if (controller === undefined || controller.signal.aborted) return
        if (this.plan === undefined) {
          if (this.planFailure) return
          await this.ensurePlan(controller.signal)
          if (!this.active || this.plan === undefined) return
        }
        this.enqueue()
        const source = this.queue.shift()
        if (source === undefined) return
        if (this.results.has(source) || this.failedSources.has(source) || this.inFlight.has(source)) continue
        this.inFlight.add(source)
        this.publish()
        try {
          const translated = await this.face.translate(source, this.plan, this.sessionId, controller.signal)
          if (!this.active) return
          this.results.set(source, translated)
          this.generation += 1
        } catch {
          if (!this.active || controller.signal.aborted) return
          this.failedSources.add(source)
        } finally {
          this.inFlight.delete(source)
        }
        this.publish()
      }
    } finally {
      this.running = false
      // The text can grow while the last request is in flight; pick the new
      // fragments up instead of waiting for the next chunk to schedule them.
      if (this.active && this.enqueuedText !== this.text) void this.run()
    }
  }
}

/**
 * Drive translation for one reasoning block.
 * @param text - the block's current source text.
 * @param sessionId - owning Session, so the bundle can save and reuse results.
 * @param face - mounted bundle Remote, or undefined while the bundle is off.
 * @param complete - false while the block still streams; the trailing line is
 *   then left in the original language until the block settles.
 * @returns the toggle state and the feed to display.
 */
export function useReasoningTranslation(
  text: string,
  sessionId: string | undefined,
  face: ReasoningTranslationFace | undefined,
  complete: boolean,
  autoActive = false,
): ReasoningTranslationControl {
  // Latch the preference when the block is live: automatic translation must
  // keep running after the stream ends so the final tail is translated too,
  // but historical blocks must not start translating just because the
  // preference is on.
  const [autoLatched, setAutoLatched] = useState(false)
  const [choice, setChoice] = useState<boolean | undefined>(undefined)
  const [snapshot, setSnapshot] = useState<TranslationSnapshot>(IDLE_SNAPSHOT)
  const engineRef = useRef<ReasoningTranslationEngine | undefined>(undefined)

  useEffect(() => {
    if (autoActive) setAutoLatched(true)
  }, [autoActive])

  useLayoutEffect(() => {
    if (face === undefined) return
    const engine = new ReasoningTranslationEngine(face, setSnapshot)
    engineRef.current = engine
    return () => {
      engine.dispose()
      if (engineRef.current === engine) engineRef.current = undefined
    }
  }, [face])

  const active = face !== undefined && (choice ?? autoLatched)

  useLayoutEffect(() => {
    engineRef.current?.update(text, active, sessionId, complete)
  }, [text, active, sessionId, face, complete])

  useLayoutEffect(() => {
    if (face !== undefined) return
    setAutoLatched(false)
    setChoice(undefined)
    setSnapshot(IDLE_SNAPSHOT)
  }, [face])

  const toggle = useCallback(() => {
    if (face === undefined) return
    setChoice(!active)
  }, [face, active])

  const retry = useCallback(() => {
    engineRef.current?.retry()
  }, [])

  const translated = active && face !== undefined
  return {
    available: face !== undefined && text.trim() !== '',
    active: translated,
    displayText: translated ? engineRef.current?.displayFor(text) ?? text : text,
    pending: translated && snapshot.pending,
    failed: translated && snapshot.failed,
    toggle,
    retry,
  }
}
