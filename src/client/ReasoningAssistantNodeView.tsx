import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { ImageGallery, type ImageLoader, type MessageImageLabels } from '@deepseek-ai/dsh-client-ui-attachment'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { AnimatedDisclosure } from './AnimatedDisclosure.tsx'
import { IconThink } from './harnessIcons.ts'
import { useReasoningReveal } from './useReasoningReveal.ts'
import { useLogarithmicFade } from './useLogarithmicFade.ts'
import { useReasoningTranslation } from './useReasoningTranslation.ts'
import type { ReasoningTranslationFace } from './reasoningTranslation.ts'
import css from './ReasoningAssistantNodeView.module.css'

type AssistantProps = ChatNodeViewProps<'assistant-step'>

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia === undefined) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function imageLabels(t: AssistantProps['t']): MessageImageLabels {
  return {
    image: t('image.label'),
    open: t('image.openOriginal'),
    openNamed: label => t('image.openOriginalLabel', { label }),
    loading: t('image.loading'),
    loadFailed: t('image.loadFailed'),
    lightbox: {
      dialog: t('image.preview'),
      close: t('image.closePreview'),
    },
  }
}

/**
 * Apply searchable hidden state without unmounting a stable subtree 鈥?the
 * Host's completion fold hides the answer-inline reasoning this way, so the
 * takeover renderer must reproduce it to stay inside the contract: the row
 * disappears into the Host's process summary and comes back on find-in-page.
 * (Mirrors the Harness chat kit's `useSearchableHidden`.)
 */
function useSearchableHidden(
  hidden: boolean,
  reveal: () => void,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    if (hidden && element.contains(element.ownerDocument.activeElement)) {
      reveal()
      return
    }
    if (hidden) element.setAttribute('hidden', 'until-found')
    else element.removeAttribute('hidden')
  }, [hidden, reveal])
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    element.addEventListener('beforematch', reveal)
    return () => { element.removeEventListener('beforematch', reveal) }
  }, [reveal])
  return ref
}

/**
 * One answer-inline reasoning block wrapped in the Host's fold contract. The
 * Host computes the fold decision (turn closed, compact transcript, this node
 * is the answer) and delivers it through the `turnProcess` owner prop; when
 * folded the block hides into the Host's "thought" summary row instead of
 * staying mounted above the answer.
 */
function FoldableReasoning({
  hidden,
  reveal,
  children,
}: {
  hidden: boolean
  reveal: () => void
  children: ReactNode
}) {
  const ref = useSearchableHidden(hidden, reveal)
  return (
    <div ref={ref} data-turn-process-inline={hidden || undefined}>
      {children}
    </div>
  )
}

/**
 * The box is a display pool fed by a bursty producer.
 *
 * Text does not arrive at a steady rate: chunks land in bursts, and the reveal
 * engine deliberately speeds up (by design, up to several hundred characters a
 * second) whenever its own queue backs up. Driving the scroll straight at the
 * DOM bottom therefore inherits every one of those bursts - the box travels at
 * whatever rate the producer happens to be running at, stalls when it pauses,
 * and lurches when it finally flushes.
 *
 * Instead the scroll position is a cursor advanced at a SMOOTHED rate: the pool
 * drains at the running average of what came in. Bursts are absorbed as backlog
 * behind the cursor and the motion stays one steady glide from the first line
 * to the last. When the producer stops, the cursor keeps draining at exactly
 * the speed already on screen, so the landing needs no separate animation at
 * all - it is just the belt finishing its work.
 */
interface BeltTracker {
  el: HTMLElement | null
  /** Scroll position the belt has advanced to, in px. */
  cursor: number
  /** Smoothed producer rate, px/s. */
  rate: number
  /** scrollHeight at the previous sample. */
  height: number
}

/** How much of a burst survives into the motion: the rate smoother's time constant. */
const BELT_TAU_MS = 400
/** The belt never quite stops while a stream is live, and never rips. */
const BELT_MIN_PX_PER_SEC = 90
const BELT_MAX_PX_PER_SEC = 800
/** Rate a box starts from, before it has measured anything. */
const BELT_START_PX_PER_SEC = 150

const emptyBelt = (): BeltTracker => ({
  el: null,
  cursor: 0,
  rate: BELT_START_PX_PER_SEC,
  height: 0,
})

/**
 * Re-anchor the belt to where the box actually is, so following can resume
 * without a jump after the reader took the position over.
 * @param el - the scrolling box.
 * @param belt - the tracker to re-anchor.
 */
function beltSync(el: HTMLElement, belt: BeltTracker): void {
  belt.el = el
  belt.cursor = el.scrollTop
  belt.height = el.scrollHeight
  belt.rate = BELT_START_PX_PER_SEC
}

/**
 * Advance the belt one frame: smooth the producer's rate, then drain at it.
 * @param el - the scrolling box.
 * @param belt - per-box tracker.
 * @param dtMs - frame time in ms.
 * @param drain - true once the producer stopped. The rate is then held instead
 *   of smoothed, so the landing continues at the speed already on screen.
 * @returns the scrollTop to apply.
 */
function beltStep(el: HTMLElement, belt: BeltTracker, dtMs: number, drain: boolean): number {
  const dt = Math.min(100, Math.max(1, dtMs))
  if (belt.el !== el) {
    // A different element means the reader toggled the disclosure. Both shapes
    // show the same live chain, so the new box starts where the stream is - at
    // the live bottom - rather than at its own initial scrollTop of zero, which
    // is what made the content creep down from the top after every toggle.
    belt.el = el
    belt.cursor = Math.max(0, el.scrollHeight - el.clientHeight)
    belt.height = el.scrollHeight
  }
  if (!drain) {
    const produced = ((el.scrollHeight - belt.height) / dt) * 1000
    const k = 1 - Math.exp(-dt / BELT_TAU_MS)
    belt.rate += (produced - belt.rate) * k
    belt.rate = Math.min(BELT_MAX_PX_PER_SEC, Math.max(BELT_MIN_PX_PER_SEC, belt.rate))
  }
  belt.height = el.scrollHeight
  const bottom = Math.max(0, el.scrollHeight - el.clientHeight)
  belt.cursor = Math.max(0, Math.min(belt.cursor + (belt.rate * dt) / 1000, bottom))
  return belt.cursor
}

/**
 * Nearest scrollable ancestor: the port a disclosure toggle has to compensate
 * its layout shift in.
 * @param el - element to start walking up from.
 * @returns the scrolling ancestor, or null when nothing up the tree scrolls.
 */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node !== null) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/**
 * Built-in Think disclosure with a smoothed `text` feed. Chevron and row
 * click stay on the disclosure chrome, which the plugin's AnimatedDisclosure
 * renders with a height-animated body (the harness primitive would mount and
 * unmount it, which cannot glide). The row opens only while this block is
 * the streaming tail and closes as soon as thinking ends 鈥?a later block,
 * or the assistant node settling 鈥?not when the rest of the reply is
 * still streaming.
 */
function AnimatedReasoning({
  text,
  running,
  turnStreaming,
  thinkAutoExpand,
  sessionId,
  translation,
  translationLabel,
  autoTranslate,
  t,
}: {
  text: string
  running: boolean
  /**
   * Whether the assistant node is still streaming at all. A short reasoning
   * block is often never the tail of the step, so its own `running` flag never
   * turns on; the turn is the only reliable "it is over" signal for it.
   */
  turnStreaming: boolean
  thinkAutoExpand: boolean
  /** Owning Session, so saved translations can be persisted and reused. */
  sessionId: string | undefined
  /** Optional reasoning-translation Remote; absent when the bundle is off. */
  translation: ReasoningTranslationFace | undefined
  /** Human-readable backend, e.g. `opencode-go · deepseek-v4.1-flash`. */
  translationLabel: string | undefined
  /** Translate the block automatically while it streams. */
  autoTranslate: boolean
  t: AssistantProps['t']
}) {
  const reduced = usePrefersReducedMotion()
  // Opt-in machine translation for this block. The hook only schedules work
  // while the translated view is active, so the original feed never sends the
  // reader's reasoning to the translation provider.
  const translationControl = useReasoningTranslation(
    text,
    sessionId,
    translation,
    !running,
    autoTranslate && running,
  )
  const sourceText = translationControl.displayText
  // A box is open while its block streams, and also while the turn is still
  // running even if this particular block never held the tail: a short chain of
  // thought finishes inside one commit and would otherwise render collapsed
  // from the start, with no flourish to watch.
  const [settled, setSettled] = useState(!running && !turnStreaming)
  const wasRunningRef = useRef(running)
  // One flourish per stream. Two end signals can arrive for the same chain -
  // this block leaving the tail, then the turn itself ending a moment later -
  // and without this the whole sequence replays from the collapsed state.
  //
  // It is set only once the flourish COMPLETES: a run cancelled by a dependency
  // change must stay retryable, otherwise a single cancelled animation leaves
  // the box open at the streaming height until the component remounts.
  const flourishedRef = useRef(false)
  // Whether this block was ever live in this mount. Restored history is not, and
  // must not replay the flourish.
  const liveRef = useRef(running || turnStreaming)
  if (running || turnStreaming) liveRef.current = true
  // The row's inline box carries the live reasoning, so nothing auto-expands:
  // the disclosure body below the row opens only from a click on the row.
  const [expanded, setExpanded] = useState(false)
  const inlineRef = useRef<HTMLDivElement>(null)
  const fadeRootRef = useRef<HTMLDivElement>(null)
  // The fade and the custom auto-scroll drive whichever box is on screen: the
  // inline row box while collapsed, the disclosure body while open. Both refs
  // are stable, so the fade controller moves between them on a toggle.
  const activeRef = expanded ? fadeRootRef : inlineRef
  const beltRef = useRef<BeltTracker>(emptyBelt())
  const fadeSpeedRef = useRef(35)
  const userScrolledRef = useRef(false)
  const rafIdRef = useRef(0)
  // Latest "the live stream still owns this scroller" state. Tracked on every
  // render so the queued frame can re-read it: a stop or a collapse landing
  // between scheduling and the frame must not move the viewport.
  const followActiveRef = useRef(false)
  followActiveRef.current = running && thinkAutoExpand
  const commitAnchorRef = useRef<HTMLDivElement>(null)
  // The running鈫抐alse flip is the AUTO-close: it collapses instantly and the
  // follower's settle spring absorbs the height step. A later manual toggle
  // keeps the CSS glide.
  const displayed = useReasoningReveal(sourceText, {
    enabled: running && !reduced,
    speedCpsRef: fadeSpeedRef,
  })
  const shown = running && !reduced ? displayed : sourceText
  // Fade is fixed on for this fork: it belongs to whichever box the reader
  // sees, and the OS reduced-motion preference alone may skip it.
  useLogarithmicFade(activeRef, !reduced, running, fadeSpeedRef)

  useEffect(() => {
    // Only the live stream owns the reading position. A settled block is
    // something to read from the top, so expanding a finished reasoning card
    // must not scroll it 鈥?that would make its first lines unreachable.
    // The takeover flag is deliberately NOT part of this guard. It is a
    // per-frame condition (the loop re-anchors while the reader owns the
    // position), and testing it here meant a toggle that arrived while the flag
    // was still set never started a loop at all - so handing the position back
    // had nothing left to resume it.
    if (!running || !thinkAutoExpand) return
    const el = activeRef.current
    if (el === null) return
    // A continuous glide loop rather than a write per revealed character: the
    // box keeps travelling between text updates, which is what makes the motion
    // read as scrolling instead of as an instant re-layout.
    let last = 0
    const glide = (ts: number) => {
      rafIdRef.current = requestAnimationFrame(glide)
      const dt = last === 0 ? 16.667 : ts - last
      last = ts
      // Re-checked at frame time: the stream may have stopped, a toggle may
      // have swapped the box, or the reader may have taken the position back.
      if (!followActiveRef.current) return
      if (userScrolledRef.current) {
        // The reader owns the position: re-anchor so resuming never jumps.
        beltSync(el, beltRef.current)
        return
      }
      el.scrollTop = beltStep(el, beltRef.current, dt, false)
    }
    rafIdRef.current = requestAnimationFrame(glide)
    return () => {
      if (rafIdRef.current !== 0) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [running, expanded, thinkAutoExpand, reduced])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== 0) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [])

  useEffect(() => {
    // Re-attached whenever the visible box changes: taking the reading position
    // over is a per-scroller contract, and a toggle swaps which scroller that is.
    // The previous box's takeover must not carry across either, so a toggle
    // always hands the position back to the stream: collapsing a body the reader
    // had scrolled back up resumes following at the live bottom instead of
    // staying parked where the old box was left.
    userScrolledRef.current = false
    const el = activeRef.current
    if (el === null) return
    let isPointerDown = false
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        userScrolledRef.current = true
      } else if (e.deltaY > 0) {
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= 30) {
          userScrolledRef.current = false
        }
      }
    }
    const onPointerDown = () => {
      isPointerDown = true
    }
    const onPointerUp = () => {
      isPointerDown = false
    }
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 30
      if (atBottom) {
        userScrolledRef.current = false
      } else if (isPointerDown) {
        userScrolledRef.current = true
      }
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('scroll', onScroll)
    }
  }, [expanded])

  useEffect(() => {
    // A new stream re-anchors the belt wherever the box currently sits.
    if (!running) return
    const el = inlineRef.current
    if (el !== null) beltSync(el, beltRef.current)
  }, [running])

  // Finishing flourish. When the model stops thinking the box lands on its last
  // line, holds it for a beat so the end can be read, glides back up to the
  // first line, and only then shrinks to a single line. Restoring a transcript
  // must not replay this, so it fires on a real running -> settled transition
  // and never on mount.
  useEffect(() => {
    const wasRunning = wasRunningRef.current
    wasRunningRef.current = running
    if (running) {
      setSettled(false)
      flourishedRef.current = false
      return
    }
    if (flourishedRef.current) return
    // This block stopped being the streaming tail: that is the end of its own
    // chain of thought, and the flourish belongs there - deferring it to the end
    // of the turn would freeze the box on a stale line while the rest of the
    // reply streams past. A chain short enough never to hold the tail has no
    // such moment, so while the turn is still running there is nothing to do for
    // it; the turn boundary triggers it instead. Once the turn is over this
    // condition is satisfied for every live block, which is also what retries a
    // flourish that a dependency change cancelled halfway through.
    const blockEnded = wasRunning
    if (turnStreaming && !blockEnded) return
    // Never live in this mount: a restored transcript block, already settled.
    if (!liveRef.current) return
    const el = inlineRef.current
    // Already collapsed, the body is open, or nobody can see the page: skip
    // straight to the end state. A hidden page (window on another desktop,
    // minimized) gets no animation frames, so a flourish started now would
    // only resume on return, from a stale position.
    if (el === null || expanded || el.ownerDocument.visibilityState === 'hidden') {
      flourishedRef.current = true
      setSettled(true)
      return
    }
    const HOLD_MS = 500
    /**
     * A frame gap this long means the page stopped painting mid-flourish. The
     * reader missed it, so it finishes at once instead of replaying a slow
     * slide from wherever the box was left.
     */
    const STALE_FRAME_GAP_MS = 500
    /**
     * Constant rewind speed. A fixed duration made a long chain rewind far
     * faster than a short one; holding the speed and letting only the duration
     * scale keeps the motion identical whatever the chain's length.
     */
    const UP_PX_PER_SEC = 1600
    // Three phases, and no separate "slide to the bottom" animation: the belt
    // simply keeps draining at the rate it already had (see BELT_TAU_MS), which
    // is what makes the landing continuous with the streaming motion instead of
    // a second, differently-timed gesture.
    let phase: 'drain' | 'hold' | 'up' = 'drain'
    let lastTs = performance.now()
    let holdUntil = 0
    let upStart = 0
    let upFrom = 0
    let upMs = 0
    let frame = 0
    const step = (ts: number): void => {
      const dt = ts - lastTs
      lastTs = ts
      if (dt > STALE_FRAME_GAP_MS) {
        el.scrollTop = 0
        flourishedRef.current = true
        setSettled(true)
        return
      }
      const bottom = Math.max(0, el.scrollHeight - el.clientHeight)
      if (phase === 'drain') {
        el.scrollTop = beltStep(el, beltRef.current, dt, true)
        if (el.scrollTop >= bottom - 0.5) {
          el.scrollTop = bottom
          phase = 'hold'
          holdUntil = ts + HOLD_MS
        }
      } else if (phase === 'hold') {
        el.scrollTop = bottom
        if (ts >= holdUntil) {
          phase = 'up'
          upFrom = bottom
          upStart = ts
          upMs = bottom === 0 ? 0 : Math.max(90, (bottom / UP_PX_PER_SEC) * 1000)
        }
      } else {
        const progress = upMs === 0 ? 1 : (ts - upStart) / upMs
        if (progress >= 1) {
          el.scrollTop = 0
          flourishedRef.current = true
          setSettled(true)
          return
        }
        el.scrollTop = upFrom * (1 - progress)
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(frame) }
  }, [running, turnStreaming, expanded])

  /**
   * Toggle the body while pinning this row's viewport position. Opening it adds
   * up to eighteen lines above the composer; without the correction the
   * conversation scroller - and this plugin's own follower - react to that jump
   * and the view lands somewhere else entirely. Compensation runs for the
   * length of the grid-track transition and then stops.
   */
  const toggleExpanded = useCallback(() => {
    // Cleared synchronously, before the re-render, so no effect can observe the
    // previous box's takeover state.
    userScrolledRef.current = false
    const anchor = commitAnchorRef.current
    const scroller = anchor === null ? null : scrollParentOf(anchor)
    const before = anchor?.getBoundingClientRect().top ?? 0
    setExpanded(value => !value)
    if (anchor === null || scroller === null) return
    const until = performance.now() + 340
    const pin = (): void => {
      const delta = anchor.getBoundingClientRect().top - before
      if (Math.abs(delta) > 0.5) scroller.scrollTop += delta
      if (performance.now() < until) requestAnimationFrame(pin)
    }
    requestAnimationFrame(pin)
  }, [])

  const translateLabel = (key: string): string => (t as unknown as (key: string) => string)(key)
  const translateTrailing = translation !== undefined && translationControl.available
    ? (
        <>
          {translationControl.active && translationControl.pending && (
            <span className={css.thinkTranslateStatus}>{translateLabel('message.think.translating')}</span>
          )}
          {translationControl.failed && (
            <>
              <span className={css.thinkTranslateStatus}>{translateLabel('message.think.translateFailed')}</span>
              <button
                type="button"
                className={css.thinkTranslateButton}
                onClick={(event) => {
                  event.stopPropagation()
                  translationControl.retry()
                }}
                onKeyDown={(event) => { event.stopPropagation() }}
              >
                {translateLabel('message.think.translateRetry')}
              </button>
            </>
          )}
          <button
            type="button"
            className={css.thinkTranslateButton}
            aria-pressed={translationControl.active}
            title={translationLabel}
            onClick={(event) => {
              event.stopPropagation()
              translationControl.toggle()
            }}
            onKeyDown={(event) => { event.stopPropagation() }}
          >
            {translateLabel(translationControl.active
              ? 'message.think.original'
              : 'message.think.translate')}
          </button>
        </>
      )
    : undefined

  // Keep the same layout wrapper the old follow boundary used, so the reasoning
  // box keeps its transcript spacing without mounting a scroll owner.
  return (
    <div className={css.follow} ref={commitAnchorRef}>
      <div className={css.think} data-variant="think" data-state={running ? 'running' : 'ok'}>
        {running && <span className={css.visuallyHidden}>{t('row.running')}</span>}
        <AnimatedDisclosure
          rowClassName={expanded ? css.thinkRow : `${css.thinkRow} ${css.thinkRowInline}`}
          leadingClassName={css.thinkLeading}
          titleClassName={css.thinkTitle}
          chevronClassName={css.thinkChevron}
          icon={<IconThink size={14} />}
          // `message.think` is not in the `conversation` key union this prop is
          // typed with: no Harness version owns it there. On 0.1.5+ it lives in
          // the `chat` namespace, and on older builds only this plugin's own
          // fallback dictionary has it. The layered lookup installed in
          // index.ts resolves it either way, so the cast widens the key domain
          // rather than skipping a lookup. No hardcoded label and no
          // `<html lang>` sniffing: a key that resolves nowhere shows the key,
          // which the locale routing test catches.
          title={(t as unknown as (key: string) => string)('message.think')}
          open={expanded}
          onToggle={toggleExpanded}
          trailing={translateTrailing}
          // The body below opens only from a click, so every transition is a
          // user toggle and keeps the grid-track glide.
          collapsedContent={(
            <>
              <span className={css.thinkSeparator} aria-hidden />
              <div
                ref={inlineRef}
                className={css.thinkInline}
                data-settled={settled ? '' : undefined}
                data-follow-end={running || undefined}
              >
                {shown}
              </div>
            </>
          )}
        >
          <div className={css.thinkExpanded}>
            <div ref={fadeRootRef} className={css.thinkBody}>{shown}</div>
          </div>
        </AnimatedDisclosure>
      </div>
    </div>
  )
}

/**
 * Assistant node renderer for the reasoning-box overlay.
 *
 * The body is rendered directly by the Harness primitives: text through
 * `MarkdownText`, images through `ImageGallery`, unknown payloads through
 * `JsonBlock`. This fork removed the body reveal/follow engine, so nothing
 * here paces or scrolls the answer; only the reasoning box still owns its
 * own inline preview, character reveal, fade and settle flourish.
 */
export const ReasoningAssistantNodeView = memo(function ReasoningAssistantNodeView({
  thinkAutoExpand = true,
  node,
  groupPart,
  useTurnData,
  openFile,
  loadImage,
  fileMentions,
  turnProcess,
  sessionId,
  translation,
  translationLabel,
  autoTranslate,
  t,
}: AssistantProps & {
  /**
   * dsh 0.2.x row split for one assistant step: the flow mounts the node
   * twice — once with `groupPart: 'reasoning'` (reasoning blocks only) and
   * once with `groupPart: 'response'` (everything else). Absent on 0.1.x,
   * where the step renders as a single row; the pinned type predates the
   * field, so it is declared here and erased at compile time.
   */
  groupPart?: 'reasoning' | 'response' | undefined
  /** Follow the streaming reasoning text inside the inline box. */
  thinkAutoExpand?: boolean
  /** Optional reasoning-translation Remote; absent when the bundle is off. */
  translation?: ReasoningTranslationFace | undefined
  /** Human-readable translation backend shown in the toggle tooltip. */
  translationLabel?: string | undefined
  /** Auto-translate live reasoning blocks instead of waiting for a click. */
  autoTranslate?: boolean | undefined
}) {
  const data = node.data
  const streaming = data.status === 'running'
  // dsh 0.2.x mounts the assistant step twice with a `groupPart` split: the
  // `reasoning` row carries the reasoning blocks and the `response` row the
  // rest. Mirrors the built-in AssistantMarkdown filter so the takeover does
  // not render every block in both rows (which duplicated each reasoning
  // paragraph in the transcript on 0.2.x).
  const blocks = groupPart === 'reasoning'
    ? data.blocks.filter(block => block.kind === 'reasoning')
    : groupPart === 'response'
      ? data.blocks.filter(block => block.kind !== 'reasoning')
      : data.blocks
  // The Host's completion-fold decision for THIS node's inline reasoning:
  // only the answer step folds, only in compact-transcript mode, and only
  // once the turn has closed (foldable implies it). Mirrors the built-in
  // assistant renderer so the takeover keeps the official behavior.
  const reasoningHidden = turnProcess !== undefined
    && turnProcess.foldable
    && turnProcess.spec.answerStep === data.step
    && turnProcess.spec.inlineReasoning
    && !turnProcess.open
  const revealProcess = useCallback(() => { turnProcess?.setOpen(true) }, [turnProcess])
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  const tail = useTurnData('turn-tail')
  const owner = useMemo<TurnTailOwnerProps | undefined>(() => {
    if (turn?.status !== 'closed' || data.finalNode === undefined) return undefined
    if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return undefined
    return { turn, seq: data.finalNode.seq, openFile }
  }, [data.finalNode, openFile, tail, turn])
  const mentions = useMemo(
    () => owner === undefined ? undefined : fileMentions(owner),
    [fileMentions, owner],
  )
  const markdownLabels = useMemo(() => ({
    code: { copyLabel: t('copy'), copiedLabel: t('copied') },
    footnotes: t('markdown.footnotes'),
  }), [t])
  const imageLoader: ImageLoader = loadImage ?? (async () => {
    throw new Error(t('image.serviceUnavailable'))
  })
  const hasVisible = streaming
    || data.status === 'interrupted'
    || blocks.some(block => block.kind !== 'tool-call')
  if (!hasVisible) return null
  // 0.2.x reasoning rows see a blocks array filtered to reasoning only, so
  // `index === last` stays true while a later tool-call or text block runs in
  // the same step. Tail-ness must be judged against the ORIGINAL step blocks
  // so the think box settles promptly when any later block starts.
  const stepTailIsReasoning = data.blocks[data.blocks.length - 1]?.kind === 'reasoning'

  const rendered: ReactNode[] = []
  const last = blocks.length - 1
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block === undefined) continue
    switch (block.kind) {
      case 'text':
        if (!streaming && block.text.trim() === '') break
        rendered.push(
          <MarkdownText
            key={index}
            text={block.text}
            streaming={streaming}
            labels={markdownLabels}
            fileMentions={mentions}
          />,
        )
        break
      case 'reasoning':
        rendered.push(
          <FoldableReasoning key={index} hidden={reasoningHidden} reveal={revealProcess}>
            <AnimatedReasoning
              text={block.text}
              running={streaming && index === last && (groupPart !== 'reasoning' || stepTailIsReasoning)}
              turnStreaming={streaming}
              thinkAutoExpand={thinkAutoExpand}
              sessionId={sessionId as unknown as string | undefined}
              translation={translation}
              translationLabel={translationLabel}
              autoTranslate={autoTranslate === true}
              t={t}
            />
          </FoldableReasoning>,
        )
        break
      case 'image': {
        const start = index
        const group = [block]
        while (index + 1 < blocks.length) {
          const next = blocks[index + 1]
          if (next === undefined || next.kind !== 'image') break
          group.push(next)
          index += 1
        }
        rendered.push(
          <ImageGallery key={start} images={group} load={imageLoader} align="start" labels={imageLabels(t)} />,
        )
        break
      }
      case 'tool-call':
        break
      case 'other':
        rendered.push(
          <JsonBlock
            key={index}
            label={t('message.unknownBlock')}
            payload={block.block}
            truncatedLabel={total => t('json.truncated', { total })}
          />,
        )
        break
    }
  }

  return (
    <div className={css.root} data-streaming={streaming || undefined}>
      <div className={css.body}>
        {rendered}
        {data.status === 'interrupted' && <span className={css.stopped}>{t('message.stopped')}</span>}
      </div>
    </div>
  )
})
