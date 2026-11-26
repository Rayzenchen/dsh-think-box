/**
 * The think-box plugin configuration card. Preferences are staged until
 * the user saves: the total switch and the inline reasoning box's auto-follow.
 * Translation settings live in their own channel below them.
 */

import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThinkBoxCardFace, TranslationCardState } from './think-box-card-controller.ts'
import type { TranslationConfig } from '../config.ts'
import type { TranslationCatalog } from '../translation-protocol.ts'
import { TranslationModelPicker } from './TranslationModelPicker.tsx'
import type { ThinkBoxLocaleKey } from './locales.ts'
import css from './ThinkBoxCard.module.css'

/**
 * Props the renderer binds for the think-box card: the locale dictionary
 * plus the face injected by the controller. Deliberately free of per-slot
 * types — the pinned type packages cannot describe the Plugins-page slot.
 */
export type ThinkBoxCardProps =
  PropsLocale<'settings.thinkBox'>
  & InjectFace<ThinkBoxCardFace>

/** Render the think-box card independently of the core settings namespace allowlist. */
export function ThinkBoxCard(props: ThinkBoxCardProps) {
  const { t } = props
  const state = props.useThinkBoxCard(snapshot => snapshot)
  const translation = props.useTranslationCard(snapshot => snapshot)
  const blocked = !state.dirty || state.saving || state.status !== 'ready'

  return (
    <li className={css.card}>
      <div className={css.header}>
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        {state.dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
      </div>
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
        <TranslationChannel
          t={t}
          translation={translation}
          edit={props.editTranslation}
          save={props.saveTranslation}
          discard={props.discardTranslation}
          reload={props.reloadTranslation}
          loadCatalog={props.loadTranslationCatalog}
        />
      </div>
    </li>
  )
}

/**
 * Translation-channel form. Kept independent of the durable think-box
 * settings so it works even where the deployment stores those read-only: it
 * writes the plugin-owned runtime store through its own loopback RPC.
 */
function TranslationChannel(props: {
  t: (key: ThinkBoxLocaleKey) => string
  translation: TranslationCardState
  edit: (patch: Partial<TranslationConfig>) => void
  save: () => void
  discard: () => void
  reload: () => void
  loadCatalog: (signal?: AbortSignal) => Promise<TranslationCatalog>
}) {
  const { t, translation } = props
  const settings = translation.settings
  const disabled = translation.saving
  return (
    <div className={css.translation}>
      <div className={css.translationHead}>
        <span className={css.label}>{t('translationTitle')}</span>
        {translation.dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
      </div>
      <span className={css.hint}>{t('translationHint')}</span>
      {translation.status === 'loading' ? <p className={css.readOnly} role="status">{t('translationLoading')}</p> : null}
      {translation.status === 'unavailable' ? (
        <div className={css.failure}>
          <p className={css.readOnly} role="status">{t('translationUnavailable')}</p>
          <button type="button" className={css.discard} onClick={props.reload}>{t('retry')}</button>
        </div>
      ) : null}
      {translation.status === 'ready' ? (
        <>
          <label className={css.field}>
            <span className={css.fieldHead}>
              <span className={css.label}>{t('translationBackend')}</span>
              <select
                className={css.selectInput}
                value={settings.backend}
                disabled={disabled}
                onChange={(event) => { props.edit({ backend: event.target.value === 'bundle' ? 'bundle' : 'llm' }) }}
              >
                <option value="llm">{t('translationBackendLlm')}</option>
                <option value="bundle">{t('translationBackendBundle')}</option>
              </select>
            </span>
            <span className={css.hint}>{t('translationBackendHint')}</span>
          </label>
          <div className={css.field}>
            <TranslationModelPicker
              t={t}
              provider={settings.provider}
              model={settings.model}
              reasoningEffort={settings.reasoningEffort}
              backend={settings.backend}
              disabled={disabled}
              loadCatalog={props.loadCatalog}
              onSelect={(patch) => { props.edit(patch) }}
            />
          </div>
          <label className={css.field}>
            <span className={css.fieldHead}>
              <span className={css.label}>{t('translationTargetLanguage')}</span>
              <input
                className={css.textInput}
                type="text"
                value={settings.targetLanguage}
                placeholder="auto"
                disabled={disabled}
                onChange={(event) => { props.edit({ targetLanguage: event.target.value }) }}
              />
            </span>
            <span className={css.hint}>{t('translationTargetLanguageHint')}</span>
          </label>
          <label className={css.field}>
            <span className={css.fieldHead}>
              <span className={css.label}>{t('translationMaxTextChars')}</span>
              <input
                className={css.numberInput}
                type="number"
                min={64}
                step={100}
                value={settings.maxTextChars}
                disabled={disabled}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10)
                  if (Number.isFinite(next)) props.edit({ maxTextChars: next })
                }}
              />
            </span>
            <span className={css.hint}>{t('translationMaxTextCharsHint')}</span>
          </label>
          <label className={css.field}>
            <span className={css.fieldHead}>
              <span className={css.label}>{t('translationAutoTranslate')}</span>
              <input
                type="checkbox"
                className={css.toggle}
                checked={settings.autoTranslate}
                disabled={disabled}
                onChange={(event) => { props.edit({ autoTranslate: event.target.checked }) }}
              />
            </span>
            <span className={css.hint}>{t('translationAutoTranslateHint')}</span>
          </label>
          <div className={css.translationActions}>
            {translation.failed ? <p className={css.failed} role="status">{t('translationSaveFailed')}</p> : null}
            <button
              type="button"
              className={css.discard}
              disabled={!translation.dirty || disabled}
              onClick={props.discard}
            >
              {t('discard')}
            </button>
            <button
              type="button"
              className={css.save}
              disabled={!translation.dirty || disabled}
              onClick={props.save}
            >
              {t(translation.saving ? 'saving' : 'save')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Props a 0.2.1+ Plugins page passes into a bundle configuration entry: the
 * card props above plus the view mode the page asks for (`'page'` on the
 * bundle detail page; `'summary'` is reserved for official-plugin cards).
 */
export type ThinkBoxConfigPageProps =
  ThinkBoxCardProps
  & { view?: 'page' | 'summary' }

/**
 * `plugins.bundle.config` entry for Harness 0.2.1+.
 *
 * The sidebar Plugins page renders the entry inside its own section container
 * (`view: 'page'`), so the entry restores the plain list that the removed
 * settings page used to draw around registered cards. The card stays an
 * `<li>`; only its list chrome moves here.
 */
export function ThinkBoxConfigPage(props: ThinkBoxConfigPageProps) {
  if (props.view === 'summary') return null
  return (
    <ul className={css.pluginPageList}>
      <ThinkBoxCard {...props} />
    </ul>
  )
}
