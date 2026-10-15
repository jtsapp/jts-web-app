import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatWeekly, getSatWeeklyHistory } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { StopwatchIcon } from '../icons.jsx'
import { hasDraft } from '../question/useSatSession.js'
import { cardState, draftKey, minutesOf, pastWeeks, weekRange } from '../model/weekly.js'
import { fmtDate } from '../model/dates.js'

/** «12 окт – 18 окт» — неделя теста. */
export function weekLabel(weekStart, loc) {
  const r = weekRange(weekStart)
  if (!r) return ''
  const o = { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return `${fmtDate(loc, r.from, o)} – ${fmtDate(loc, r.to, o)}`
}

/**
 * Карточка недельного теста на «Сегодня» (B1, прототип weekly-test.js card): неделя, правило «15 вопросов · ≈20 мин»,
 * статус (счёт, начат, не начат), прошлые недели и одна кнопка — начать, продолжить или открыть результат.
 * Нет в Figma: карточка прототипа в стиле дашборда SAT.
 */
export default function WeeklyCard({ onOpen }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const [weekly, setWeekly] = useState(undefined)
  const [history, setHistory] = useState([])

  useEffect(() => {
    let alive = true
    const tk = loadToken()
    getSatWeekly(tk)
      .then((w) => alive && setWeekly(w))
      .catch(() => alive && setWeekly(null))
    getSatWeeklyHistory(tk)
      .then((h) => alive && setHistory(Array.isArray(h) ? h : []))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (weekly === undefined) return <article className="st-card st-wk is-loading" aria-busy="true" />
  const state = cardState(weekly, weekly ? hasDraft(draftKey(weekly.weekStart)) : false)
  const n = weekly?.questions?.length || weekly?.result?.total || 15
  const past = pastWeeks(history, weekly?.weekStart)
  const res = weekly?.result

  return (
    <article className="st-card st-wk" id="sat-weekly-card">
      <div className="st-wk__head">
        <span className="st-wk__icon"><StopwatchIcon size={22} /></span>
        <div>
          <span className="st-head__eyebrow">{t('sat.wk.title')}</span>
          <h2>{weekly?.weekStart ? weekLabel(weekly.weekStart, loc) : t('sat.wk.title')}</h2>
          <p className="st-muted">{t('sat.wk.lead', { n: String(n), min: String(minutesOf(weekly)) })}</p>
        </div>
        <span className="st-spacer" />
        <span className={`st-wk__badge is-${state}`}>
          {state === 'done' && res ? t('sat.wk.score', { c: String(res.correct), n: String(res.total) }) : t(`sat.wk.state.${state}`)}
        </span>
      </div>
      {past.length > 0 && (
        <div className="st-wk__past" aria-label={t('sat.wk.past')}>
          {past.map((h) => (
            <span key={h.weekStart} className="st-wk__chip" title={weekLabel(h.weekStart, loc)}>
              {fmtDate(loc, weekRange(h.weekStart).from, { day: 'numeric', month: 'short', timeZone: 'UTC' })} · {h.correct}/{h.total}
            </span>
          ))}
        </div>
      )}
      {state === 'empty' ? (
        <p className="st-muted">{t('sat.wk.empty')}</p>
      ) : (
        <div className="st-wk__foot">
          <button type="button" className={state === 'done' ? 'ih-btn ih-btn--outline' : 'ih-cta'} onClick={onOpen}>
            {t(state === 'done' ? 'sat.wk.seeResult' : state === 'inProgress' ? 'sat.wk.continue' : 'sat.wk.start')}
            <ArrowForwardIcon size={18} />
          </button>
        </div>
      )}
    </article>
  )
}
