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
