'use client'

// Счётчик активного времени на экране тренажёра — «actual» недельной сводки для
// модулей, которые сами время не пишут (см. src/lib/db/activityTime.js).
//
// Считается только живое время: вкладка видна и студент что-то делал за
// последние IDLE_AFTER_MS. Открытый и забытый воркбук иначе насчитал бы часы, и
// сводка показала бы выполненный норматив там, где никто не занимался. Порог —
// две минуты, а не одна: в заданиях на аудирование студент слушает дорожку,
// ничего не нажимая, и минутный порог резал бы честное время.
//
// Отправка — пачкой раз в FLUSH_EVERY_SEC и досылкой при уходе (скрытие
// вкладки, pagehide, размонтирование экрана) с keepalive: обычный fetch браузер
// обрывает вместе со страницей, и последняя минута терялась бы ровно тогда,
// когда студент закончил и закрыл вкладку. Доставка best-effort: неудачную
// пачку не повторяем — это телеметрия, а не прогресс ученика.
//
// Аноним не считается: плана у него нет, сравнивать не с чем, а роут записи
// закрыт Bearer'ом.

import { useEffect, useRef } from 'react'
import { loadToken } from './session.js'

export const IDLE_AFTER_MS = 120_000
export const TICK_MS = 5_000
export const FLUSH_EVERY_SEC = 60

// scroll не всплывает до window, поэтому слушатели вешаются в capture.
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']

/**
 * Часы активного времени без таймеров и DOM — вся арифметика здесь, чтобы её
 * можно было проверить подставным now().
 */
export function createActivityClock({ now = () => Date.now(), idleAfterMs = IDLE_AFTER_MS } = {}) {
  let lastTick = now()
  let lastInput = lastTick
  let visible = true
  let pendingMs = 0

  function tick() {
    const t = now()
    const from = lastTick
    lastTick = t
    if (!visible || t <= from) return
    // Засчитываем только отрезок до ухода в бездействие: если студент затих
    // посреди промежутка, остаток промежутка — не его время.
    const activeUntil = lastInput + idleAfterMs
    pendingMs += Math.max(0, Math.min(t, activeUntil) - from)
  }

  return {
    tick,
    // Действие после простоя сначала закрывает простой: иначе ближайший tick
    // засчитал бы весь промежуток, хотя студент вернулся только в его конце.
    input() {
      const t = now()
      if (t - lastInput > idleAfterMs) tick()
      lastInput = t
    },
    setVisible(next) {
      if (next === visible) return
      if (!next) {
        tick() // досчитать видимый отрезок до ухода
        visible = false
      } else {
        visible = true
        lastTick = now() // время во фоне не считаем
        lastInput = lastTick // вернуться на вкладку — уже действие
      }
    },
    // Забрать накопленные целые секунды; дробный хвост остаётся до следующей пачки.
    take() {
      const s = Math.floor(pendingMs / 1000)
      pendingMs -= s * 1000
      return s
    },
    pendingSeconds() {
      return Math.floor(pendingMs / 1000)
    },
  }
}

/**
 * Считать время, пока экран смонтирован и enabled.
 * @param {'workbooks'|'vocabulary_sr'} module
 * @param {{ token?: string|null, enabled?: boolean }} [opts]
 */
export function useTimeOnTask(module, { token, enabled = true } = {}) {
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    if (!enabled || !module || typeof window === 'undefined') return undefined
    const clock = createActivityClock()
    if (document.visibilityState === 'hidden') clock.setVisible(false)

    const send = (keepalive) => {
      clock.tick()
      const seconds = clock.take()
      if (seconds <= 0) return
      // Токен читаем в момент отправки: за время урока он мог обновиться.
      const tok = tokenRef.current || loadToken()
      if (!tok) return
      fetch('/api/profile/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ module, seconds }),
        ...(keepalive ? { keepalive: true } : {}),
      }).catch(() => {})
    }

    const onInput = () => clock.input()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clock.setVisible(false)
        send(true)
      } else {
        clock.setVisible(true)
      }
    }
    const onPageHide = () => send(true)

    const timer = setInterval(() => {
      clock.tick()
      if (clock.pendingSeconds() >= FLUSH_EVERY_SEC) send(false)
    }, TICK_MS)

    for (const e of INPUT_EVENTS) window.addEventListener(e, onInput, { passive: true, capture: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      clearInterval(timer)
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput, { capture: true })
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      send(true)
    }
  }, [module, enabled])
}
