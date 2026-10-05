import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { CafeIcon, RouteIcon, SigmaIcon } from '../icons.jsx'
import MockStrip from './MockStrip.jsx'
import { clock, moduleNo } from '../model/mock.js'

const R = 100
const C = 2 * Math.PI * R

/**
 * Перерыв 10 минут (Figma SAT 32): кольцо с обратным отсчётом, три карточки — можно встать, что дальше, секция R&W
 * закрыта, — лента прохождения и «Продолжить сейчас». Отсчёт — от остатка, который дал сервер (стена часов: перезагрузка
 * перерыв не продлевает); на нуле следующий модуль стартует сам.
 */
export default function BreakView({ run, busy, onStart }) {
  const { t, lang } = useI18n()
  const total = 10 * 60
  const ends = useRef(null)
  const [left, setLeft] = useState(run.breakLeftSec ?? total)
  const fired = useRef(false)
  const next = run.modules[run.index]
  const prev = run.modules[run.index - 1]

  useEffect(() => {
    // конец перерыва — остаток сервера от момента показа, а не его «сейчас»: сбитые часы устройства перерыв не сдвинут
    if (ends.current == null) ends.current = Date.now() + (run.breakLeftSec ?? total) * 1000
    const tick = () => {
      const l = Math.max(0, Math.round((ends.current - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0 && !fired.current) {
        fired.current = true
        onStart()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [onStart, run.breakLeftSec, total])

  const nextName = `${next.section === 'math' ? 'Math' : 'R&W'} · ${moduleNo(next.key)}`
  return (
    <main className="st-mock">
      <div className="st-mock__head">
        <h1>{t('sat.mock.break')}</h1>
        <div className="st-break__ring" role="timer" aria-label={t('sat.mock.breakLeft', { time: clock(left) })}>
          <svg viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r={R} className="st-break__track" />
            <circle cx="110" cy="110" r={R} className="st-break__arc" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
          </svg>
          <div>
            <b>{clock(left)}</b>
            <small>{t('sat.mock.until', { name: `${next.section === 'math' ? 'Math' : 'Reading and Writing'} · ${t('sat.mock.moduleN', { n: String(moduleNo(next.key)) })}` })}</small>
          </div>
        </div>
      </div>
      <div className="st-break__cards">
        <div className="st-card st-break__card">
          <span><CafeIcon size={18} /></span>
          <b>{t('sat.mock.standUp')}</b>
          <p>{t('sat.mock.standUpText')}</p>
        </div>
        <div className="st-card st-break__card">
          <span><SigmaIcon size={18} /></span>
          <b>{t('sat.mock.nextUp', { name: nextName })}</b>
          <p>
            {plural(t, lang, 'sat.q', next.count)} · {t('sat.mock.min', { n: String(next.minutes) })}
            {next.section === 'math' && <> · {t('sat.mock.mathTools')}</>}
          </p>
        </div>
        <div className="st-card st-break__card">
          <span><RouteIcon size={18} /></span>
          <b>{t('sat.mock.sectionClosed', { name: prev?.section === 'math' ? 'Math' : 'R&W' })}</b>
          <p>{t('sat.mock.noReturn')}</p>
        </div>
      </div>
      <MockStrip modules={run.modules} index={run.index} phase="break" />
      <div className="st-mock__foot">
        <span className="st-muted">{t('sat.mock.autoStart')}</span>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-mock__cta" disabled={busy} onClick={onStart}>
          {t('sat.mock.continueNow')}<ArrowForwardIcon size={20} />
        </button>
      </div>
    </main>
  )
}
