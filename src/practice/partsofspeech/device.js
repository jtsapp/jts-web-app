'use client'

// То, что у Parts of Speech World живёт только на этом устройстве (localStorage):
// - язык перевода под английским текстом (en | kk | ru) — pos:tl прототипа;
// - вид { sound, labels } — звук игры (pos:g:sound) и подписи частей речи над
//   цветными словами урока (pos:labels);
// - черновики заданий «Write your own» { <упражнение>: текст } (pos:draft:*):
//   текст ученика на сервер не идёт — задание проверяет он сам по чек-листу.
// Все три ключа чистятся при выходе вместе с прогрессом (clearLocalPractice).
//
// Забитый localStorage (кэш каталогов под входом) запись молча роняет — поэтому
// экран держит последнее записанное ещё и в памяти монтажа.

import { PARTSOFSPEECH_DRAFTS_KEY, PARTSOFSPEECH_LANG_KEY, PARTSOFSPEECH_PREFS_KEY } from '../practiceKeys.js'

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/
const MAX_DRAFT = 20000
const MAX_DRAFTS = 100
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)

export const normalizeLang = (l) => (l === 'kk' || l === 'ru' ? l : 'en')

export function normalizePrefs(raw) {
  const r = isObj(raw) ? raw : {}
  return { sound: r.sound !== false, labels: r.labels === true }
}

export function normalizeDrafts(raw) {
  const out = {}
  if (!isObj(raw)) return out
  for (const [id, text] of Object.entries(raw).slice(0, MAX_DRAFTS)) {
    if (ID.test(id) && typeof text === 'string' && text) out[id] = text.slice(0, MAX_DRAFT)
  }
  return out
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function writeJson(key, value, empty) {
  try {
    if (empty) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* квота или приватный режим: экран держит копию в памяти */
  }
}

export function readLang() {
  try {
    return normalizeLang(localStorage.getItem(PARTSOFSPEECH_LANG_KEY))
  } catch {
    return 'en'
  }
}
export function writeLang(lang) {
  const l = normalizeLang(lang)
  try {
    if (l === 'en') localStorage.removeItem(PARTSOFSPEECH_LANG_KEY)
    else localStorage.setItem(PARTSOFSPEECH_LANG_KEY, l)
  } catch {
    /* приватный режим / квота — язык только на этот заход */
  }
  return l
}

export const readPrefs = () => normalizePrefs(readJson(PARTSOFSPEECH_PREFS_KEY))
export function writePrefs(prefs) {
  const p = normalizePrefs(prefs)
  writeJson(PARTSOFSPEECH_PREFS_KEY, p, p.sound && !p.labels)
  return p
}

export const readDrafts = () => normalizeDrafts(readJson(PARTSOFSPEECH_DRAFTS_KEY))
export function writeDrafts(drafts) {
  const d = normalizeDrafts(drafts)
  writeJson(PARTSOFSPEECH_DRAFTS_KEY, d, !Object.keys(d).length)
  return d
}
