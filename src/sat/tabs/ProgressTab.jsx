import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatProgress } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { MenuBookIcon } from '../../ielts/icons.jsx'
import { BulbIcon, FireIcon, OkCircleIcon, SigmaIcon, TrophyIcon } from '../icons.jsx'
import { domainName, skillName, TAXONOMY } from '../names.js'
import { parse } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'

const STATUSES = ['mastered', 'developing', 'learning', 'no-data']

function hm(sec, t) {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? t('sat.prog.hm', { h: String(h), m: String(m) }) : t('sat.prog.m', { m: String(m) })
}

/**
 * «Прогресс» (Figma SAT 17): самостоятельно и с помощью отдельно, серия, освоенные навыки; карта навыков (клик —
 * 10 вопросов по навыку); точность по доменам только по самостоятельным попыткам; время и темп против эталона;
 * последние 90 дней; бейджи прототипа. Всё — из попыток: ни одна цифра не придумана, где данных нет — так и написано.
 */
export default function ProgressTab({ onPractice }) {
  const { t, lang } = useI18n()
  const [p, setP] = useState(null)
  const [sec, setSec] = useState('math')
  useEffect(() => {
    getSatProgress(loadToken()).then(setP).catch(() => setP({ error: true }))
  }, [])
  if (!p) return null
  if (p.error) return <p className="st-error">{t('sat.study.netError')}</p>

  const indPct = p.independent.total ? Math.round((p.independent.correct * 100) / p.independent.total) : null
  const byId = Object.fromEntries(p.skills.map((s) => [s.id, s]))
  const domains = TAXONOMY.domains.slice().sort((a, b) => a.order - b.order)
  const max = Math.max(1, ...p.days.map((d) => d.count))
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'

  const tile = (s) => {
    const m = byId[s.id] || { status: 'no-data', needed: 6 }
    return (
      <button key={s.id} type="button" className={`st-map__skill is-${m.status}`} title={skillName(s.id, lang)} onClick={() => onPractice([s.id])}>
        <b>{skillName(s.id, lang)}</b>
        <small>{m.status === 'no-data' ? plural(t, lang, 'sat.prog.more', m.needed) : `${Math.round((m.accuracy || 0) * 100)}%`}</small>
      </button>
    )
  }

  return (
    <div className="st-prog">
      <div className="st-prog__stats">
        <div className="st-card st-pstat">
          <span className="st-stat__icon is-green"><OkCircleIcon size={20} /></span><b>{t('sat.sum.indep')}</b>
          <strong>{p.independent.total}</strong>
          <small>{indPct == null ? t('sat.prog.noData') : t('sat.prog.right', { p: String(indPct) })}</small>
        </div>
        <div className="st-card st-pstat">
          <span className="st-stat__icon is-gold"><BulbIcon size={20} /></span><b>{t('sat.sum.helped')}</b>
          <strong>{p.helped.total}</strong>
          <small>{t('sat.prog.apart')}</small>
        </div>
        <div className="st-card st-pstat">
          <span className="st-stat__icon is-orange"><FireIcon size={20} /></span><b>{t('sat.prog.streak')}</b>
          <strong>{plural(t, lang, 'sat.today.daysWord', p.streak.current)}</strong>
          <small>{t('sat.prog.best', { n: String(p.streak.best) })}</small>
        </div>
        <div className="st-card st-pstat">
          <span className="st-stat__icon is-violet"><TrophyIcon size={20} /></span><b>{t('sat.prog.mastered')}</b>
          <strong>{p.mastered.count} / {p.mastered.total}</strong>
          <small>{p.mastered.awaiting ? t('sat.prog.awaiting', { n: String(p.mastered.awaiting) }) : t('sat.sum.masteryRule')}</small>
        </div>
      </div>

      <div className="st-card st-map">
        <div className="st-map__head">
          <div>
            <h2>{t('sat.prog.map')}</h2>
            <p className="st-muted">{t('sat.prog.mapSub')}</p>
          </div>
          <span className="st-spacer" />
          {STATUSES.map((s) => <span key={s} className={`st-mchip is-${s}`}><i />{t(`sat.mastery.${s}`)}</span>)}
        </div>
        <div className="st-map__cols">
          {['rw', 'math'].map((section) => (
            <div key={section}>
              <span className={`st-map__sec is-${section}`}><i />{section === 'math' ? 'Math' : 'Reading and Writing'}</span>
              {domains.filter((d) => d.section === section).map((d) => (
                <div key={d.id} className="st-map__dom">
                  <small>{domainName(d.id, lang)}</small>
                  <div className="st-map__row">{TAXONOMY.skills.filter((s) => s.domain === d.id).map(tile)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="st-prog__pair">
        <div className="st-card st-acc">
          <div className="st-map__head">
            <div>
              <h2>{t('sat.prog.acc')}</h2>
              <p className="st-muted">{t('sat.prog.accSub')}</p>
            </div>
            <span className="st-spacer" />
            <div className="ih-seg">
              {['rw', 'math'].map((s) => <button key={s} type="button" className={sec === s ? 'is-on' : ''} onClick={() => setSec(s)}>{s === 'math' ? 'Math' : 'R&W'}</button>)}
            </div>
          </div>
          {p.domains.filter((d) => d.section === sec).map((d) => (
            <div key={d.id} className={`st-acc__row is-${sec}`}>
              <b>{domainName(d.id, lang)}</b>
              <span className="st-muted">{t('sat.prog.attempts', { n: String(d.attempts), h: String(d.helped) })}</span>
              <strong>{d.accuracy == null ? '—' : `${Math.round(d.accuracy * 100)}%`}</strong>
              <span className="st-rep__bar"><i style={{ width: `${Math.round((d.accuracy || 0) * 100)}%` }} /></span>
            </div>
          ))}
        </div>
        <div className="st-card st-pace">
          <h2>{t('sat.prog.time')}</h2>
          <p className="st-muted">{t('sat.prog.timeSub')}</p>
          <div className="st-pace__tiles">
            <span><b>{hm(p.time.weekSec, t)}</b>{t('sat.prog.week')}</span>
            <span><b>{hm(p.time.monthSec, t)}</b>{t('sat.prog.month')}</span>
          </div>
          {['rw', 'math'].map((s) => {
            const x = p.time.pace[s]
            const faster = x.median != null && x.median <= x.bench
            return (
              <div key={s} className="st-pace__row">
                <span className={`st-next__icon is-${s}`}>{s === 'math' ? <SigmaIcon size={18} /> : <MenuBookIcon size={18} />}</span>
                <span>
                  <b>{x.median == null ? t('sat.prog.noPace') : t('sat.prog.paceVs', { m: String(x.median), b: String(x.bench) })}</b>
                  <small>{s === 'math' ? 'Math' : 'Reading and Writing'}</small>
                </span>
                <span className="st-spacer" />
                {x.median != null && <span className={`st-pace__chip ${faster ? 'is-fast' : 'is-slow'}`}>{t(faster ? 'sat.prog.faster' : 'sat.prog.slower')}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="st-prog__pair">
        <div className="st-card st-heat">
          <h2>{t('sat.prog.days90')}</h2>
          <p className="st-muted">{plural(t, lang, 'sat.prog.activeDays', p.activeDays)}</p>
          <div className="st-heat__grid" role="img" aria-label={plural(t, lang, 'sat.prog.activeDays', p.activeDays)}>
            {p.days.map((d) => {
              const lvl = d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4))
              return <i key={d.date} className={`is-${lvl}`} title={`${fmtDate(loc, parse(d.date), { day: 'numeric', month: 'short' })}: ${d.count}`} />
            })}
          </div>
        </div>
        <div className="st-card st-badges">
          <h2>{t('sat.prog.badges')}</h2>
          <p className="st-muted">{t('sat.prog.badgesSub', { steps: p.streakSteps.join(' → ') })}</p>
          {p.badges.map((b) => (
            <div key={b.key} className={`st-badge ${b.done ? 'is-done' : ''}`}>
              <span className="st-badge__icon">{b.key === 'streak' ? <FireIcon size={20} /> : b.key === 'mastered' ? <TrophyIcon size={20} /> : <OkCircleIcon size={20} />}</span>
              <span><b>{t(`sat.prog.badge.${b.key}`)}</b><small>{b.done ? t('sat.prog.got') : t('sat.prog.of', { n: String(b.progress), g: String(b.goal) })}</small></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
