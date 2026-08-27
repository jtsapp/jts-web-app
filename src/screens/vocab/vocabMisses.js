// Локальная память ошибок словаря: топ «хуже запомненных» на главной.
// Ключ по user id из JWT (если есть), иначе общий.

const STORE = 'jts.vocab.misses.v1'

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

export function recordVocabMisses(token, words) {
  if (!Array.isArray(words) || !words.length) return
  const all = readAll()
  const uid = userKey(token)
  const bag = all[uid] || {}
  const now = Date.now()
  for (const w of words) {
    if (!w?.word) continue
    const key = String(w.key || w.word).toLowerCase()
    const prev = bag[key] || { word: w.word, ru: w.translationRu || w.ru || '', kk: w.translationKz || w.kk || '', misses: 0 }
    bag[key] = {
      ...prev,
      word: w.word,
      ru: w.translationRu || w.ru || prev.ru || '',
      kk: w.translationKz || w.kk || prev.kk || '',
      misses: (prev.misses || 0) + 1,
      at: now,
    }
  }
  all[uid] = bag
  writeAll(all)
}

export function topVocabMisses(token, limit = 3) {
  const bag = readAll()[userKey(token)] || {}
  return Object.values(bag)
    .sort((a, b) => (b.misses - a.misses) || (b.at - a.at))
    .slice(0, limit)
}

export function clearVocabMiss(token, key) {
  const all = readAll()
  const uid = userKey(token)
  const bag = all[uid]
  if (!bag) return
  delete bag[String(key).toLowerCase()]
  all[uid] = bag
  writeAll(all)
}
