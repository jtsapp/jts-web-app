import { useEffect, useState } from 'react'
import EmptyState from '../ui/EmptyState.jsx'
import ProgressRing from '../ui/ProgressRing.jsx'
import { getIeltsProgress } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { formatDate, formatDuration, formatMonths } from '../format.js'
import { SectionTile } from '../sections.jsx'
import { BoltIcon, DescriptionIcon, FlagIcon, TrendingUpIcon } from '../icons.jsx'
import { bandGap, estimateTerm } from '../onboarding/onboarding.js'
import { groupNumber } from '../model/dashboard.js'
import { chartScale, typeTiles, weeklyOverall } from '../model/progress.js'
import { useI18n } from '../../i18n.jsx'

const SECTIONS = ['listening', 'reading', 'writing', 'speaking']
const W_CRIT = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']
const S_CRIT = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']
const S_CRIT_KEY = { fluencyCoherence: 'fc', lexicalResource: 'lr', grammaticalRange: 'gra', pronunciation: 'p' }
// «Время на вопрос»: дольше минуты — жёлтым, как в макете (медленные типы)
const SLOW_SEC = 60

/** «Балл по неделям» (Figma): одна линия overall, точка — последний замер недели, подписи — понедельник недели. */
function WeeklyChart({ history, target, t }) {
  const weeks = weeklyOverall(history)
  if (weeks.length < 2)
    return <p className="ih-muted">{weeks.length ? t('ieltsDash.p.pg.chart.single', { date: weeks[0].week.slice(8, 10) + '.' + weeks[0].week.slice(5, 7) }) : t('ieltsDash.p.pg.chart.none')}</p>
  const W = 360
  const H = 210
  const L = 34
  // правый отступ — под половину подписи «28.09»: с 10 последняя дата обрезалась краем svg
  const R = 22
  const T = 10
  const B = 30
  const { lo, hi, ticks } = chartScale(weeks.map((w) => w.band), target)
  const span = weeks[weeks.length - 1].n || 1
  const X = (i) => L + (weeks[i].n * (W - L - R)) / span
  const Y = (v) => T + ((hi - v) * (H - T - B)) / (hi - lo || 1)
  const label = (w) => `${w.slice(8, 10)}.${w.slice(5, 7)}`
  // подписи прореживаются по месту на оси, а не по счёту точек: соседние недели стоят теснее, чем через месяц
  const shown = []
  weeks.forEach((w, i) => {
    const last = i === weeks.length - 1
    while (last && shown.length && X(i) - X(shown[shown.length - 1]) < 34) shown.pop()
    if (last || !shown.length || X(i) - X(shown[shown.length - 1]) >= 34) shown.push(i)
  })
  return (
    <svg className="ih-pchart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('ieltsDash.p.pg.chart.aria', { points: weeks.map((w) => `${label(w.week)} ${w.band.toFixed(1)}`).join(', ') })}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="ih-pchart__grid" />
          <text x={2} y={Y(v) + 4} className={`ih-pchart__tick ${target != null && Math.abs(v - target) < 0.01 ? 'is-target' : ''}`}>{v.toFixed(1)}</text>
        </g>
      ))}
      {weeks.map((w, i) => (shown.includes(i) ? <text key={w.week} x={X(i)} y={H - 8} textAnchor="middle" className="ih-pchart__tick">{label(w.week)}</text> : null))}
      <polyline points={weeks.map((w, i) => `${X(i)},${Y(w.band)}`).join(' ')} className="ih-pchart__line" />
      {weeks.map((w, i) => <circle key={w.week} cx={X(i)} cy={Y(w.band)} r={4.5} className="ih-pchart__dot" />)}
    </svg>
  )
}

function download(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * «Прогресс» (Figma «Прогресс», прототип 60-progress): трек и цель, текущий балл кольцами и срок до цели с прогнозом,
 * балл по неделям, точность по каждому типу вопросов плитками, ловушки и время на вопрос, серия и опыт. Ниже — средние
 * критерии Writing/Speaking и последние попытки (в макете их нет, но по ним открывается разбор). Данные — бэкенд:
 * GET /mobile/ielts/progress и главный экран (баллы, серия, XP).
 */
export default function ProgressTab({ data, token, onOpenAttempt }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading' })
  const [section, setSection] = useState('reading')

  useEffect(() => {
    let alive = true
    const authToken = token || loadToken()
    ;(authToken ? getIeltsProgress(authToken) : Promise.reject(Object.assign(new Error('guest'), { guest: true })))
      .then((p) => alive && setState({ status: 'ready', p }))
      .catch((e) => alive && setState({ status: e?.guest ? 'guest' : 'error' }))
    return () => {
      alive = false
    }
  }, [token])

  if (state.status !== 'ready') {
    if (state.status === 'loading') return <p className="ih-muted">{t('ieltsReading.loading')}</p>
    return <EmptyState icon={<TrendingUpIcon size={28} />} title={t(state.status === 'guest' ? 'ieltsReading.guestTitle' : 'ieltsReading.errorTitle')} text={t(state.status === 'guest' ? 'ieltsReading.guestText' : 'ieltsReading.errorText')} />
  }

  const p = state.p
  const profile = data.profile || {}
  const target = data.targetBand
  const bands = data.bands || {}
  const overall = data.overall
  const track = profile.track === 'general' ? 'General Training' : 'Academic'
  const last = (p.recent || []).find((a) => a.band != null)
  const gap = bandGap(target, overall)
  const daily = profile.dailyMinutes || 60
  const term = gap != null && gap > 0 ? estimateTerm(gap, daily) : null
  const typeName = (type) => t(`ieltsOb.p.diag.types.${type}`)
  const sectionName = (s) => s[0].toUpperCase() + s.slice(1)
  const tiles = typeTiles(p.typeLists?.[section], p.byType?.[section], section)
  const traps = Object.entries(p.traps || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const trapMax = traps[0]?.[1] || 1
  const times = (p.timeByType?.[section] || []).slice(0, 5)
  const timeMax = times[0]?.medianSec || 1
  const levelSize = data.levelSize || 1000
  const levelXp = data.levelXp ?? (data.xp != null ? data.xp % levelSize : 0)

  return (
    <div className="ih-progress">
      <header className="ih-progress__top">
        <div>
          <h2>{t('ieltsDash.pgHead', { track, band: target != null ? Number(target).toFixed(1) : '—' })}</h2>
          {last && <p className="ih-muted">{t('ieltsDash.pgSource', { date: formatDate(last.finishedAt, lang), what: last.skill === 'diagnostic' ? t('ieltsOb.p.diag.title') : last.title })}</p>}
        </div>
        <div className="ih-progress__actions">
          <button type="button" className="ih-btn ih-btn--outline" onClick={() => window.print()}>
            <DescriptionIcon size={16} />{t('ieltsDash.pgPdf')}
          </button>
          <button type="button" className="ih-btn ih-btn--outline" onClick={() => download(`ielts-progress-${new Date().toISOString().slice(0, 10)}.json`, { dashboard: data, progress: p })}>
            <DescriptionIcon size={16} />{t('ieltsDash.pgJson')}
          </button>
        </div>
      </header>

      <div className="ih-progress__row">
        <section className="ih-card ih-pbands">
          <h3>{t('ieltsDash.p.pg.bands.title')}</h3>
          <div className="ih-pbands__rings">
            <div className="ih-pring ih-pring--overall">
              <ProgressRing value={overall ?? 0} max={9} size={112} stroke={10} label={<span className="ih-pring__in"><b>{overall != null ? Number(overall).toFixed(1) : '—'}</b><small>Overall</small></span>} />
            </div>
            {SECTIONS.map((s) => {
              const v = bands[s]
              return (
                <div key={s} className={`ih-pring ih-pring--${s}`}>
                  <ProgressRing value={v ?? 0} max={9} size={84} stroke={8} label={<b>{v != null ? Number(v).toFixed(1) : '—'}</b>} />
                  <span>{sectionName(s)}</span>
                  <small className="ih-muted">{v == null && (s === 'writing' || s === 'speaking') ? t('ieltsDash.withAi') : target != null ? t('ieltsDash.goalShort', { n: Number(target).toFixed(1) }) : ''}</small>
                </div>
              )
            })}
          </div>
          <p className="ih-pbands__note">
            <FlagIcon size={16} />
            <span>
              {gap == null
                ? t('ieltsDash.p.pg.bands.lineNoOverall')
                : gap <= 0
                  ? t('ieltsDash.goalReached')
                  : term.long
                    ? t('ieltsDash.p.pg.bands.lineLong', { gap: gap.toFixed(1) })
                    : t('ieltsDash.gapLine', { gap: gap.toFixed(1), term: formatMonths(term.months, t, lang), daily: formatDuration(daily, t) })}
              {data.forecast ? ` ${t('ieltsDash.forecastLine', { date: formatDate(`${data.forecast.date}T00:00:00`, lang), band: Number(data.forecast.band).toFixed(1) })}` : ''}
            </span>
          </p>
        </section>
        <section className="ih-card ih-pweekly">
          <h3>{t('ieltsDash.p.pg.chart.title')}</h3>
          <WeeklyChart history={p.history || []} target={target} t={t} />
        </section>
      </div>

      <section className="ih-card ih-ptypes">
        <div className="ih-ptypes__head">
          <div>
            <h3>{t('ieltsDash.p.pg.heat.title')}</h3>
            <p className="ih-muted">{t('ieltsDash.p.pg.heat.sub')}</p>
          </div>
          <span className="ih-seg" role="tablist">
            {['reading', 'listening'].map((s) => (
              <button key={s} type="button" role="tab" aria-selected={section === s} className={section === s ? 'is-on' : ''} onClick={() => setSection(s)}>
                {/* число — по плиткам, которые реально нарисованы: «12 типов» при 13 плитках читалось как ошибка */}
                {t('ieltsDash.typesCount', { section: sectionName(s), n: String(typeTiles(p.typeLists?.[s], p.byType?.[s], s).length) })}
              </button>
            ))}
          </span>
        </div>
        <ul className="ih-ptiles">
          {tiles.map((x) => (
            <li key={x.type} className={`ih-ptile is-${x.tone}`}>
              <span>{x.label}</span>
              {x.total ? (
                <span className="ih-ptile__val"><b>{Math.round((x.correct / x.total) * 100)} %</b><small>{t('ieltsDash.answersShort', { n: String(x.total) })}</small></span>
              ) : (
                <b className="ih-ptile__none">{t('ieltsDash.noData')}</b>
              )}
            </li>
          ))}
        </ul>
        <div className="ih-ptiles__legend">
          <span><i className="is-high" />{t('ieltsDash.p.pg.heat.high')}</span>
          <span><i className="is-mid" />{t('ieltsDash.p.pg.heat.mid')}</span>
          <span><i className="is-low" />{t('ieltsDash.p.pg.heat.low')}</span>
        </div>
      </section>

      <div className="ih-progress__grid">
        <section className="ih-card">
          <h3>{t('ieltsDash.trapsTitle')}</h3>
          <p className="ih-muted">{t('ieltsDash.trapsSub')}</p>
          {traps.length === 0 ? (
            <p className="ih-muted">{t('ieltsDash.p.pg.errors.none')}</p>
          ) : (
            <ul className="ih-pbars">
              {traps.map(([k, n]) => (
                <li key={k}>
                  <span>{t(`ieltsOb.p.diag.trap.${k}`)}</span>
                  <i className="ih-pbars__bar is-red"><i style={{ width: `${(n / trapMax) * 100}%` }} /></i>
                  <b>{t('ieltsDash.p.pg.errors.times', { n: String(n) })}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ih-card">
          <h3>{t('ieltsDash.timeTitle')}</h3>
          <p className="ih-muted">{t('ieltsDash.timeSub')}</p>
          {times.length === 0 ? (
            <p className="ih-muted">{t('ieltsDash.timeNone')}</p>
          ) : (
            <ul className="ih-pbars">
              {times.map((x) => (
                <li key={x.type} className={x.medianSec > SLOW_SEC ? 'is-slow' : ''}>
                  <span>{typeName(x.type)}</span>
                  <i className={`ih-pbars__bar ${x.medianSec > SLOW_SEC ? 'is-yellow' : 'is-violet'}`}><i style={{ width: `${(x.medianSec / timeMax) * 100}%` }} /></i>
                  <b>{t('ieltsDash.sec', { n: String(x.medianSec) })}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ih-card ih-pgame">
          <h3>{t('ieltsDash.p.pg.game.title')}</h3>
          <div className="ih-pgame__streak">
            <span className="ih-pgame__bolt"><BoltIcon size={22} /></span>
            <div>
              <b>{plural(t, lang, 'ieltsDash.days', data.streakDays ?? 0)}</b>
              <small className="ih-muted">{t('ieltsDash.bestStreak', { n: String(data.streakBest ?? data.streakDays ?? 0) })}</small>
            </div>
          </div>
          {data.xp != null && (
            <>
              <b>{t('ieltsDash.levelXp', { level: String(data.level ?? 1), xp: groupNumber(data.xp) })}</b>
              <i className="ih-pbars__bar is-violet ih-pgame__bar"><i style={{ width: `${(levelXp / levelSize) * 100}%` }} /></i>
              <small className="ih-muted">{t('ieltsDash.toNext', { level: String((data.level ?? 1) + 1), n: groupNumber(levelSize - levelXp) })}</small>
            </>
          )}
        </section>
      </div>

      <div className="ih-progress__grid ih-progress__grid--two">
        {[['writing', W_CRIT, (c) => t(`ieltsWriting.crit.${c}`)], ['speaking', S_CRIT, (c) => t(`ieltsSpeaking.p.crit.${S_CRIT_KEY[c]}`)]].map(([skill, crit, label]) => (
          <section key={skill} className="ih-card">
            <h3>{sectionName(skill)}</h3>
            <p className="ih-muted">{t('ieltsDash.criteriaSub', { n: String(p[skill]?.checked ?? 0) })}</p>
            {!p[skill]?.checked ? (
              <p className="ih-muted">{t('ieltsDash.noChecked')}</p>
            ) : (
              <ul className="ih-progress__crit">
                {crit.map((c) => (
                  <li key={c}><span>{label(c)}</span><b>{p[skill].criteria[c] != null ? Number(p[skill].criteria[c]).toFixed(1) : '—'}</b></li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="ih-card">
        <h3>{t('ieltsDash.recent')}</h3>
        {(p.recent || []).length === 0 ? (
          <p className="ih-muted">{t('ieltsDash.noRecent')}</p>
        ) : (
          <ul className="ih-progress__recent">
            {p.recent.slice(0, 8).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onOpenAttempt?.(a)}>
                  <SectionTile section={SECTIONS.includes(a.skill) ? a.skill : 'reading'} size={32} iconSize={16} />
                  <span className="ih-progress__rtitle">
                    <b>{a.skill === 'diagnostic' ? t('ieltsOb.p.diag.title') : a.title}</b>
                    <small>{formatDate(a.finishedAt, lang)}</small>
                  </span>
                  <span className="ih-progress__rscore">
                    {a.band != null ? `band ${Number(a.band).toFixed(1)}` : a.skill === 'writing' || a.skill === 'speaking' ? t(a.status === 'failed' ? 'ieltsWriting.status.failed' : 'ieltsWriting.status.pending') : `${a.rawScore} / ${a.maxScore}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
