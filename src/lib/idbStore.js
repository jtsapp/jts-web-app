'use client'

// Маленький key-value поверх IndexedDB: одна база, одно хранилище, get/put/del.
//
// Всё best-effort: нет IndexedDB (SSR, приватный режим, отказ пользователя) →
// get отдаёт null, put/del — no-op. Экран не должен падать из-за хранилища.
//
// В Shadowing лежит своя, более старая копия этой механики
// (practice/shadowing/recordings.js) — она уже в проде со своей схемой
// значения, и переписывать её ради общего помощника значит трогать работающий
// раздел без нужды.

export function createIdbStore(dbName, storeName, version = 1) {
  let dbPromise = null

  function openDb() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null)
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve) => {
      let req
      try {
        req = indexedDB.open(dbName, version)
      } catch {
        return resolve(null)
      }
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    return dbPromise
  }

  // Одна транзакция: fn(store) → IDBRequest; null при любой недоступности.
  function tx(mode, fn) {
    return openDb().then(
      (db) =>
        new Promise((resolve) => {
          if (!db) return resolve(null)
          let store
          try {
            store = db.transaction(storeName, mode).objectStore(storeName)
          } catch {
            return resolve(null)
          }
          let req
          try {
            req = fn(store)
          } catch {
            return resolve(null)
          }
          if (req && typeof req.onsuccess !== 'undefined') {
            req.onsuccess = () => resolve(req.result ?? null)
            req.onerror = () => resolve(null)
          } else {
            resolve(null)
          }
        }),
    )
  }

  return {
    get: (key) => tx('readonly', (s) => s.get(key)),
    put: (key, value) => tx('readwrite', (s) => s.put(value, key)).then(() => undefined),
    del: (key) => tx('readwrite', (s) => s.delete(key)).then(() => undefined),
  }
}
