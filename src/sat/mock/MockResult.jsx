import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, InfoIcon, TrendingUpIcon } from '../../ielts/icons.jsx'
import { FlashIcon } from '../icons.jsx'
import { skillName, skillSection } from '../names.js'
import { hoursMinutes, moduleNo, onScale, share } from '../model/mock.js'

const SECTIONS = [
  { key: 'rw', name: 'Reading and Writing', short: 'R&W' },
  { key: 'math', name: 'Math', short: 'Math' },
]

/**
 * Итог симуляции (Figma SAT 33). Главное число — диапазон с подписью «внутренняя оценка JTS», а не балл SAT; рядом то,
 * что известно точно: raw-счёт секций и маршрут модулей. Итог всегда из секций. Заканчивается действием — навыками,
 * где ушли баллы. У пробника (paper) маршрута нет: второй модуль у всех один.
 */
export default function MockResult({ run, target, onReview, onPractice, busy }) {
  const { t, lang } = useI18n()
  const r = run.result || {}
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const date = run.finishedAt ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(run.finishedAt)) : ''
  const total = r.total
  const weak = r.weak || []

  return (
    <main className="st-res">
      <div className="st-res__top">
        <div>
          <h1>{run.paperTitle ? t('sat.mock.paperResult', { title: run.paperTitle }) : t('sat.mock.resultTitle')}</h1>
          <div className="st-res__chips">
            {date && <span className="ih-chip ih-chip--sm"><span>{date}</span></span>}
            <span className="ih-chip ih-chip--sm"><span>{t(run.timed ? 'sat.mock.timed' : 'sat.mock.untimedTag')}</span></span>
            {r.elapsedSec != null && <span className="ih-chip ih-chip--sm"><span>{hoursMinutes(t, r.elapsedSec / 60)}</span></span>}
          </div>
        </div>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-res__cta" onClick={onReview}>{t('sat.mock.reviewAll')}<ArrowForwardIcon size={20} /></button>
      </div>

      <div className="st-res__row">
        <section className="st-res__total">
          <div className="st-res__eyebrow">
            <span>{t('sat.mock.totalEyebrow')}</span>
            <span className="st-spacer" />
            <span className="st-res__flag"><InfoIcon size={14} />{t('sat.mock.rangeNotScore')}</span>
          </div>
          <b className="st-res__range">{total ? `${total.low}–${total.high}` : '—'}</b>
          {total && (
            <div className="st-res__scale" aria-hidden="true">
              <i className="st-res__track" />
              <i className="st-res__band" style={{ left: `${onScale(total.low)}%`, width: `${onScale(total.high) - onScale(total.low)}%` }} />
              {target && (
                <>
                  <i className="st-res__goal" style={{ left: `${onScale(target)}%` }} />
                  <span className="st-res__goalLabel" style={{ left: `${onScale(target)}%` }}>{t('sat.mock.goal', { n: String(target) })}</span>
                </>
              )}
              {/* подпись деления у самой цели прячем: «цель 1500» налезала на «1600» */}
              {[400, 800, 1200, 1600].map((v) => (
                <span key={v} className="st-res__tick" style={{ left: `${onScale(v)}%`, visibility: target && Math.abs(onScale(v) - onScale(target)) < 12 ? 'hidden' : undefined }}>{v}</span>
              ))}
            </div>
          )}
          <p>{t('sat.mock.rangeNote')}</p>
        </section>
        <div className="st-res__sections">
          {SECTIONS.map((s) => {
            const x = r.sections?.[s.key]
            if (!x) return null
            return (
              <section key={s.key} className={`st-card st-res__sec is-${s.key}`}>
                <div className="st-res__secHead">
                  <i className={`st-dot is-${s.key === 'math' ? 'math' : 'rw'}`} />
                  <span>{s.name}</span>
                  <span className="st-spacer" />
                  {x.routed && (
                    <span className={`st-res__route is-${x.route}`}><TrendingUpIcon size={14} />{t(`sat.mock.secRoute.${x.route}`)}</span>
                  )}
                </div>
                <div className="st-res__nums">
                  <div><b>{x.correct} / {x.total}</b><small>{t('sat.mock.rawCorrect')}</small></div>
                  <div><b className="st-res__secRange">{x.low != null ? `${x.low}–${x.high}` : '—'}</b><small>{t('sat.mock.secEstimate')}</small></div>
                </div>
                <div className="st-res__bar"><i style={{ width: `${Math.round(share(x) * 100)}%` }} /></div>
              </section>
            )
          })}
        </div>
      </div>

      <div className="st-res__row">
        <section className="st-card st-res__mods">
          <h2>{t('sat.mock.modules')}</h2>
          {(r.modules || []).map((m) => (
            <div key={m.key} className="st-res__mod">
              <i className={`st-dot is-${m.section === 'math' ? 'math' : 'rw'}`} />
              <b>{m.section === 'math' ? 'Math' : 'R&W'} · {t('sat.mock.moduleN', { n: String(moduleNo(m.key)) })}</b>
              <span className="st-muted">{t('sat.mock.modSpec', { q: String(m.count), m: String(m.minutes) })}</span>
              {m.closedByTimer && <span className="st-muted">· {t('sat.mock.closedByTimer')}</span>}
              <span className="st-spacer" />
              {m.route ? (
                <span className={`st-res__route is-${m.route}`}><TrendingUpIcon size={14} />{t(`sat.mock.modRoute.${m.route}`)}</span>
              ) : (
                <span className="st-res__route is-first">{t(moduleNo(m.key) === 1 ? 'sat.mock.firstModule' : 'sat.mock.fixedModule')}</span>
              )}
              <b className="st-res__score">{m.correct ?? 0} / {m.count}</b>
            </div>
          ))}
        </section>
        <section className="st-card st-res__weak">
          <h2>{t('sat.mock.lost')}</h2>
          <p className="st-muted">{t('sat.mock.lostSub')}</p>
          {weak.length === 0 ? <p className="st-muted">{t('sat.mock.noLost')}</p> : (
            <>
              <ul>
                {weak.slice(0, 3).map((w) => (
                  <li key={w.skillId}>
                    <i className={`st-dot is-${skillSection(w.skillId) === 'math' ? 'math' : 'rw'}`} />
                    <span>{skillName(w.skillId, lang)}</span>
                    <b>{plural(t, lang, 'sat.mock.errors', w.missed)}</b>
                  </li>
                ))}
              </ul>
              <button type="button" className="st-res__practice" disabled={busy} onClick={() => onPractice(weak.slice(0, 3).map((w) => w.skillId))}>
                <FlashIcon size={18} />{t('sat.mock.practiceWeak')}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
