// Прогресс «N изучено» по уровню/сфере: слова, на которые ученик ответил верно
// хотя бы раз в проверке каталога (или отметил вручную).
//
// С 06.10.2026 — модуль 'vocabLearned' общего хранилища прогресса (память +
// черновик + сервер, см. practice/progressStore.js). Раньше жил только в
// localStorage и на сервер не уходил: при забитом кэшем каталогов хранилище
// счётчик не рос, а на другом устройстве его не было вовсе.
// Параметр token у функций остался — по нему находится старая запись.

import { loadToken } from '../../lib/session.js'
import { VOCAB_LEARNED_KEY as KEY, VOCAB_LEARNED_EVENT as EVENT } from '../../practice/practiceKeys.js'
import { createProgressStore, hasServerSnapshot } from '../../practice/progressStore.js'
import { peekLegacy, dropLegacy } from './legacyVocabBlob.js'

const LEGACY = 'jts.vocab.learned.v1'

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const keyOf = (k) => String(k).toLowerCase()

function normalize(raw) {
  const scopes = {}
  const src = isObj(raw) && isObj(raw.scopes) ? raw.scopes : {}
  for (const [id, list] of Object.entries(src)) {
    if (Array.isArray(list)) scopes[id] = [...new Set(list.filter((k) => typeof k === 'string' && k))]
  }
  return { scopes }
}

const store = createProgressStore({
  module: 'vocabLearned',
  key: KEY,
  event: EVENT,
  empty: () => ({ scopes: {} }),
  normalize,
})

// Старая запись { <scopeId>: [ключи] } поверх состояния — объединением.
function withLegacy(state, bag) {
  const scopes = { ...state.scopes }
  for (const [id, list] of Object.entries(bag)) {
    if (!Array.isArray(list)) continue
    scopes[id] = [...new Set([...(scopes[id] || []), ...list.filter((k) => k != null && k !== '').map(keyOf)])]
  }
  return { scopes }
}

/**
 * Состояние с учётом старой записи. Перенос — один раз и объединением с тем,
 * что уже на сервере: поэтому вошедшему он делается только после ответа
 * сервера (replace затёр бы серверное). До этого показываем объединение, не
 * записывая.
 */
function current(token) {
  const bag = peekLegacy(LEGACY, token)
  if (!bag) return store.read()
  if (!loadToken() || hasServerSnapshot()) {
    dropLegacy(LEGACY, token)
    store.write(withLegacy(store.read(), bag))
    return store.read()
  }
  return withLegacy(store.read(), bag)
}

/** keys — уникальные ключи слов (обычно lowercase en / id). */
export function recordVocabLearned(token, scopeId, keys) {
  if (!scopeId || !Array.isArray(keys) || !keys.length) return
  const state = current(token)
  const before = state.scopes[scopeId] || []
  const set = new Set(before)
  for (const k of keys) {
    if (k == null || k === '') continue
    set.add(keyOf(k))
  }
  if (set.size === before.length) return // ничего нового — не пишем и не синкаем
  store.write({ ...state, scopes: { ...state.scopes, [scopeId]: [...set] } })
}

export function learnedCount(token, scopeId) {
  if (!scopeId) return 0
  const list = current(token).scopes[scopeId]
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
  const list = current(token).scopes[scopeId]
  return new Set(Array.isArray(list) ? list : [])
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
  const state = current(token)
  const drop = new Set(keys.filter(Boolean).map(keyOf))
  const before = state.scopes[scopeId] || []
  const after = before.filter((k) => !drop.has(k))
  if (after.length === before.length) return
  store.write({ ...state, scopes: { ...state.scopes, [scopeId]: after } })
}
