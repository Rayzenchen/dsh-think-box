import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { ImageGallery, type ImageLoader, type MessageImageLabels } from '@deepseek-ai/dsh-client-ui-attachment'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { AnimatedDisclosure } from './AnimatedDisclosure.tsx'
import { IconThink } from './harnessIcons.ts'
import { notifyFollowCommit } from './teleprompterGlide.ts'
import { useSmoothStreamContent, type StreamSmoothingPreset } from './useSmoothStreamContent.ts'
import { useFpsGuard } from './useFpsGuard.ts'
import { useLogarithmicFade } from './useLogarithmicFade.ts'
import { useDecoupledMarkdown } from './useDecoupledMarkdown.ts'
import { FollowHost } from './FollowHost.tsx'
import { DEFAULT_STREAM_CONFIG, type StreamMode } from '../config.ts'
import { DEFAULT_STREAM_SETTINGS, type StreamMotionPreference } from '../settings.ts'
import css from './TypewriterAssistantNodeView.module.css'

type AssistantProps = ChatNodeViewProps<'assistant-step'>
type MarkdownProps = Pick<ComponentProps<typeof MarkdownText>, 'labels' | 'fileMentions' | 'text'>

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

/**
 * Resolve whether the reveal engine should stay off for this view. The OS
 * preference wins only in `auto` mode: `force-smooth` keeps the engine on
 * machines where a system-wide reduce-motion switch (or a forced browser
 * flag) would otherwise silently bypass smoothing, and `force-reduced`
 * disables it even when the OS asks for motion. Credit: three-state design
 * proposed by @Zn-Dk in #21/#22.
 */
function useMotionReduced(preference: StreamMotionPreference): boolean {
  const system = usePrefersReducedMotion()
  if (preference === 'force-smooth') return false
  if (preference === 'force-reduced') return true
  return system
}

interface AnimatedMarkdownTextProps extends MarkdownProps {
  streaming: boolean
  logarithmicFade: boolean
  /** Whether the resolved reduced-motion gate keeps the reveal engine off. */
  motionReduced: boolean
  followSpeedCpsRef?: { current: number } | undefined
  followRevealedCharsRef?: { current: number } | undefined
  followRevealScaleRef?: { current: number } | undefined
  onPredictiveChange?: ((predictive: boolean) => void) | undefined
  /** Reports whether the final text arm still has visible reveal work. */
  onRevealActivityChange?: ((active: boolean) => void) | undefined
  preset: StreamSmoothingPreset
  shouldHoldBack: () => boolean
}

/** Conservative fallback before the streaming Markdown tail has geometry. */
const PREDICTIVE_WRAP_FALLBACK_CHARS = 32
const STREAM_ANNOUNCEMENT_INTERVAL_MS = 800
const STREAM_ANNOUNCEMENT_MAX_CHARS = 320

interface PendingTextGeometry {
  root: HTMLElement
  visibleText: string
  fontSize: number
  wrapThresholdWidth: number | null
}

function approximateInlineWidth(text: string, emPx: number): number {
  let width = 0
  for (const char of text) {
    if (/\s/u.test(char)) width += emPx * 0.33
    else if (/^[\x00-\x7f]$/u.test(char)) width += emPx * 0.56
    else width += emPx
  }
  return width
}


/** Whether buffered source can reach a new visual line before it drains. */
function pendingTextCanGrow(
  root: HTMLElement | null,
  visibleText: string,
  pending: string,
  geometryRef: { current: PendingTextGeometry | null },
): boolean {
  if (pending === '') return false
  if (/[\r\n]/u.test(pending)) return true
  const pendingChars = [...pending]
  if (pendingChars.length >= PREDICTIVE_WRAP_FALLBACK_CHARS) return true
  if (root === null) return false

  let geometry = geometryRef.current
  if (geometry?.root !== root) {
    const rootWidth = root.clientWidth || 600
    geometry = { root, visibleText, fontSize: 14, wrapThresholdWidth: Math.max(120, rootWidth * 0.4) }
    geometryRef.current = geometry
  }
  return approximateInlineWidth(pending, geometry.fontSize) >= (geometry.wrapThresholdWidth ?? (geometry.fontSize * PREDICTIVE_WRAP_FALLBACK_CHARS))
}

function announcementChunkEnd(source: string, start: number): number {
  const hardEnd = Math.min(source.length, start + STREAM_ANNOUNCEMENT_MAX_CHARS)
  if (hardEnd === source.length) return hardEnd
  const softStart = start + Math.floor(STREAM_ANNOUNCEMENT_MAX_CHARS * 0.6)
  for (let index = hardEnd - 1; index >= softStart; index -= 1) {
    if (/[\s.,;:!?]/u.test(source[index] ?? '')) return index + 1
  }
  return hardEnd
}

/** Pace screen-reader updates independently from visual reveal frames. */
interface StreamAnnouncementState {
  text: string
  revision: number
  present: boolean
}

/** A commit-driven live region isolated from the visible Markdown subtree. */
const StreamAnnouncement = memo(function StreamAnnouncement({
  text,
  active,
}: {
  text: string
  active: boolean
}) {
  const [announcement, setAnnouncement] = useState<StreamAnnouncementState>({
    text: '',
    revision: 0,
    present: active,
  })
  const sourceRef = useRef(text)
  const activeRef = useRef(active)
  const announcedOffsetRef = useRef(active ? 0 : text.length)
  const drainSourceRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearTimer = (): void => {
      if (timerRef.current === null) return
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const publishNext = (source: string): boolean => {
      const start = Math.min(announcedOffsetRef.current, source.length)
      const end = announcementChunkEnd(source, start)
      if (end <= start) return false
      announcedOffsetRef.current = end
      setAnnouncement(previous => ({
        text: source.slice(start, end),
        revision: previous.revision + 1,
        present: true,
      }))
      return end < source.length
    }

    const hideAfterLinger = (): void => {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (activeRef.current) return
        drainSourceRef.current = null
        setAnnouncement(previous => ({ ...previous, present: false }))
      }, STREAM_ANNOUNCEMENT_INTERVAL_MS)
    }

    const drainNext = (): void => {
      const source = drainSourceRef.current
      if (source === null) return
      if (!publishNext(source)) {
        hideAfterLinger()
        return
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (activeRef.current) return
        drainNext()
      }, STREAM_ANNOUNCEMENT_INTERVAL_MS)
    }

    const scheduleLive = (): void => {
      if (timerRef.current !== null || announcedOffsetRef.current >= sourceRef.current.length) return
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (!activeRef.current) return
        const source = sourceRef.current
        if (publishNext(source)) scheduleLive()
      }, STREAM_ANNOUNCEMENT_INTERVAL_MS)
    }

    const wasActive = activeRef.current
    const previousSource = sourceRef.current
    const continuingDrain = !active && !wasActive && drainSourceRef.current !== null
    if (
      !continuingDrain
      && (!text.startsWith(previousSource) || announcedOffsetRef.current > text.length)
    ) {
      announcedOffsetRef.current = 0
    }
    sourceRef.current = text
    activeRef.current = active

    if (active) {
      if (!wasActive) {
        clearTimer()
        drainSourceRef.current = null
        setAnnouncement(previous => ({
          text: '',
          revision: previous.revision + 1,
          present: true,
        }))
      }
      scheduleLive()
      return
    }

    if (!wasActive) {
      if (drainSourceRef.current === null) announcedOffsetRef.current = text.length
      return
    }

    clearTimer()
    drainSourceRef.current = text
    drainNext()
  }, [active, text])

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  if (!active && !announcement.present) return null
  const activating = active && !activeRef.current
  return (
    <span
      className={css.visuallyHidden}
      aria-live="polite"
      aria-atomic="true"
    >
      <span key={announcement.revision}>{activating ? '' : announcement.text}</span>
    </span>
  )
})

/**
 * Smooth streaming text arm. While the reply runs, the accumulated source is
 * revealed through the smoother at a rate that tracks the model's arrival
 * and rendered by the Harness `MarkdownText`
 * streaming arm (incremental parse, frozen non-tail blocks), so there is no
 * raw-text tail and no text-to-markdown swap: the tree stays markdown
 * throughout. The outer assistant owner follows all text growth, including
 * the final drain, so wraps glide without a completion handoff. Once the
 * queue drains, the settled full parse (KaTeX math, fence highlighting, file
 * mentions) swaps in exactly once.
 */
function AnimatedMarkdownText({
  text,
  labels,
  fileMentions,
  streaming,
  logarithmicFade,
  motionReduced,
  followSpeedCpsRef,
  followRevealedCharsRef,
  followRevealScaleRef,
  onPredictiveChange,
  onRevealActivityChange,
  preset,
  shouldHoldBack,
}: AnimatedMarkdownTextProps) {
  const reduced = motionReduced
  const [typing, setTyping] = useState(streaming)
  const localSpeedCpsRef = useRef(35)
  const followRootRef = useRef<HTMLDivElement>(null)
  const predictionSourceRef = useRef<string | null>(null)
  const predictionStateRef = useRef(false)
  const predictionGeometryRef = useRef<PendingTextGeometry | null>(null)
  const speedCpsRef = followSpeedCpsRef ?? localSpeedCpsRef
  const displayed = useSmoothStreamContent(text, {
    enabled: typing && !reduced,
    inputComplete: !streaming,
    preset,
    shouldHoldBack,
    speedCpsRef,
    revealedCharsRef: followRevealedCharsRef,
    revealScaleRef: followRevealScaleRef,
    onRevealCommit: () => { notifyFollowCommit(followRootRef.current) },
  })
  const shown = reduced ? text : displayed
  const live = typing && !reduced
  const markdownShown = useDecoupledMarkdown(shown, live)
  useLogarithmicFade(followRootRef, logarithmicFade && !reduced, live, speedCpsRef)

  useEffect(() => {
    const root = followRootRef.current
    if (root === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (predictionGeometryRef.current?.root === root) predictionGeometryRef.current = null
    })
    observer.observe(root)
    return () => { observer.disconnect() }
  }, [])

  useLayoutEffect(() => {
    if (onPredictiveChange === undefined) return
    const pending = text.slice(shown.length)
    const sourceChanged = predictionSourceRef.current !== text
    const next = !live || !streaming || pending === ''
      ? false
      : sourceChanged
        ? pendingTextCanGrow(followRootRef.current, shown, pending, predictionGeometryRef)
        : predictionStateRef.current
    predictionSourceRef.current = text
    predictionStateRef.current = next
    onPredictiveChange(next)
  }, [live, onPredictiveChange, shown, streaming, text])

  useLayoutEffect(() => {
    onRevealActivityChange?.(live)
  }, [live, onRevealActivityChange])

  // The stream closed: keep revealing the remaining queue, then swap to the
  // settled parse exactly once. The markdown tree stays mounted until then.
  useEffect(() => {
    if (typing && !streaming && shown.length === text.length) setTyping(false)
  }, [shown, streaming, text, typing])

  // A row can mount before the projection flips its assistant step to
  // `running`, which would freeze `typing` at false forever and leave the
  // reveal engine off for the whole reply. Re-arm on the rising edge so late
  // stream starts are still smoothed. (Adopted from #22 by @Zn-Dk.)
  useEffect(() => {
    if (streaming) setTyping(true)
  }, [streaming])

  if (!streaming && !live && text.trim() === '') return null

  return (
    <div ref={followRootRef} className={css.follow} data-follow-text="">
      <MarkdownText
        // `shown` stays authoritative through the completion drain: the
        // settled parse swaps in only when the queue has actually emptied.
        // Rendering `text` early bypasses the drain and teleports the tail.
        text={live ? markdownShown : text}
        streaming={live}
        labels={labels}
        fileMentions={live ? undefined : fileMentions}
      />
    </div>
  )
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
  preset,
  thinkAutoExpand,
  motionReduced,
  logarithmicFade,
  shouldHoldBack,
  followSpeedCpsRef,
  followRevealScaleRef,
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
  preset: StreamSmoothingPreset
  thinkAutoExpand: boolean
  motionReduced: boolean
  logarithmicFade: boolean
  shouldHoldBack: () => boolean
  followSpeedCpsRef?: { current: number } | undefined
  followRevealScaleRef?: { current: number } | undefined
  t: AssistantProps['t']
}) {
  const reduced = motionReduced
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
  const localFadeSpeedRef = useRef(35)
  const fadeSpeedRef = followSpeedCpsRef ?? localFadeSpeedRef
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
  const displayed = useSmoothStreamContent(text, {
    enabled: running && !reduced,
    preset,
    shouldHoldBack,
    speedCpsRef: fadeSpeedRef,
    revealScaleRef: followRevealScaleRef,
    onRevealCommit: () => { notifyFollowCommit(commitAnchorRef.current) },
  })
  const shown = running && !reduced ? displayed : text
  // The fade and the settle lag belong to whichever box the reader sees.
  useLogarithmicFade(activeRef, logarithmicFade && !reduced, running, fadeSpeedRef)

  useLayoutEffect(() => {
    // Nothing expands the body on its own any more: the live reasoning streams
    // through the inline row box, and only a row click opens the full body, so
    // a manual toggle is never wrestled back by the stream.
    if (running) {
      userScrolledRef.current = false
    }
    // A commit that changes this block's height must hand the follower its
    // correction in the SAME task, before the grown-but-uncompensated frame
    // can reach a paint.
    notifyFollowCommit(commitAnchorRef.current)
  }, [running])

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
  }, [running, expanded, thinkAutoExpand, preset, logarithmicFade, reduced])

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
  }, [running, turnStreaming, expanded, preset])

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

  // Preserve FollowHost's layout wrapper without mounting a second scroll owner.
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
          <div ref={fadeRootRef} className={css.thinkBody}>{shown}</div>
        </AnimatedDisclosure>
      </div>
    </div>
  )
}

/**
 * Assistant node renderer for the typewriter overlay. Text observed while
 * streaming is revealed by the smoother through the Harness Markdown
 * renderer at a rate that tracks arrival. Reasoning blocks keep the
 * built-in Think disclosure and only receive a smoothed text feed; the
 * outer node owns conversation-port follow through both streaming and the
 * final text drain. Keeping one owner avoids a lifecycle handoff that would
 * reopen and later retire a second runway. The FPS guard holds offscreen
 * reveals when the frame rate is degraded. Settled text renders with the full
 * Markdown pipeline.
 */
export const TypewriterAssistantNodeView = memo(function TypewriterAssistantNodeView({
  mode: _mode = DEFAULT_STREAM_CONFIG.mode,
  preset = DEFAULT_STREAM_CONFIG.preset,
  revealCharsPerSec: _revealCharsPerSec = DEFAULT_STREAM_CONFIG.revealCharsPerSec,
  scrollSpeedPxPerSec: _scrollSpeedPxPerSec = DEFAULT_STREAM_CONFIG.scrollSpeedPxPerSec,
  maxScrollSpeedPxPerSec: _maxScrollSpeedPxPerSec = DEFAULT_STREAM_CONFIG.maxScrollSpeedPxPerSec,
  thinkAutoExpand = DEFAULT_STREAM_SETTINGS.thinkAutoExpand,
  logarithmicFade = DEFAULT_STREAM_SETTINGS.logarithmicFade,
  controlScroll = true,
  motionPreference = DEFAULT_STREAM_SETTINGS.motionPreference,
  node,
  groupPart,
  useTurnData,
  openFile,
  loadImage,
  fileMentions,
  turnProcess,
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
  mode?: StreamMode
  preset?: StreamSmoothingPreset
  revealCharsPerSec?: number
  scrollSpeedPxPerSec?: number
  maxScrollSpeedPxPerSec?: number
  thinkAutoExpand?: boolean
  logarithmicFade?: boolean
  controlScroll?: boolean
  motionPreference?: StreamMotionPreference
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
  // dsh 0.2.x mounts this view twice on the same conversation scrollport —
  // the reasoning row above and the response row below. Handing the port to
  // whichever row carries the streaming tail still left the think phase
  // jumpy: while reasoning streamed, the reasoning-row host owned the port
  // from a mid-transcript anchor (the empty response row and the turn status
  // render below it), and the viewport hopped upward as the glide steered
  // toward positions its bottom-row tuning does not describe. The response
  // row is the geometric bottom row for the whole turn, so owning it from
  // the first streamed block reproduces the 0.1.x single-row configuration
  // the glide was tuned for: think growth happens above the anchor, the
  // text reveal grows inside it, and ownership never flips mid-turn. The
  // reasoning row never touches the port — its think box paces its own
  // reveal and auto-scrolls internally. 0.1.x mounts a single row
  // (groupPart undefined) and keeps the previous behavior.
  const rowOwnsPort = groupPart !== 'reasoning'
  const reduced = useMotionReduced(motionPreference)
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
  const { ref: guardRef, shouldHoldBack } = useFpsGuard(streaming)
  const rootSpeedRef = useRef(35)
  const rootRevealedCharsRef = useRef(0)
  const rootRevealScaleRef = useRef(1)
  const previousStreamingRef = useRef(streaming)
  const [textRevealActive, setTextRevealActive] = useState(false)
  const completionCandidate = !streaming
    && previousStreamingRef.current
    && blocks.some(block => block.kind === 'text' && block.text.trim() !== '')
  useLayoutEffect(() => {
    previousStreamingRef.current = streaming
  }, [streaming])
  const updateTextRevealActivity = useCallback((active: boolean): void => {
    setTextRevealActive(previous => previous === active ? previous : active)
  }, [])
  const reasoningTailIndex = streaming && blocks[blocks.length - 1]?.kind === 'reasoning'
    ? blocks.length - 1
    : -1
  const reasoningOwnsSpeed = reasoningTailIndex !== -1
  const rootPredictiveRef = useRef(false)
  const previousReasoningTailRef = useRef(-1)
  if (reasoningTailIndex !== previousReasoningTailRef.current) {
    // Think growth is already paced by its own text reveal. Opening additional
    // speculative runway here exposes that runway as an empty gap above the
    // fixed turn status, especially when reasoning arrives in fast bursts.
    // The follower still smooths real height growth within the measured gap
    // and catches up any unsafe remainder in the same frame.
    rootPredictiveRef.current = false
    if (!reasoningOwnsSpeed) rootSpeedRef.current = 35
    previousReasoningTailRef.current = reasoningTailIndex
  }
  const updateTextPrediction = useMemo(
    () => (predictive: boolean): void => { rootPredictiveRef.current = predictive },
    [],
  )
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
  const announcementText = blocks
    .filter(block => block.kind === 'text')
    .map(block => block.text)
    .join('\n')
  // 0.2.x reasoning rows see a blocks array filtered to reasoning only, so
  // `index === last` stays true while a later tool-call or text block runs in
  // the same step — the disclosure then waits for the whole step to settle
  // before snapping shut, and that late full-height collapse jumps the page.
  // Tail-ness must be judged against the ORIGINAL step blocks: any later
  // block of any kind closes the think box promptly, exactly as the 0.1.x
  // single-row layout did by construction.
  const stepTailIsReasoning = data.blocks[data.blocks.length - 1]?.kind === 'reasoning'

  const rendered: ReactNode[] = []
  const last = blocks.length - 1
  let lastFollow = -1
  let lastText = -1
  for (let index = 0; index < blocks.length; index += 1) {
    const kind = blocks[index]?.kind
    if (kind === 'text' || kind === 'reasoning') lastFollow = index
    if (kind === 'text') lastText = index
  }
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block === undefined) continue
    switch (block.kind) {
      case 'text':
        if (!streaming && block.text.trim() === '') break
        rendered.push(
          <AnimatedMarkdownText
            key={index}
            text={block.text}
            labels={markdownLabels}
            fileMentions={mentions}
            streaming={streaming}
            logarithmicFade={logarithmicFade && data.status !== 'interrupted'}
            motionReduced={reduced}
            followSpeedCpsRef={index === lastFollow ? rootSpeedRef : undefined}
            followRevealedCharsRef={index === lastFollow ? rootRevealedCharsRef : undefined}
            followRevealScaleRef={index === lastFollow ? rootRevealScaleRef : undefined}
            onPredictiveChange={index === lastFollow ? updateTextPrediction : undefined}
            onRevealActivityChange={index === lastText ? updateTextRevealActivity : undefined}
            preset={preset}
            shouldHoldBack={shouldHoldBack}
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
              preset={preset}
              thinkAutoExpand={thinkAutoExpand}
              logarithmicFade={logarithmicFade && data.status !== 'interrupted'}
              motionReduced={reduced}
              shouldHoldBack={shouldHoldBack}
              followSpeedCpsRef={reasoningOwnsSpeed && index === last ? rootSpeedRef : undefined}
              followRevealScaleRef={reasoningOwnsSpeed && index === last ? rootRevealScaleRef : undefined}
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
    <div ref={guardRef} className={css.root} data-streaming={streaming || undefined}>
      <StreamAnnouncement text={announcementText} active={streaming && !reduced} />
      <FollowHost
        // The status can close before its final text arm drains. Retain this
        // same owner across that boundary; the candidate bridges the one
        // layout commit before the child reports its live reveal state.
        active={!reduced && (streaming || completionCandidate || textRevealActive)}
        speedCpsRef={rootSpeedRef}
        revealedCharsRef={rootRevealedCharsRef}
        revealScaleRef={rootRevealScaleRef}
        predictiveRef={rootPredictiveRef}
        controlScroll={controlScroll && rowOwnsPort}
      >
        <div className={css.body}>
          {rendered}
          {data.status === 'interrupted' && <span className={css.stopped}>{t('message.stopped')}</span>}
        </div>
      </FollowHost>
    </div>
  )
})
