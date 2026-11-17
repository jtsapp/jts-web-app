'use client'

// То, что у Literature World живёт только на этом устройстве (localStorage):
// - язык интерфейса раздела и подсказок { lang: en | kz | ru, sup: ru | kz }
//   (LANG и SUP прототипа); по умолчанию — от языка приложения: kk → kz, ru →
//   ru, en → en, подсказки — казахские при казахском, иначе русские;
// - свои предложения к словам «Produce» { <слово>: текст } (jtsLit.prod.* прототипа):
//   текст ученика на сервер не идёт.
// Оба ключа чистятся при выходе вместе с прогрессом (clearLocalPractice).
//
// Забитый localStorage (кэш каталогов под входом) запись молча роняет — поэтому
// экран держит последнее записанное ещё и в памяти монтажа.

import { LITERATURE_DRAFTS_KEY, LITERATURE_LANG_KEY } from '../practiceKeys.js'

const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/
const MAX_DRAFT = 5000
const MAX_DRAFTS = 400
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)

/** Язык раздела по языку приложения (kk | ru | en). */
export function defaultLang(appLang) {
  const lang = appLang === 'kk' ? 'kz' : appLang === 'ru' ? 'ru' : 'en'
  return { lang, sup: lang === 'kz' ? 'kz' : 'ru' }
}

export function normalizeLang(raw, appLang) {
  const d = defaultLang(appLang)
  if (!isObj(raw)) return d
  const lang = ['en', 'kz', 'ru'].includes(raw.lang) ? raw.lang : d.lang
  const sup = raw.sup === 'kz' || raw.sup === 'ru' ? raw.sup : lang === 'kz' ? 'kz' : 'ru'
  return { lang, sup }
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

/** Язык раздела: выбранный на устройстве или от языка приложения. */
export const readLang = (appLang) => normalizeLang(readJson(LITERATURE_LANG_KEY), appLang)
export function writeLang(lang, appLang) {
  const l = normalizeLang(lang, appLang)
  writeJson(LITERATURE_LANG_KEY, l, false)
  return l
}

export const readDrafts = () => normalizeDrafts(readJson(LITERATURE_DRAFTS_KEY))
export function writeDrafts(drafts) {
  const d = normalizeDrafts(drafts)
  writeJson(LITERATURE_DRAFTS_KEY, d, !Object.keys(d).length)
  return d
}
