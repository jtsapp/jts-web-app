// src/practice/chess/clock.js
// Шахматные часы. Остаток считается от отметки времени, а не тиками: таймер в фоновой вкладке браузер
// замедляет, и часы на тиках отставали бы. Объект неизменяемый — машина партии хранит снимки по ходам
// и возвращает их при откате.
export function newClock(minutes) {
  if (!minutes) return null
  const ms = minutes * 60000
  return { w: ms, b: ms, running: null, since: null }
}

export const fromSnapshot = ({ w, b }) => ({ w, b, running: null, since: null })

export function remaining(clock, side, now) {
  const spent = clock.running === side ? now - clock.since : 0
  return Math.max(0, clock[side] - spent)
}

export function snapshot(clock, now) {
  return clock ? { w: remaining(clock, 'w', now), b: remaining(clock, 'b', now) } : null
}

export function pause(clock, now) {
  return clock ? { ...snapshot(clock, now), running: null, since: null } : null
}

export function switchTo(clock, side, now) {
  return clock ? { ...snapshot(clock, now), running: side, since: now } : null
}

export function flagged(clock, now) {
  if (!clock || !clock.running) return null
  return remaining(clock, clock.running, now) <= 0 ? clock.running : null
}
