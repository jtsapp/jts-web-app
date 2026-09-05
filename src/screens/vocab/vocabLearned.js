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

/**
 * Ключ слова в хранилище прогресса.
 *
 * Один на всё приложение: проверка каталога записывает прогресс этим ключом,
 * а списки уроков по нему же считают «сколько изучено». Пока формула жила в
 * двух местах, счётчики расходились — уровень показывал 7, а каждый его урок
 * ноль.
 */
export function vocabKey(card) {
  return String(card?.id || card?.en || '').toLowerCase()
}

/** Все изученные ключи набора — множеством, чтобы считать пересечения. */
export function learnedKeys(token, scopeId) {
  if (!scopeId) return new Set()
  const bag = readAll()[userKey(token)] || {}
  return new Set(Array.isArray(bag[scopeId]) ? bag[scopeId] : [])
}

/** Сколько карточек из списка уже изучено. */
export function learnedInCards(keys, cards) {
  if (!keys?.size || !Array.isArray(cards)) return 0
  let n = 0
  for (const card of cards) if (keys.has(vocabKey(card))) n++
  return n
}

/**
 * Снять отметку «изучено».
 *
 * Нужна ручной отметке в списке слов: поставить и не суметь убрать — это не
 * отметка, а ловушка. Проверке каталога снятие не нужно, она только добавляет.
 */
export function forgetVocabLearned(token, scopeId, keys) {
  if (!scopeId || !Array.isArray(keys) || !keys.length) return
  const all = readAll()
  const uid = userKey(token)
  const bag = all[uid] || {}
  const drop = new Set(keys.filter(Boolean).map((k) => String(k).toLowerCase()))
  bag[scopeId] = (bag[scopeId] || []).filter((k) => !drop.has(k))
  all[uid] = bag
  writeAll(all)
}
