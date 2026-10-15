// Связь экранов с помощником без протаскивания пропсов через App.
//
// Кнопка «Спросить помощника» живёт глубоко в плеерах уроков, а сам виджет —
// на уровне App. Плеер не знает, смонтирован ли виджет (на экзамене его нет),
// поэтому кнопка рисуется только при isAssistantAvailable(): без виджета её
// просто нет, и тестам плееров помощник не мешает.

import { useSyncExternalStore } from 'react'

export const OPEN_EVENT = 'jts:assistant-open'

let available = false
const listeners = new Set()

export function setAssistantAvailable(value) {
  if (available === Boolean(value)) return
  available = Boolean(value)
  for (const fn of listeners) fn()
}

export function isAssistantAvailable() {
  return available
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** true, пока на странице смонтирован виджет помощника. */
export function useAssistantAvailable() {
  return useSyncExternalStore(subscribe, isAssistantAvailable, () => false)
}

/** Открыть окно помощника; `prompt` — вопрос, который сразу уйдёт. */
export function openAssistant({ prompt } = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { prompt: prompt || '' } }))
}

// Обратное направление: Луна просит App открыть раздел (id из destinations.js).
// Переход делает App — только он знает, как открыть экран (handleNav).
export const NAVIGATE_EVENT = 'jts:assistant-navigate'

export function navigateTo(target) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { target } }))
}

/** Подписка App на переходы, которые просит Луна. */
export function onAssistantNavigate(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e) => fn(e.detail?.target)
  window.addEventListener(NAVIGATE_EVENT, handler)
  return () => window.removeEventListener(NAVIGATE_EVENT, handler)
}
