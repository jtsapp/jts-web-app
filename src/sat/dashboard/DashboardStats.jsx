import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatStats } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { FireIcon, OkCircleIcon, StopwatchIcon, TrophyIcon, AssignmentIcon, FlashIcon } from '../icons.jsx'
import { FlagIcon, TranslateIcon } from '../../ielts/icons.jsx'
import { domainName, TAXONOMY } from '../names.js'
import { domainRows, fmtMinutes, heatCells, sortBadges, windowTotals } from '../model/stats.js'
import { fmtDate } from '../model/dates.js'

const DOMAIN_ORDER = TAXONOMY.domains.slice().sort((a, b) => a.order - b.order).map((d) => d.id)

function Tile({ icon, tone, label, value, note }) {
  return (
    <div className="st-card st-dash__tile">
      <span className={`st-stat__icon is-${tone}`}>{icon}</span>
      <span className="st-dash__label">{label}</span>
      <b className="st-dash__value">{value}</b>
      {note && <small className="st-muted">{note}</small>}
    </div>
  )
}

/**
 * «Моя статистика» на дашборде «Сегодня» (B2, прототип progress.js dashboard): восемь плиток — серия, решено, время,
 * освоено, пробники, недельные тесты, ошибки, слова сегодня; под ними точность по доменам, последние 90 дней и бейджи.
 * Отдельной вкладки «Прогресс» больше нет (B4) — всё, что от неё нужно, здесь. Числа — с сервера, где данных нет —
 * так и написано. vocab — { done, goal } карточек словаря за сегодня (сервер мог не прислать wordsToday).
 */
export default function DashboardStats({ vocab, onVocab, onErrors, onMocks }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const [s, setS] = useState(null)
  useEffect(() => {
    let alive = true
    getSatStats(loadToken())
      .then((x) => alive && setS(x || {}))
      .catch(() => alive && setS({ error: true }))
    return () => {
      alive = false
    }
  }, [])
  const cells = useMemo(() => heatCells(s?.last90Days || [], new Date()), [s])
  if (!s) return <section className="st-dash is-loading" aria-busy="true" />
  if (s.error) return <p className="st-muted st-dash__none">{t('sat.dash.unavailable')}</p>

  const rows = domainRows(s.accuracyByDomain || [], DOMAIN_ORDER)
  const win = windowTotals(s.last90Days || [])
  const badges = sortBadges(s.badges || [])
  const words = s.wordsToday ?? vocab?.done ?? 0
  const skillsTotal = TAXONOMY.skills.length

  return (
    <section className="st-dash" id="sat-dash-stats" aria-labelledby="sat-dash-title">
      <h2 id="sat-dash-title" className="st-head__eyebrow">{t('sat.dash.title')}</h2>
      <div className="st-dash__tiles">
        <Tile tone="orange" icon={<FireIcon size={18} />} label={t('sat.dash.streak')} value={plural(t, lang, 'sat.today.daysWord', s.streakDays || 0)} />
        <Tile tone="green" icon={<OkCircleIcon size={18} />} label={t('sat.dash.solved')} value={String(s.solved ?? 0)} />
        <Tile tone="violet" icon={<StopwatchIcon size={18} />} label={t('sat.dash.time')} value={fmtMinutes(s.timeSpentMinutes, t)} />
        <Tile tone="gold" icon={<TrophyIcon size={18} />} label={t('sat.dash.mastered')} value={`${s.mastered ?? 0} / ${skillsTotal}`} />
        <button type="button" className="st-dash__btn" onClick={onMocks}>
          <Tile tone="violet" icon={<AssignmentIcon size={18} />} label={t('sat.dash.mocks')} value={String(s.mocks ?? 0)} />
        </button>
        <Tile tone="green" icon={<FlashIcon size={18} />} label={t('sat.dash.weekly')} value={String(s.weeklyTests ?? 0)} />
        <button type="button" className="st-dash__btn" onClick={onErrors}>
          <Tile tone="red" icon={<FlagIcon size={18} />} label={t('sat.dash.errors')} value={String(s.errors ?? 0)} note={t('sat.dash.errorsNote')} />
        </button>
        <button type="button" className="st-dash__btn" onClick={onVocab}>
          <Tile tone="orange" icon={<TranslateIcon size={18} />} label={t('sat.dash.words')} value={vocab?.goal ? `${words} / ${vocab.goal}` : String(words)} note={vocab?.goal ? t('sat.dash.wordsGoal') : null} />
        </button>
      </div>

      <div className="st-dash__panels">
        <div className="st-card st-dash__panel">
          <h3>{t('sat.prog.acc')}</h3>
          <p className="st-muted">{t('sat.dash.accSub')}</p>
          {rows.length === 0 ? <p className="st-muted">{t('sat.prog.noData')}</p> : rows.map((d) => (
            <div key={`${d.section}-${d.domain}`} className={`st-acc__row is-${d.section === 'math' ? 'math' : 'rw'} is-${d.tone}`}>
              <b>{domainName(d.domain, lang)}</b>
              <span className="st-muted">{d.correct}/{d.total}</span>
              <strong>{d.pct}%</strong>
              <span className="st-rep__bar"><i style={{ width: `${d.pct}%` }} /></span>
            </div>
          ))}
        </div>
        <div className="st-card st-dash__panel">
          <h3>{t('sat.prog.days90')}</h3>
          <p className="st-muted">{plural(t, lang, 'sat.prog.activeDays', win.active)} · {t('sat.dash.solvedN', { n: String(win.solved) })}</p>
          <div className="st-heat__grid st-dash__heat" role="img" aria-label={plural(t, lang, 'sat.prog.activeDays', win.active)}>
            {cells.map((c) => (
              <i key={c.date} className={c.pad ? 'is-pad' : `is-${c.lvl}`} title={c.pad ? undefined : `${fmtDate(loc, new Date(`${c.date}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })}: ${c.solved}`} />
            ))}
          </div>
        </div>
        <div className="st-card st-dash__panel st-badges">
          <h3>{t('sat.prog.badges')}</h3>
          {badges.length === 0 ? <p className="st-muted">{t('sat.prog.noData')}</p> : badges.map((b) => (
            <div key={b.id} className={`st-badge ${b.earned ? 'is-done' : ''}`}>
              <span className="st-badge__icon">{b.earned ? <TrophyIcon size={18} /> : <OkCircleIcon size={18} />}</span>
              <span>
                <b>{t(`sat.badge.${b.id}`) === `sat.badge.${b.id}` ? b.id : t(`sat.badge.${b.id}`)}</b>
                <small>{b.earned ? (b.earnedAt ? t('sat.dash.earnedOn', { date: fmtDate(loc, new Date(b.earnedAt), { day: 'numeric', month: 'short' }) }) : t('sat.prog.got')) : '—'}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
