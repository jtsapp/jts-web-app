// Память ошибок «Словаря»: топ «хуже запомненных» на главной.
//
// С 06.10.2026 — модуль 'vocabMisses' общего хранилища прогресса (память +
// черновик + сервер, см. practice/progressStore.js). Раньше жил только в
// localStorage и на сервер не уходил. Параметр token у функций остался — по
// нему находится старая запись.

import { loadToken } from '../../lib/session.js'
import { VOCAB_MISSES_KEY as KEY, VOCAB_MISSES_EVENT as EVENT } from '../../practice/practiceKeys.js'
import { createProgressStore, hasServerSnapshot } from '../../practice/progressStore.js'
import { peekLegacy, dropLegacy } from './legacyVocabBlob.js'

const LEGACY = 'jts.vocab.misses.v1'

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

function normalize(raw) {
  const words = {}
  const src = isObj(raw) && isObj(raw.words) ? raw.words : {}
  for (const [key, entry] of Object.entries(src)) if (isObj(entry)) words[key] = entry
  return { words }
}

const store = createProgressStore({
  module: 'vocabMisses',
  key: KEY,
  event: EVENT,
  empty: () => ({ words: {} }),
  normalize,
})

// Старая запись { <ключ>: {...} } поверх состояния: по слову побеждает запись
// с большим числом промахов (при равенстве — более поздняя).
function withLegacy(state, bag) {
  const words = { ...state.words }
  for (const [key, entry] of Object.entries(bag)) {
    if (!isObj(entry)) continue
    const prev = words[key]
    const more = !prev || (entry.misses || 0) > (prev.misses || 0)
    const later = prev && (entry.misses || 0) === (prev.misses || 0) && (entry.at || 0) > (prev.at || 0)
    if (more || later) words[key] = entry
  }
  return { words }
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

export function recordVocabMisses(token, words) {
  if (!Array.isArray(words) || !words.length) return
  const state = current(token)
  const bag = { ...state.words }
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
  store.write({ ...state, words: bag })
}

/** Худшие слова вместе с ключом записи: практика «повторить» спрашивает под
 *  этим же ключом, иначе верный ответ не нашёл бы, что снять. */
export function topVocabMisses(token, limit = 3) {
  return Object.entries(current(token).words)
    .map(([key, entry]) => ({ ...entry, key }))
    .sort((a, b) => (b.misses - a.misses) || (b.at - a.at))
    .slice(0, limit)
}

export function clearVocabMiss(token, key) {
  const state = current(token)
  const k = String(key).toLowerCase()
  if (!state.words[k]) return
  const words = { ...state.words }
  delete words[k]
  store.write({ ...state, words })
}
