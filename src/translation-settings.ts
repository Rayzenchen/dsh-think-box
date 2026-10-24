/**
 * Runtime, user-editable translation settings for the think box.
 *
 * The plugin entry config (bundle config layer) only seeds these values; after
 * the first launch the file under the DSH home is the source of truth, so the
 * Plugins page can change the route without a harness restart. The store is
 * deliberately dependency-free so the Host bridge and its tests share it.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DEFAULT_TRANSLATION_CONFIG, type TranslationConfig } from './config.ts'

/** One validated translation configuration. */
export type TranslationSettings = TranslationConfig

/** Defaults used before any file or seeded entry config exists. */
export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = DEFAULT_TRANSLATION_CONFIG

/** Saved settings, read on start and rewritten by the settings RPC. */
export interface TranslationSettingsStore {
  /** Current validated settings (never mutated in place). */
  snapshot(): TranslationSettings
  /** Merge and persist one validated patch, returning the new settings. */
  update(patch: unknown): TranslationSettings
}

/** Invalid patch or stored file content. */
export class TranslationSettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranslationSettingsError'
  }
}

const BACKENDS = ['bundle', 'llm'] as const

function stringField(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== 'string') throw new TranslationSettingsError(`${field} must be a string`)
  const trimmed = value.trim()
  if (!allowEmpty && trimmed === '') throw new TranslationSettingsError(`${field} must not be empty`)
  return trimmed
}

function integerField(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new TranslationSettingsError(`${field} must be an integer between ${min} and ${max}`)
  }
  return value
}

/**
 * Merge one untrusted patch over a validated base.
 * @param base - current settings.
 * @param patch - partial settings to validate; unknown keys are ignored.
 * @returns the merged settings.
 */
export function mergeTranslationSettings(
  base: TranslationSettings,
  patch: unknown,
): TranslationSettings {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    throw new TranslationSettingsError('translation settings must be an object')
  }
  const value = patch as Record<string, unknown>
  const next: { -readonly [K in keyof TranslationSettings]: TranslationSettings[K] } = { ...base }
  if (value.backend !== undefined) {
    if (!BACKENDS.includes(value.backend as (typeof BACKENDS)[number])) {
      throw new TranslationSettingsError('backend must be "bundle" or "llm"')
    }
    next.backend = value.backend as TranslationSettings['backend']
  }
  if (value.provider !== undefined) next.provider = stringField(value.provider, 'provider')
  if (value.model !== undefined) next.model = stringField(value.model, 'model')
  if (value.reasoningEffort !== undefined) {
    if (typeof value.reasoningEffort !== 'string') throw new TranslationSettingsError('reasoningEffort must be a string')
    next.reasoningEffort = value.reasoningEffort.trim()
  }
  if (value.targetLanguage !== undefined) {
    next.targetLanguage = stringField(value.targetLanguage, 'targetLanguage')
  }
  if (value.maxTextChars !== undefined) {
    next.maxTextChars = integerField(value.maxTextChars, 'maxTextChars', 64, 1_000_000)
  }
  if (value.maxTokens !== undefined) {
    next.maxTokens = integerField(value.maxTokens, 'maxTokens', 16, 1_000_000)
  }
  if (value.timeoutMs !== undefined) {
    next.timeoutMs = integerField(value.timeoutMs, 'timeoutMs', 1_000, 600_000)
  }
  if (value.autoTranslate !== undefined) {
    if (typeof value.autoTranslate !== 'boolean') throw new TranslationSettingsError('autoTranslate must be a boolean')
    next.autoTranslate = value.autoTranslate
  }
  return next
}

/**
 * Location of the persisted settings file, under the DSH home.
 * @param home - DSH home directory override (tests only).
 * @returns absolute file path.
 */
export function translationSettingsPath(home = process.env.DSH_HOME ?? join(homedir(), '.dsh')): string {
  return join(home, 'think-box', 'translation.json')
}

/**
 * Create the settings store: seeded by the entry config, then overlaid by the
 * persisted file when it exists and validates.
 * @param seed - entry config from the bundle patch.
 * @param path - persisted file path.
 * @returns the store used by the translation RPC.
 */
export function createTranslationSettingsStore(
  seed: TranslationSettings,
  path: string = translationSettingsPath(),
): TranslationSettingsStore {
  let current: TranslationSettings = { ...mergeTranslationSettings(DEFAULT_TRANSLATION_SETTINGS, seed) }
  try {
    current = mergeTranslationSettings(current, JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    // A missing or stale file keeps the seeded values; the card reports the
    // current state and the next save rewrites it.
  }
  return {
    snapshot: () => current,
    update: (patch) => {
      const next = mergeTranslationSettings(current, patch)
      mkdirSync(dirname(path), { recursive: true })
      const temporary = `${path}.${String(process.pid)}.tmp`
      writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`)
      renameSync(temporary, path)
      current = next
      return next
    },
  }
}
