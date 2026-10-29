// Записи Speaking, которые ещё не оценены, — на устройстве ученика (IndexedDB), пока оценка не пройдёт.
//
// Зачем: сервер записи не хранит (только стенограммы), и раньше любой сбой оценки — распознаватель, модель, сеть —
// значил «запишите ответы заново», а перезагрузка до оценки теряла записи диагностики насовсем. Теперь записи лежат
// здесь до успешной оценки, и «Отправить ещё раз» уходит с теми же WAV на ту же работу (retryAttemptId).
//
// Ключи: `attempt:<id>` — работа банка или mock, `diag:<id>` — Speaking диагностики. Запись живёт KEEP_DAYS: дольше
// повторять незачем, а минута речи — ~2 МБ на диске ученика. Без IndexedDB (приватный режим, старый браузер) всё
// молча не работает — вызывающий остаётся с записями в памяти, как раньше.

const DB = 'jts-ielts-speaking'
const STORE = 'pending'
const KEEP_DAYS = 7

let dbP = null
function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbP) {
    dbP = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    }).then((db) => {
      if (!db) dbP = null
      return db
    })
  }
  return dbP
}

function run(mode, fn) {
  return openDb().then(
    (db) =>
      db &&
      new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, mode)
          const req = fn(tx.objectStore(STORE))
          tx.oncomplete = () => resolve(req?.result ?? null)
          tx.onerror = () => resolve(null)
          tx.onabort = () => resolve(null)
        } catch {
          resolve(null)
        }
      }),
  )
}

export const attemptKey = (attemptId) => `attempt:${attemptId}`
export const diagKey = (attemptId) => `diag:${attemptId}`

const fresh = (rec) => rec && Array.isArray(rec.answers) && Date.now() - (rec.savedAt || 0) < KEEP_DAYS * 86_400_000

/** Положить записи: { testId?, mode?, answers: [{ itemId, durationSec, wav: Blob }] }. */
export async function savePendingTakes(key, rec) {
  if (!key || !rec?.answers?.length) return
  await run('readwrite', (s) => s.put({ ...rec, answers: rec.answers.map(({ itemId, durationSec, wav }) => ({ itemId, durationSec, wav })), savedAt: Date.now() }, key))
  pruneOld()
}

/** Записи по ключу или null (нет, протухли, нет IndexedDB). */
export async function loadPendingTakes(key) {
  if (!key) return null
  const rec = await run('readonly', (s) => s.get(key))
  return fresh(rec) ? rec : null
}

export function deletePendingTakes(key) {
  return key ? run('readwrite', (s) => s.delete(key)) : Promise.resolve(null)
}

let pruned = false
function pruneOld() {
  if (pruned) return
  pruned = true
  run('readwrite', (s) => {
    const req = s.openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) return
      if (!fresh(cur.value)) cur.delete()
      cur.continue()
    }
    return null
  }).catch(() => {})
}
