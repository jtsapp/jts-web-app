'use client'

// Локальное хранилище записей Shadowing: аудио-blob + лучший балл на фразу, в
// IndexedDB (переживает перезагрузку). Ключ — segId (`${lessonId}_${index}`),
// значение { blob, score, ts }. score — ЛУЧШИЙ достигнутый (max), blob — последняя
// запись (для «Твоя запись» / «Сравнить»).
//
// Всё best-effort: нет IndexedDB (SSR, приватный режим, отказ) → геттеры отдают
// null/пусто, saveTake — no-op. Экран не должен падать из-за хранилища.

const DB_NAME = 'jts-shadowing'
const STORE = 'takes'
const VERSION = 1

let _dbPromise = null

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve) => {
    let req
    try {
      req = indexedDB.open(DB_NAME, VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return _dbPromise
}

// Обёртка одной транзакции: fn(store) → результат req; null при недоступности.
function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null)
        let store
        try {
          store = db.transaction(STORE, mode).objectStore(STORE)
        } catch {
          return resolve(null)
        }
        let out
        try {
          out = fn(store)
        } catch {
          return resolve(null)
        }
        if (out && typeof out.onsuccess !== 'undefined') {
          out.onsuccess = () => resolve(out.result)
          out.onerror = () => resolve(null)
        } else {
          resolve(out)
        }
      }),
  )
}

// Сохранить попытку: blob — новая запись, score — балл этой попытки. Храним
// лучший балл (max с существующим), blob обновляем на последний.
export async function saveTake(segId, blob, score) {
  if (!segId || !blob) return
  const prev = await tx('readonly', (s) => s.get(segId))
  const best = Math.max(Number(prev?.score) || 0, Number(score) || 0)
  await tx('readwrite', (s) => s.put({ blob, score: best, ts: Date.now() }, segId))
}

// Blob последней записи фразы (или null).
export async function getTakeBlob(segId) {
  const rec = await tx('readonly', (s) => s.get(segId))
  return rec?.blob || null
}

// Лучший балл фразы (или null, если записи нет).
export async function getScore(segId) {
  const rec = await tx('readonly', (s) => s.get(segId))
  return typeof rec?.score === 'number' ? rec.score : null
}

// Map segId → лучший балл для всех записанных фраз урока (префикс `${lessonId}_`).
export async function getLessonScores(lessonId) {
  const out = new Map()
  const db = await openDb()
  if (!db) return out
  return new Promise((resolve) => {
    let store
    try {
      store = db.transaction(STORE, 'readonly').objectStore(STORE)
    } catch {
      return resolve(out)
    }
    const prefix = `${lessonId}_`
    const req = store.openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) return resolve(out)
      if (typeof cur.key === 'string' && cur.key.startsWith(prefix)) {
        const sc = cur.value?.score
        if (typeof sc === 'number') out.set(cur.key, sc)
      }
      cur.continue()
    }
    req.onerror = () => resolve(out)
  })
}

// Удалить все записи урока (например, «сбросить прогресс»).
export async function clearLesson(lessonId) {
  const db = await openDb()
  if (!db) return
  await new Promise((resolve) => {
    let store
    try {
      store = db.transaction(STORE, 'readwrite').objectStore(STORE)
    } catch {
      return resolve()
    }
    const prefix = `${lessonId}_`
    const req = store.openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) return resolve()
      if (typeof cur.key === 'string' && cur.key.startsWith(prefix)) cur.delete()
      cur.continue()
    }
    req.onerror = () => resolve()
  })
}
