// Старые хранилища «Словаря» (jts.vocab.learned.v1 / jts.vocab.misses.v1):
// один блоб на всех учеников браузера, { <uid>: запись }. С 06.10.2026 прогресс
// живёт в общем хранилище и на сервере (vocabLearned.js, vocabMisses.js), а
// блоб нужен только чтобы один раз перенести запись текущего ученика.
//
// Блоб целиком не чистим (ни здесь, ни в clearLocalPractice): в нём записи
// других учеников этого браузера, ещё не перенесённые.

/** uid старой записи — тот же разбор, что был у модулей «Словаря». */
export function legacyUid(token) {
  if (!token || typeof token !== 'string') return 'anon'
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.sub || payload.userId || payload.id || 'anon')
  } catch {
    return 'anon'
  }
}

function readBlob(key) {
  try {
    const all = JSON.parse(localStorage.getItem(key) || 'null')
    return all && typeof all === 'object' && !Array.isArray(all) ? all : null
  } catch {
    return null
  }
}

/** Запись ученика в старом блобе или null. */
export function peekLegacy(key, token) {
  const bag = readBlob(key)?.[legacyUid(token)]
  return bag && typeof bag === 'object' && !Array.isArray(bag) ? bag : null
}

/** Убрать запись ученика из блоба после переноса; пустой блоб — весь ключ. */
export function dropLegacy(key, token) {
  const all = readBlob(key)
  if (!all) return
  delete all[legacyUid(token)]
  try {
    if (Object.keys(all).length) localStorage.setItem(key, JSON.stringify(all))
    else localStorage.removeItem(key)
  } catch {
    /* квота: блоб стал меньше, но записать не вышло — перенос идемпотентен */
  }
}
