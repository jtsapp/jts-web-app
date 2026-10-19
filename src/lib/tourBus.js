// Связь туров экранов (OnboardingTour) с помощником Луной — без протаскивания
// пропсов через App, как assistantBus.
//
// Запуск. Тур у каждого экрана свой и стартует своей функцией (кнопка «?»:
// Практика перед стартом возвращает вкладку «Аудирование», Уроки — «Онлайн»),
// поэтому Луна не собирает тур сама, а «нажимает "?"»: requestTour() оставляет
// заявку, и её забирает экран, у которого кнопка «?» есть (useTourRequest в
// LearningLayout). Заявка живёт, а не только летит событием: Луна сначала
// открывает раздел, и экран, которому она адресована, появляется позже, а
// кнопка «?» у части экранов — ещё позже (ждёт загрузки данных). Старая
// заявка гаснет сама: тур, всплывший через минуту ни с того ни с сего, хуже
// несостоявшегося.
//
// Озвучка. Тур сообщает о каждом показанном шаге (emitTourStep) и о конце
// (emitTourEnd), а Луна, если тур запустила она, читает шаг вслух. Карточка
// тура при этом показывает, что говорит Луна, и даёт выключить звук —
// состояние озвучки (useTourNarration) ведёт виджет помощника.

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

export const TOUR_REQUEST_TTL_MS = 10_000

const listeners = new Set()
let pending = null // { at }

function emit(event) {
  for (const fn of [...listeners]) fn(event)
}

/** Подписка на события тура: {type: 'request'|'step'|'end', …}. */
export function onTourEvent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Попросить экран открыть свой тур (как кнопкой «?»). */
export function requestTour() {
  pending = { at: Date.now() }
  emit({ type: 'request' })
}

/** Заявка ещё ждёт экрана. */
export function tourRequestPending() {
  if (pending && Date.now() - pending.at > TOUR_REQUEST_TTL_MS) pending = null
  return Boolean(pending)
}

export function cancelTourRequest() {
  pending = null
}

/** Забрать заявку: true — тур просили, и теперь его открывает этот экран. */
export function takeTourRequest() {
  if (!tourRequestPending()) return false
  pending = null
  return true
}

export function emitTourStep(step) {
  emit({ type: 'step', ...step })
}

export function emitTourEnd() {
  emit({ type: 'end' })
}

/**
 * Экран с туром забирает заявку Луны. start — та же функция, что у кнопки «?»;
 * пока её нет (экран ждёт данных), заявка ждёт тоже.
 */
export function useTourRequest(start) {
  const ref = useRef(start)
  useLayoutEffect(() => {
    ref.current = start
  })
  const ready = typeof start === 'function'
  useEffect(() => {
    if (!ready) return undefined
    if (takeTourRequest()) ref.current?.()
    return onTourEvent((e) => {
      if (e.type === 'request' && takeTourRequest()) ref.current?.()
    })
  }, [ready])
}

// ── Озвучка тура ────────────────────────────────────────────────────────────
let narration = { on: false, muted: false }
let toggleMute = null
const narrationListeners = new Set()

/** Виджет помощника: тур ведёт помощник (on), выключен ли звук и чей аватар (Луна или Айзере, persona.js). */
export function setTourNarration(next, onToggleMute) {
  narration = { on: Boolean(next.on), muted: Boolean(next.muted), avatar: next.avatar || null }
  if (onToggleMute !== undefined) toggleMute = onToggleMute
  for (const fn of [...narrationListeners]) fn()
}

export function toggleTourNarrationMute() {
  toggleMute?.()
}

function subscribeNarration(fn) {
  narrationListeners.add(fn)
  return () => narrationListeners.delete(fn)
}

const OFF = { on: false, muted: false }

/** Для карточки тура: показывать ли строку «Рассказывает Луна» и кнопку звука. */
export function useTourNarration() {
  return useSyncExternalStore(subscribeNarration, () => narration, () => OFF)
}
