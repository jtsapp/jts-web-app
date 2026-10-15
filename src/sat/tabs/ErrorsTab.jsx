import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatErrors, patchSatError } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import EmptyState from '../../ielts/ui/EmptyState.jsx'
import { FlagIcon } from '../../ielts/icons.jsx'
import { ReplayIcon } from '../icons.jsx'
import { ERROR_TYPES } from '../study/ErrorTypeDialog.jsx'
import { parse } from '../model/plan.js'
import { skillName } from '../names.js'
import { filterErrors, normType, paginate, reasonCounts, sortErrors, statusCounts, statusOf, STATUSES } from '../model/errors.js'

const TYPES = ERROR_TYPES.map((x) => x.key)

/**
 * «Ошибки» — журнал ошибок (B9, прототип errors.js после cfbaf69d / ab84ead6). Шапка — что это за журнал и одно
 * действие (повторить то, чему пора); четыре плитки (всего, пора, ждут, разобрано) — они же фильтр статуса; причины
 * одной строкой — фильтр по типу ошибки; ниже карточки, по десять на страницу с номерами страниц.
 * Промахи, записанные кнопкой «Log error» (B3), несут свой заголовок и тему; остальные — начало вопроса и навык.
 * Тип ошибки меняется прямо в карточке; «Разобрано» — ручная отметка, её можно снять.
 */
export default function ErrorsTab({ onReview }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [list, setList] = useState(null)
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (s) => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(parse(String(s).slice(0, 10)))

  const load = useCallback(() => {
    getSatErrors(token, 'all')
      .then((l) => setList(Array.isArray(l) ? l : []))
      .catch(() => setList([]))
  }, [token])
  useEffect(() => load(), [load])

  const all = useMemo(() => sortErrors(list || []), [list])
  const counts = statusCounts(all)
  const byStatus = filterErrors(all, { status })
  const reasons = reasonCounts(byStatus, TYPES)
  const shown = filterErrors(byStatus, { kind })
  const pg = paginate(shown, page)

  const pickStatus = (s) => {
    setStatus(s)
    setPage(1)
  }
  const pickKind = (k) => {
    setKind((cur) => (cur === k ? 'all' : k))
    setPage(1)
  }

  const patch = async (id, body) => {
    setBusy(true)
    try {
      const upd = await patchSatError(token, id, body)
      setList((l) => l.map((e) => (e.id === id ? { ...e, ...upd } : e)))
    } finally {
      setBusy(false)
    }
  }

  if (!list) return null
  return (
    <div className="st-errs">
      <div className="st-errs__top">
        <p className="st-muted">{t('sat.errs.lead')}</p>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-errs__all" disabled={!counts.due} onClick={onReview}>
          <ReplayIcon size={18} />{counts.due ? t('sat.errs.reviewAll', { n: String(counts.due) }) : t('sat.errs.nothingDue')}
        </button>
      </div>

      <div className="st-errs__tiles" role="tablist" aria-label={t('sat.errs.statusLabel')}>
        {STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={`st-card st-errs__tile is-${s} ${status === s ? 'is-on' : ''}`} onClick={() => pickStatus(s)}>
            <b>{counts[s]}</b>
            <span>{t(`sat.errs.tile.${s}`)}</span>
          </button>
        ))}
      </div>

      {all.length > 0 && (
        <div className="st-errs__kinds" role="group" aria-label={t('sat.errs.whyLabel')}>
          {reasons.map((r) => (
            <button key={r.key} type="button" aria-pressed={kind === r.key} className={`st-errs__kind ${kind === r.key ? 'is-on' : ''} ${r.n ? '' : 'is-zero'}`} onClick={() => pickKind(r.key)}>
              <span>{r.key === 'none' ? t('sat.errs.noType') : t(`sat.etype.${r.key}`)}</span>
              <b>{r.n}</b>
            </button>
          ))}
        </div>
      )}

      {pg.items.length === 0 ? (
        <EmptyState icon={<FlagIcon size={28} />} title={t(all.length ? 'sat.errs.emptyFilter' : 'sat.errs.empty.all')} text={t('sat.errs.emptyText')} />
      ) : (
        <ul className="st-errs__list">
          {pg.items.map((e) => {
            const st = statusOf(e)
            const topic = e.unitCode ? `${e.unitCode}${e.topic ? ` · ${e.topic}` : ''}` : e.topic || skillName(e.skillId, lang)
            return (
              <li key={e.id} className={`st-card st-err is-${st} is-${e.section === 'math' ? 'math' : 'rw'}`}>
                <div className="st-err__top">
                  <span className="st-err__skill"><i className={`st-dot is-${e.section === 'math' ? 'math' : 'rw'}`} />{topic}</span>
                  {e.logged && <span className="st-err__logged">{t('sat.errs.loggedTag')}</span>}
                  <span className="st-spacer" />
                  <small className="st-muted">{e.createdAt ? fmt(e.createdAt) : ''}</small>
                </div>
                {e.title ? (
                  <p className="st-err__title">{e.title}</p>
                ) : (
                  // теги сервер уже снял, остались сущности (&minus;, &pi;) — их раскрывает разметка
                  e.stem && <p className="st-err__stem" dangerouslySetInnerHTML={{ __html: e.stem.length > 160 ? `${e.stem.slice(0, 160)}…` : e.stem }} />
                )}
                <div className="st-err__foot">
                  <small className="st-muted">
                    {t(`sat.errs.mode.${e.mode}`)} · {e.resolvedAt ? t('sat.errs.closed', { date: fmt(e.resolvedAt) }) : t(e.due ? 'sat.errs.dueNow' : 'sat.errs.dueOn', { date: e.reviewDueAt ? fmt(e.reviewDueAt) : '—' })}
                  </small>
                  <span className="st-spacer" />
                  <select className={`st-err__type ${e.errorType ? '' : 'is-none'}`} value={normType(e.errorType) || ''} disabled={busy} aria-label={t('sat.etype.title')} onChange={(ev) => patch(e.id, { errorType: ev.target.value })}>
                    <option value="" disabled>{t('sat.errs.noType')}</option>
                    {TYPES.map((key) => <option key={key} value={key}>{t(`sat.etype.${key}`)}</option>)}
                  </select>
                  <label className="st-err__check">
                    <input type="checkbox" checked={!!e.resolvedAt} disabled={busy} onChange={() => patch(e.id, { resolved: !e.resolvedAt })} />
                    <span>{t(e.resolvedAt ? 'sat.errs.reviewed' : 'sat.errs.notReviewed')}</span>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {shown.length > 0 && (
        <div className="st-errs__foot">
          <span className="st-muted">{shown.length === all.length ? t('sat.errs.showingAll', { n: String(all.length) }) : t('sat.errs.showingSome', { n: String(shown.length), total: String(all.length) })}</span>
          <span className="st-spacer" />
          {pg.pages > 1 && (
            <nav className="st-errs__pages" aria-label={t('sat.errs.pages')}>
              {Array.from({ length: pg.pages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={n === pg.page ? 'is-on' : ''} aria-current={n === pg.page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
              ))}
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
