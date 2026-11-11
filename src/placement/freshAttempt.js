// Пересдача теста уровня (обратная связь 11.11: «тест на уровень пересдать не получается»). Тест v16 хранит прогон в
// localStorage по пространству профиля и после итога открывается на нём же: начать заново можно было только мелкой
// ссылкой внизу итога. Кнопка «Пройти тест заново» на странице результатов убирает ЗАКОНЧЕННЫЙ прогон до загрузки
// iframe, и тест начинается с первого экрана. Незаконченный остаётся — ученик продолжит, ответы не пропадут. Итог
// прошлой попытки уже на сервере (его сохраняет мост, как только пройдены три раздела), страница результатов читает его
// оттуда.

// Ключ — как в патче storage-ns сборки (scripts/build-placement-v16.js).
const STORAGE = 'jts_placement_ui_v11'

export function storageNs(profileId) {
  return String(profileId || 'guest').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

export function storageKey(ns) {
  return ns ? `${STORAGE}:${ns}` : STORAGE
}

/** Убирает прогон, если он закончен (итог показан или пройдены три раздела). true — убрали. */
export function clearFinishedAttempt(ns, storage = globalThis.localStorage) {
  try {
    const key = storageKey(ns)
    const app = JSON.parse(storage.getItem(key) || 'null')?.app
    if (!app || !(app.completedNotified || app.completedByUser)) return false
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
