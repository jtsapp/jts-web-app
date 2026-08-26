import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Таймер урока на стороне ученика.
 *
 * Преподаватель включает отсчёт у себя, событие уходит всему классу
 * (`/topic/lesson/{id}/timer`), и то же время идёт у ученика. Раньше таймер был
 * личным секундомером преподавателя: «две минуты на задание» ученик не видел
 * вовсе и узнавал о конце времени на слух.
 *
 * Считаем от МОМЕНТА ПОЛУЧЕНИЯ события, а не до присланного дедлайна: часы
 * браузеров расходятся, и абсолютное время пришлось бы синхронизировать. Ошибка
 * здесь — сетевая задержка, доли секунды на двухминутном таймере.
 *
 * Тик берёт время у `Date.now()`, а не вычитает по секунде: вкладка в фоне
 * подмораживает `setInterval`, и вычитание отстало бы ровно на столько, сколько
 * ученик смотрел в другое окно.
 *
 * Ноль не прячем: «00:00» — это «время вышло», и оно должно остаться на экране,
 * пока преподаватель не выключит таймер или не запустит новый. Исчезнувший
 * таймер ученик прочитал бы как «сломалось», а не как «всё».
 */
export function useLessonTimer() {
  const [remaining, setRemaining] = useState(null)
  const endsAtRef = useRef(0)

  /** Событие из сокета: `{ action: 'start' | 'stop', durationSeconds }`. */
  const onTimer = useCallback((evt) => {
    if (evt?.action === 'start' && evt.durationSeconds > 0) {
      endsAtRef.current = Date.now() + evt.durationSeconds * 1000
      setRemaining(evt.durationSeconds)
      return
    }
    endsAtRef.current = 0
    setRemaining(null)
  }, [])

  // Тикаем, только пока есть что отсчитывать: на нуле интервал снимается сам,
  // иначе он бесконечно перерисовывал бы «00:00».
  const ticking = remaining !== null && remaining > 0
  useEffect(() => {
    if (!ticking) return undefined
    const id = setInterval(() => {
      const left = Math.round((endsAtRef.current - Date.now()) / 1000)
      setRemaining(left > 0 ? left : 0)
    }, 250)
    return () => clearInterval(id)
  }, [ticking])

  return { remaining, expired: remaining === 0, onTimer }
}

/** `95` → `01:35`. */
export function formatTimer(totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
