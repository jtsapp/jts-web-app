import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { BlockIcon, CalendarIcon, PlayCircleIcon, TickIcon } from '../icons.jsx'
import { CheckCircleIcon } from '../../ielts/icons.jsx'
import { parse } from '../model/plan.js'
import { skillName } from '../names.js'
import { fmtDate } from '../model/dates.js'

/**
 * Меню занятия (Figma SAT 13): название и дата, цель, «Начать сейчас», «Перенести на дату», «Отметить выполненным»,
 * «Отметить пропущенным». Цель — навыки занятия: формулировок вида «решать уравнения с параметром за 95 с» в банке нет,
 * их надо писать методисту. «Начать сейчас» — учебная сессия по этому занятию (фаза 5). Сделанное и пропущенное можно
 * вернуть в план (этого пункта в макете нет — без него случайная отметка была бы необратимой).
 *
 * Меню открывается правой кнопкой и встаёт левым верхним углом в точку клика (`at` — clientX/clientY, position: fixed);
 * у края окна сдвигается внутрь, чтобы не уехать за экран. Левая кнопка по занятию сразу начинает его.
 */
export default function LessonMenu({ lesson, examDate, todayIso, busy, onStatus, onMove, onStart, onClose, at }) {
  const { t, lang } = useI18n()
  const [moving, setMoving] = useState(false)
  const [date, setDate] = useState(lesson.date >= todayIso ? lesson.date : todayIso)
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: at.x, top: at.y })
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const when = fmtDate(loc, parse(lesson.date), { weekday: 'short', day: 'numeric', month: 'short' })
  const names = lesson.skillIds.map((s) => skillName(s, lang))

  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const pad = 8
    setPos({
      left: Math.max(pad, Math.min(at.x, window.innerWidth - r.width - pad)),
      top: Math.max(pad, Math.min(at.y, window.innerHeight - r.height - pad)),
    })
  }, [at.x, at.y, moving])

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    // Прокрутка уводит занятие из-под меню, а меню в fixed осталось бы висеть в старой точке.
    const onScroll = (e) => !ref.current?.contains(e.target) && onClose()
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [onClose])

  const closed = lesson.status === 'done' || lesson.status === 'skipped'
  return (
    <div ref={ref} className="st-lmenu" role="dialog" aria-label={names.join(' · ')} tabIndex={-1} style={{ position: 'fixed', ...pos }}>
      <b className="st-lmenu__title">{names.join(' · ')} · {when}</b>
      <p className="st-lmenu__goal">{t('sat.plan.goal', { skills: names.join(', ') })}</p>
      <button type="button" className="st-lmenu__item is-start" disabled={busy || lesson.status === 'skipped'} onClick={onStart}>
        <PlayCircleIcon size={20} />{t('sat.plan.startNow')}
      </button>
      {moving ? (
        <div className="st-lmenu__move">
          <input type="date" value={date} min={todayIso} max={examDate || undefined} onChange={(e) => setDate(e.target.value)} aria-label={t('sat.plan.moveTo')} />
          <button type="button" className="ih-btn ih-btn--outline" disabled={busy || !date} onClick={() => onMove(date)}>{t('sat.plan.moveOk')}</button>
        </div>
      ) : (
        <button type="button" className="st-lmenu__item" disabled={busy || closed} onClick={() => setMoving(true)}>
          <CalendarIcon size={20} />{t('sat.plan.moveTo')}
        </button>
      )}
      {closed ? (
        <button type="button" className="st-lmenu__item" disabled={busy} onClick={() => onStatus('planned')}>
          <TickIcon size={20} />{t('sat.plan.backToPlan')}
        </button>
      ) : (
        <>
          <button type="button" className="st-lmenu__item" disabled={busy} onClick={() => onStatus('done')}>
            <CheckCircleIcon size={20} />{t('sat.plan.markDone')}
          </button>
          <button type="button" className="st-lmenu__item" disabled={busy} onClick={() => onStatus('skipped')}>
            <BlockIcon size={20} />{t('sat.plan.markSkipped')}
          </button>
        </>
      )}
    </div>
  )
}
