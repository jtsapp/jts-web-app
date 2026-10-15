import { useEffect, useRef, useState } from 'react'
import { elapsedMs, expired, formatClock, remainingMs } from './session.js'
import { ScheduleIcon, TimerIcon } from '../../ielts/icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Последние пять минут модуля — красная плашка (Figma SAT 30: «04:52»), как предупреждение Bluebook
const LOW_MS = 5 * 60 * 1000

/**
 * Часы в шапке (Figma SAT 8, 26, 29). Тикают сами, четыре раза в секунду, чтобы не перерисовывать весь экран
 * вопроса; время берут из сессии (стена часов / накопленное), поэтому перезагрузка их не сбрасывает.
 * Скринридеру — раз в минуту, иначе он зачитывал бы каждую секунду.
 */
export default function QuestionTimer({ session, hidden, onExpire }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  const fired = useRef(false)
  const c = session.clock

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!fired.current && expired(session, now)) {
      fired.current = true
      onExpire?.()
    }
  }, [now, session, onExpire])

  const left = remainingMs(session, now)
  const shown = left === null ? elapsedMs(session, now) : left
  const low = left !== null && !c.soft && left <= LOW_MS
  const minute = Math.floor(shown / 60000)
  const Icon = c.soft ? ScheduleIcon : TimerIcon

  return (
    <div className={`st-timer ${low ? 'is-low' : ''} ${c.paused ? 'is-paused' : ''}`}>
      <Icon size={18} />
      <b aria-hidden="true">{hidden ? '--:--' : formatClock(shown)}</b>
      {c.soft && <span className="st-timer__note">{t('sat.run.softTimer')}</span>}
      <span className="st-sr" role="timer" aria-live="polite">
        {left === null ? t('sat.run.elapsedMin', { n: String(minute) }) : t('sat.run.leftMin', { n: String(minute) })}
      </span>
    </div>
  )
}
