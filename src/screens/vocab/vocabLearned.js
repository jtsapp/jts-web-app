// Локальный прогресс «N изучено» по уровню/сфере: слова, на которые
// ученик ответил верно хотя бы раз в проверке каталога.

const STORE = 'jts.vocab.learned.v1'

function userKey(token) {
  if (!token || typeof token !== 'string') return 'anon'
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.sub || payload.userId || payload.id || 'anon')
  } catch {
    return 'anon'
  }
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}') || {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORE, JSON.stringify(data))
  } catch {
    /* quota */
  }
}

/** keys — уникальные ключи слов (обычно lowercase en / id). */
export function recordVocabLearned(token, scopeId, keys) {
  if (!scopeId || !Array.isArray(keys) || !keys.length) return
  const all = readAll()
  const uid = userKey(token)
  const bag = all[uid] || {}
  const set = new Set(bag[scopeId] || [])
  for (const k of keys) {
    if (k == null || k === '') continue
    set.add(String(k).toLowerCase())
  }
  bag[scopeId] = [...set]
  all[uid] = bag
  writeAll(all)
}

export function learnedCount(token, scopeId) {
  if (!scopeId) return 0
  const bag = readAll()[userKey(token)] || {}
  const list = bag[scopeId]
  return Array.isArray(list) ? list.length : 0
}
