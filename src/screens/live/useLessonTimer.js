import { useEffect, useRef, useState } from 'react'

import { playCue } from '../../lib/notifySound.js'

/**
 * Таймер урока на стороне ученика.
 *
 * Преподаватель включает отсчёт, сервер запоминает время окончания в состоянии
 * занятия (спека live-lesson-server-state §6.2), и каждый клиент считает
 * остаток до него сам. Раньше отсчёт шёл от момента, когда событие дошло до
 * вкладки: вошедший позже или перезагрузивший страницу ученик таймера не видел
 * вовсе, а преподаватель, закрывший панель таймера, останавливал его у всех.
 *
 * `timer`: `undefined` — состояния ещё нет; `null` — таймер не идёт;
 * `{endsAtMs, durationSeconds}` — идёт до `endsAtMs` по часам сервера.
 * `offset` — поправка часов (`serverNowMs − Date.now()`, useLessonLiveState):
 * часы ученика могут отставать на минуты, и без неё остаток был бы чужим.
 *
 * Тик берёт время у `Date.now()`, а не вычитает по секунде: вкладка в фоне
 * подмораживает `setInterval`, и вычитание отстало бы ровно на столько, сколько
 * ученик смотрел в другое окно.
 *
 * Ноль не прячем: «00:00» — это «время вышло», и оно должно остаться на экране,
 * пока преподаватель не выключит таймер или не запустит новый. Исчезнувший
 * таймер ученик прочитал бы как «сломалось», а не как «всё».
 */
export function useLessonTimer(timer, offset = 0) {
  const endsAtMs = Number.isFinite(timer?.endsAtMs) ? timer.endsAtMs : null
  // Остаток помнит, до какого окончания он посчитан: число от прежнего таймера
  // новому не принадлежит.
  const [left, setLeft] = useState({ endsAtMs: null, seconds: null })

  // Тикаем, только пока есть что отсчитывать: на нуле интервал снимается сам,
  // иначе он бесконечно перерисовывал бы «00:00».
  useEffect(() => {
    if (endsAtMs == null) return undefined
    const tick = () => {
      const seconds = Math.max(0, Math.round((endsAtMs - (Date.now() + offset)) / 1000))
      setLeft((prev) => (prev.endsAtMs === endsAtMs && prev.seconds === seconds ? prev : { endsAtMs, seconds }))
      return seconds
    }
    // Первое чтение — сразу, а не через четверть секунды: иначе новый таймер
    // успевал бы показать пустое место.
    if (tick() === 0) return undefined
    const id = setInterval(() => { if (tick() === 0) clearInterval(id) }, 250)
    return () => clearInterval(id)
  }, [endsAtMs, offset])

  const remaining = endsAtMs != null && left.endsAtMs === endsAtMs ? left.seconds : null

  // Отсчёт пошёл. Сигнал именно на старте: ученик мог смотреть в задание, а не
  // в правый верхний угол, и «две минуты» начинались бы для него позже. Но
  // только на НОВОМ таймере: вход в уже идущий — не старт, отсчёт начался без
  // этого ученика. Любое изменение состояния (стадия, указка) приносит тот же
  // таймер заново — по времени окончания его и узнаём.
  const known = timer !== undefined
  const seenEndsAtRef = useRef(undefined)
  useEffect(() => {
    if (!known) {
      seenEndsAtRef.current = undefined
      return
    }
    const seen = seenEndsAtRef.current
    seenEndsAtRef.current = endsAtMs
    if (seen === undefined || endsAtMs == null || endsAtMs === seen) return
    playCue('timerStart')
  }, [known, endsAtMs])

  // Время вышло. Отдельным эффектом на ПЕРЕХОД в ноль, а не внутри тика: тик
  // идёт четыре раза в секунду и на нуле сыграл бы очередью. `expired` держится,
  // пока преподаватель не снимет таймер, поэтому запоминаем, что уже звучали.
  const expired = remaining === 0
  const rangRef = useRef(false)
  useEffect(() => {
    if (!expired) {
      rangRef.current = false
      return
    }
    if (rangRef.current) return
    rangRef.current = true
    playCue('timerEnd')
  }, [expired])

  return { remaining, expired }
}

/** `95` → `01:35`. */
export function formatTimer(totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
