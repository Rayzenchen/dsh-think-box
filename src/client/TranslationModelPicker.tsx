/**
 * Provider/model/reasoning picker for the translation channel.
 *
 * The Plugins page renders the card inside its own scroll container, so the
 * floating panel is portaled to `document.body` and positioned with `fixed`
 * coordinates measured from the trigger. It never nests an overflow-clipped
 * menu inside the form.
 *
 * Data comes from the Host catalog endpoint; selections are only staged with
 * `editTranslation` and land on disk through the channel's Save button.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  IconCheckOutline14,
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ThinkBoxLocaleKey } from './locales.ts'
import type {
  TranslationCatalog,
  TranslationCatalogModel,
  TranslationCatalogProvider,
} from '../translation-protocol.ts'
import css from './TranslationModelPicker.module.css'

/** Which pane the floating card shows. */
type Pane = 'root' | 'model' | 'effort'

/** Only a text model is offered for a text translation task. */
function isTextModel(model: TranslationCatalogModel): boolean {
  return model.inputModalities === undefined || model.inputModalities.includes('text')
}

/** Current-model lookup across the flattened catalog. */
function locate(catalog: TranslationCatalog | undefined, provider: string, model: string): {
  provider: TranslationCatalogProvider
  model: TranslationCatalogModel
} | undefined {
  if (catalog === undefined) return undefined
  for (const row of catalog.providers) {
    if (row.id !== provider) continue
    const found = row.models.find(item => item.id === model && isTextModel(item))
    if (found !== undefined) return { provider: row, model: found }
  }
  return undefined
}

/** Props the translation channel binds for the picker. */
export interface TranslationModelPickerProps {
  t: (key: ThinkBoxLocaleKey) => string
  provider: string
  model: string
  reasoningEffort: string
  backend: 'bundle' | 'llm'
  disabled: boolean
  loadCatalog: (signal?: AbortSignal) => Promise<TranslationCatalog>
  /** Stage one provider/model/effort choice; persistence stays with Save. */
  onSelect: (patch: { provider: string; model: string; reasoningEffort: string }) => void
}

/** Read the display names for a configuration, falling back to raw ids. */
function summaryOf(
  catalog: TranslationCatalog | undefined,
  provider: string,
  model: string,
  reasoningEffort: string,
): { provider: string, model: string, effort: string, text: string } {
  const current = locate(catalog, provider, model)
  const effortName = current === undefined
    ? reasoningEffort
    : current.model.reasoning === undefined
      ? ''
      : reasoningEffort === ''
        ? ''
        : current.model.reasoning.efforts.find(effort => effort.id === reasoningEffort)?.name ?? reasoningEffort
  const parts = [
    current?.provider.name ?? provider,
    current?.model.name ?? model,
    effortName,
  ].filter(part => part !== '')
  return {
    provider: current?.provider.name ?? provider,
    model: current?.model.name ?? model,
    effort: effortName,
    text: parts.join(' · '),
  }
}

/**
 * Render the collapsed model-route row and its floating catalog card.
 * @param props - staged configuration plus the lazy catalog reader.
 * @returns the trigger, or the bundle notice when the official backend is active.
 */
export function TranslationModelPicker({
  t,
  provider,
  model,
  reasoningEffort,
  backend,
  disabled,
  loadCatalog,
  onSelect,
}: TranslationModelPickerProps) {
  const [catalog, setCatalog] = useState<TranslationCatalog | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<Pane>('root')
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState<{ left: number, top: number, width: number, height: number } | undefined>(undefined)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  // The parent re-renders on every staged edit and may hand down a new
  // callback identity. Reading it through a ref keeps the catalog load keyed
  // by the backend/reload attempt, not by the parent's render cycle.
  const loadCatalogRef = useRef(loadCatalog)
  loadCatalogRef.current = loadCatalog
  const id = useId()

  const load = useCallback((signal: AbortSignal): void => {
    setStatus('loading')
    void loadCatalogRef.current(signal).then((next) => {
      if (signal.aborted) return
      setCatalog(next)
      setStatus('ready')
    }, () => {
      if (signal.aborted) return
      setStatus('error')
    })
  }, [])

  useEffect(() => {
    if (backend !== 'llm') return
    const controller = new AbortController()
    load(controller.signal)
    return () => { controller.abort() }
  }, [backend, load, attempt])

  const current = locate(catalog, provider, model)
  const summary = summaryOf(catalog, provider, model, reasoningEffort)
  const efforts = current?.model.reasoning?.efforts ?? []
  const effortChoices = useMemo(() => (current?.model.reasoning === undefined
    ? []
    : [
      ...(current.model.reasoning.defaultEffort === undefined
        ? [{ id: '', name: t('translationEffortDefault') }]
        : []),
      ...current.model.reasoning.efforts.map(effort => ({ id: effort.id, name: effort.name })),
    ]), [current, t])

  const filteredProviders = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (catalog?.providers ?? [])
      .map(providerRow => ({
        ...providerRow,
        models: providerRow.models.filter(modelRow => isTextModel(modelRow) && (
          needle === ''
          || modelRow.name.toLowerCase().includes(needle)
          || modelRow.id.toLowerCase().includes(needle)
          || providerRow.name.toLowerCase().includes(needle)
        )),
      }))
      .filter(providerRow => providerRow.models.length > 0)
  }, [catalog, query])
  const modelCount = useMemo(() => (catalog?.providers ?? [])
    .reduce((count, providerRow) => count + providerRow.models.filter(isTextModel).length, 0), [catalog])

  const measure = useCallback((): void => {
    const trigger = triggerRef.current
    if (trigger === null) return
    const bounds = trigger.getBoundingClientRect()
    const width = Math.min(Math.max(bounds.width, 320), Math.max(280, window.innerWidth - 16))
    const left = Math.min(Math.max(8, bounds.left), Math.max(8, window.innerWidth - width - 8))
    const wanted = 380
    const opensUp = bounds.bottom + 8 + wanted > window.innerHeight && bounds.top > window.innerHeight - bounds.bottom
    setRect({
      left,
      top: opensUp ? Math.max(8, bounds.top - 8 - wanted) : bounds.bottom + 6,
      width,
      height: Math.min(wanted, Math.max(220, (opensUp ? bounds.top : window.innerHeight - bounds.bottom) - 24)),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    const onScroll = (): void => { measure() }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, measure])

  const close = useCallback((): void => {
    setOpen(false)
    setPane('root')
    setQuery('')
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const outside = (event: Event): void => {
      const target = event.target as Node | null
      if (target === null) return
      if (cardRef.current?.contains(target) === true) return
      if (triggerRef.current?.contains(target) === true) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('pointerdown', outside) }
  }, [open])

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape' && open) close()
  }
  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    if (pane !== 'root') {
      setPane('root')
      setQuery('')
      return
    }
    close()
  }

  const chooseModel = (providerRow: TranslationCatalogProvider, modelRow: TranslationCatalogModel): void => {
    const reasoning = modelRow.reasoning
    onSelect({
      provider: providerRow.id,
      model: modelRow.id,
      reasoningEffort: reasoning?.defaultEffort ?? reasoning?.efforts[0]?.id ?? '',
    })
    setPane('root')
  }

  const chooseEffort = (effort: string): void => {
    if (current === undefined) return
    onSelect({ provider: current.provider.id, model: current.model.id, reasoningEffort: effort })
    close()
  }

  if (backend !== 'llm') {
    return <p className={css.bundleNotice}>{t('translationBundleDecides')}</p>
  }

  const card = open && rect !== undefined
    ? createPortal(
      <div
        ref={cardRef}
        id={id}
        className={css.card}
        role="dialog"
        aria-label={t('translationRoute')}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          maxHeight: rect.height,
        } as CSSProperties}
        onKeyDown={onCardKeyDown}
      >
        {pane === 'root' ? (
          <div className={css.pane}>
            {status === 'loading' ? <p className={css.status}>{t('translationCatalogLoading')}</p> : null}
            {status === 'error' ? (
              <div className={css.failure}>
                <p className={css.status} role="status">{t('translationCatalogFailed')}</p>
                <button type="button" className={css.retry} onClick={() => { setAttempt(value => value + 1) }}>
                  {t('retry')}
                </button>
              </div>
            ) : null}
            {status === 'ready' ? (
              <>
                {current === undefined ? <p className={css.missing}>{t('translationRouteMissing')}</p> : null}
                <button type="button" className={css.row} onClick={() => { setPane('model') }}>
                  <span className={css.rowLabel}>{t('translationModel')}</span>
                  <span className={css.rowValue}>{summary.model}</span>
                  <IconChevronRightOutline14 className={css.rowChevron} />
                </button>
                {current !== undefined && efforts.length > 0 ? (
                  <button type="button" className={css.row} onClick={() => { setPane('effort') }}>
                    <span className={css.rowLabel}>{t('translationEffort')}</span>
                    <span className={css.rowValue}>
                      {reasoningEffort === ''
                        ? t('translationEffortDefault')
                        : summary.effort === '' ? reasoningEffort : summary.effort}
                    </span>
                    <IconChevronRightOutline14 className={css.rowChevron} />
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        {pane === 'model' ? (
          <div className={css.pane}>
            {modelCount > 4 ? (
              <div className={css.search}>
                <Input
                  className={css.searchInput ?? ''}
                  placeholder={t('translationSearchModels')}
                  value={query}
                  onChange={(event) => { setQuery(event.target.value) }}
                />
              </div>
            ) : null}
            <div className={css.groups}>
              {filteredProviders.map(providerRow => (
                <div key={providerRow.id} className={css.group}>
                  <div className={css.groupHead}>{providerRow.name}</div>
                  {providerRow.models.map(modelRow => {
                    const selected = providerRow.id === provider && modelRow.id === model
                    return (
                      <button
                        key={`${providerRow.id}/${modelRow.id}`}
                        type="button"
                        className={css.modelRow}
                        onClick={() => { chooseModel(providerRow, modelRow) }}
                      >
                        <span className={css.modelText}>
                          <span className={css.modelName}>{modelRow.name}</span>
                          {modelRow.description === undefined ? null : (
                            <span className={css.modelDescription}>{modelRow.description}</span>
                          )}
                        </span>
                        {selected ? <IconCheckOutline14 className={css.check} /> : null}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {pane === 'effort' ? (
          <div className={css.pane}>
            {effortChoices.map(choice => (
              <button
                key={choice.id === '' ? 'default' : choice.id}
                type="button"
                className={css.modelRow}
                onClick={() => { chooseEffort(choice.id) }}
              >
                <span className={css.modelName}>{choice.name}</span>
                {choice.id === reasoningEffort ? <IconCheckOutline14 className={css.check} /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>,
      document.body,
    )
    : null

  return (
    <div className={css.root}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) {
            close()
            return
          }
          setOpen(true)
          setPane('root')
          setQuery('')
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={css.label}>{t('translationRoute')}</span>
        <span className={css.value}>{summary.text}</span>
        <IconChevronDownOutline14 className={open ? `${css.chevron} ${css.chevronOpen}` : css.chevron} />
      </button>
      {card}
    </div>
  )
}
