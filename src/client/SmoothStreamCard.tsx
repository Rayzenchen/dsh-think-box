/**
 * The smooth-stream plugin configuration card. Preferences are staged until
 * the user saves — the same shape as the Host-shipped cards, hand-drawn
 * because the Host cards' chrome is not exported for reuse.
 *
 * Where it renders depends on the Harness generation: up to 0.2.0 it was a card
 * on the Web Settings "plugin configuration" page (`settings.plugin.item`);
 * 0.2.1 moved plugin configuration onto the sidebar Plugins page, where a
 * bundle registers `plugins.bundle.config` keyed by its package name and the
 * page renders it between the bundle description and its rows. Both
 * registrations live in `index.ts`; this module stays slot-agnostic.
 */

import { useState } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDown, IconRefresh } from './harnessIcons.ts'
import type { SmoothStreamCardFace } from './smooth-stream-card-controller.ts'
import css from './SmoothStreamCard.module.css'

/**
 * Props the renderer binds for the smooth-stream card: the locale dictionary
 * plus the face injected by the controller. Deliberately free of per-slot
 * types — the two registrations target SlotMaps from different Harness
 * generations, and the pinned type packages cannot describe both.
 */
export type SmoothStreamCardProps =
  PropsLocale<'settings.smoothStream'>
  & InjectFace<SmoothStreamCardFace>

/** Render the smooth-stream card independently of the core settings namespace allowlist. */
export function SmoothStreamCard(props: SmoothStreamCardProps) {
  const { t } = props
  const [open, setOpen] = useState(false)
  const state = props.useSmoothStreamCard(snapshot => snapshot)
  const blocked = !state.dirty || state.saving || state.status !== 'ready'
  const versionLabel = state.version === undefined
    ? null
    : t(state.installation === 'development' ? 'developmentVersion' : 'version')
      .replace('{version}', state.version)

  return (
    <li className={open ? `${css.card} ${css.cardOpen}` : css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        {versionLabel === null ? null : <span className={css.version}>{versionLabel}</span>}
        {state.dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
        <IconChevronDown className={open ? `${css.chevron} ${css.chevronOpen}` : css.chevron} />
      </button>
      {open
        ? (
          <div className={css.body}>
            {state.status === 'loading' ? <p className={css.readOnly} role="status">{t('loading')}</p> : null}
            {state.status === 'unavailable' ? (
              <div className={css.failure}>
                <p className={css.readOnly} role="status">{t('unavailable')}</p>
                <button type="button" className={css.discard} onClick={props.reload}>{t('retry')}</button>
              </div>
            ) : null}
            {state.status === 'ready' ? (
              <>
                {!state.writable ? <p className={css.readOnly} role="status">{t('readOnly')}</p> : null}
                <label className={css.field}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('enabled')}</span>
                    <input
                      type="checkbox"
                      className={css.toggle}
                      checked={state.enabled}
                      disabled={!state.writable || state.saving}
                      onChange={(event) => { props.edit({ enabled: event.target.checked }) }}
                    />
                  </span>
                  <span className={css.hint}>{t('enabledHint')}</span>
                </label>
                <label className={state.enabled ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('controlScroll')}</span>
                    <input
                      type="checkbox"
                      className={css.toggle}
                      checked={state.controlScroll}
                      disabled={!state.writable || state.saving || !state.enabled}
                      onChange={(event) => { props.edit({ controlScroll: event.target.checked }) }}
                    />
                  </span>
                  <span className={css.hint}>{t('controlScrollHint')}</span>
                </label>
                <label className={state.enabled ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('logarithmicFade')}</span>
                    <input
                      type="checkbox"
                      className={css.toggle}
                      checked={state.logarithmicFade}
                      disabled={!state.writable || state.saving || !state.enabled}
                      onChange={(event) => { props.edit({ logarithmicFade: event.target.checked }) }}
                    />
                  </span>
                  <span className={css.hint}>{t('logarithmicFadeHint')}</span>
                </label>
                {/* Motion preference is a radio group, so this row is a div:
                    nesting the choice labels inside a field <label> would be
                    illegal HTML (label within label) and browsers route the
                    inner click away, so React never sees onChange. */}
                <div className={state.enabled ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('motionPreference')}</span>
                  </span>
                  <span className={css.hint}>{t('motionPreferenceHint')}</span>
                  <span className={css.choiceRow} role="radiogroup" aria-label={t('motionPreference')}>
                    {([
                      ['auto', 'motionAuto', 'motionAutoHint'],
                      ['force-smooth', 'motionForceSmooth', 'motionForceSmoothHint'],
                      ['force-reduced', 'motionForceReduced', 'motionForceReducedHint'],
                    ] as const).map(([value, label, hint]) => (
                      <label key={value} className={css.choice} title={t(hint)}>
                        <input
                          type="radio"
                          className={css.choiceInput}
                          name="smooth-stream-motion"
                          checked={state.motionPreference === value}
                          disabled={!state.writable || state.saving || !state.enabled}
                          onChange={() => { props.edit({ motionPreference: value }) }}
                        />
                        {t(label)}
                      </label>
                    ))}
                  </span>
                </div>
                <div className={state.enabled ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('preset')}</span>
                  </span>
                  <span className={css.hint}>{t('presetHint')}</span>
                  <span className={css.choiceRow} role="radiogroup" aria-label={t('preset')}>
                    {([
                      ['realtime', 'presetRealtime', 'presetRealtimeHint'],
                      ['balanced', 'presetBalanced', 'presetBalancedHint'],
                      ['silky', 'presetSilky', 'presetSilkyHint'],
                    ] as const).map(([value, label, hint]) => (
                      <label key={value} className={css.choice} title={t(hint)}>
                        <input
                          type="radio"
                          className={css.choiceInput}
                          name="smooth-stream-preset"
                          checked={state.preset === value}
                          disabled={!state.writable || state.saving || !state.enabled}
                          onChange={() => { props.edit({ preset: value }) }}
                        />
                        {t(label)}
                      </label>
                    ))}
                  </span>
                </div>
                <label className={state.enabled ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('thinkAutoExpand')}</span>
                    <input
                      type="checkbox"
                      className={css.toggle}
                      checked={state.thinkAutoExpand}
                      disabled={!state.writable || state.saving || !state.enabled}
                      onChange={(event) => { props.edit({ thinkAutoExpand: event.target.checked }) }}
                    />
                  </span>
                  <span className={css.hint}>{t('thinkAutoExpandHint')}</span>
                </label>
                <label className={state.debugAvailable ? css.field : `${css.field} ${css.fieldDisabled}`}>
                  <span className={css.fieldHead}>
                    <span className={css.label}>{t('debugEnabled')}</span>
                    <input
                      type="checkbox"
                      className={css.toggle}
                      checked={state.debugEnabled}
                      disabled={!state.debugAvailable || !state.writable || state.saving}
                      onChange={(event) => { props.edit({ debugEnabled: event.target.checked }) }}
                    />
                  </span>
                  <span className={css.hint}>{state.debugAvailable ? t('debugEnabledHint') : t('debugUnavailable')}</span>
                </label>
                <div className={css.updateRow}>
                  <span className={css.updateCopy}>
                    <span className={css.label}>{t('updates')}</span>
                    <span className={css.hint}>
                      {state.restartRequired
                        ? t('restartRequired')
                        : state.installation === 'npm' ? t('updateHint')
                          : state.installation === 'development' ? t('developmentBuild') : t('updateUnavailable')}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={css.update}
                    disabled={!state.canUpgrade || state.upgrading || state.restartRequired}
                    title={state.canUpgrade ? undefined : t('updateUnavailable')}
                    onClick={props.upgrade}
                  >
                    <span aria-hidden="true"><IconRefresh /></span>
                    {t(state.upgrading ? 'updating' : 'update')}
                  </button>
                </div>
                {state.upgradeFailed ? <p className={css.failed} role="status">{t('updateFailed')}</p> : null}
                <div className={css.footer}>
                  {state.failed ? <p className={css.failed} role="status">{t('saveFailed')}</p> : null}
                  <button
                    type="button"
                    className={css.discard}
                    disabled={!state.dirty || state.saving}
                    onClick={props.discard}
                  >
                    {t('discard')}
                  </button>
                  <button
                    type="button"
                    className={css.save}
                    disabled={blocked}
                    onClick={props.save}
                  >
                    {t(state.saving ? 'saving' : 'save')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )
        : null}
    </li>
  )
}

/**
 * Props a 0.2.1+ Plugins page passes into a bundle configuration entry: the
 * card props above plus the view mode the page asks for (`'page'` on the
 * bundle detail page; `'summary'` is reserved for official-plugin cards).
 */
export type SmoothStreamConfigPageProps =
  SmoothStreamCardProps
  & { view?: 'page' | 'summary' }

/**
 * `plugins.bundle.config` entry for Harness 0.2.1+.
 *
 * The sidebar Plugins page renders the entry inside its own section container
 * (`view: 'page'`), so the entry restores the plain list that the removed
 * settings page used to draw around registered cards. The card stays an
 * `<li>`; only its list chrome moves here.
 */
export function SmoothStreamConfigPage(props: SmoothStreamConfigPageProps) {
  if (props.view === 'summary') return null
  return (
    <ul className={css.pluginPageList}>
      <SmoothStreamCard {...props} />
    </ul>
  )
}
