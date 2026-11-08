// Итог теста уровня ждёт Луну (кейс 35): тест идёт на своём экране, где окна Луны нет и трекер «Луна пишет первой» спит,
// поэтому App кладёт итог сюда (вкладка, sessionStorage) и шлёт событие; трекер забирает его, как только снова работает
// (useProactive), и говорит на «Главной». Модуль лёгкий — без отчёта теста: его импортирует трекер в стартовом окне.

export const PLACEMENT_DONE_EVENT = 'jts:placement-done'
const KEY = 'jts_luna_placement_done'

/** App: итог теста сохранён — { lvl, tgt, strong, weak } (placementEvent.placementHighlights). */
export function announcePlacementDone(detail) {
  if (!detail) return
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(detail))
  } catch {
    // приватный режим — только событие
  }
  try {
    window.dispatchEvent(new CustomEvent(PLACEMENT_DONE_EVENT, { detail }))
  } catch {
    // без window (тесты на node)
  }
}

/** Трекер: забрать итог, если он ждёт (и больше не отдавать). */
export function takePlacementDone() {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY)
    if (!raw) return null
    globalThis.sessionStorage.removeItem(KEY)
    const d = JSON.parse(raw)
    return d && typeof d === 'object' ? d : null
  } catch {
    return null
  }
}
