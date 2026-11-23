import { DEFAULT_STREAM_DEBUG_TUNING } from '../src/settings.ts'

/**
 * The pure benchmark runs the stream engine outside a browser, so there is no
 * live renderer producing per-stream metrics. Callers treat a missing metric as
 * "diagnostics unavailable", which is exactly the pre-first-frame state.
 * @returns undefined, always: no metrics are recorded in the benchmark.
 */
export function readNewestStreamMetric(): undefined {
  return undefined
}

/** Browser diagnostics are intentionally absent from the pure benchmark. */
export const debugRuntime = {
  activeTuning: () => DEFAULT_STREAM_DEBUG_TUNING,
  reportFollow: () => {},
}
