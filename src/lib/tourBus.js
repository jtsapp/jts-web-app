// Пауза туров экранов (OnboardingTour) — без протаскивания пропсов через App.
//
// До 28.10.2026 здесь же жила связь туров с помощником Луной: она «нажимала "?"»
// экрана заявкой и читала шаги вслух. Тур «от Луны» убран (решение владельца —
// туры только новые, вида coach), осталась пауза.

import { useSyncExternalStore } from 'react'

// Окна уровня приложения рисует App, а тур — экран, и друг о друге они не
// знали: «Поздравляем с покупкой!» открывалось разом с туром «Главной», тур
// (z-index 200) ложился поверх окна (60), и его затемнение накрывало кнопку
// окна (жалоба 22.10.2026). Окно — событие, тур подождёт: пока держит хоть
// одна причина, тур не рисуется. Причины — именами, чтобы снятие одной не
// отпускало чужую.
const holds = new Set()
const holdListeners = new Set()

/** Поставить (on) или снять паузу туров по причине reason. */
export function holdTours(reason, on) {
  if (on === holds.has(reason)) return
  if (on) holds.add(reason)
  else holds.delete(reason)
  for (const fn of [...holdListeners]) fn()
}

function subscribeHold(fn) {
  holdListeners.add(fn)
  return () => holdListeners.delete(fn)
}

/** Тур сейчас на паузе. */
export function useToursHeld() {
  return useSyncExternalStore(subscribeHold, () => holds.size > 0, () => false)
}
