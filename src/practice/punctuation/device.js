'use client'

// То, что у Punctuation World живёт только на этом устройстве (localStorage):
// - вид { tr, mute, luna } — перевод под английским текстом (ru / kk / нет),
//   звук и флаг Луны прототипа (сейчас не используется, но движок его хранит);
// - недоигранное приключение { <страница>: { s, res, marks } } — с какой стадии
//   продолжить, ответы прошлых стадий и поставленные знаки. На сервер не идёт:
//   сведение двух устройств воскрешало бы приключение, уже пройденное на другом
//   (как недорешённые сетки Word Hunt).
// Оба ключа чистятся при выходе вместе с прогрессом (clearLocalPractice).
//
// Забитый localStorage (кэш каталогов под входом) запись молча роняет — поэтому
// экран держит последнее записанное ещё и в памяти монтажа.

import { PUNCTUATION_PREFS_KEY, PUNCTUATION_RUN_KEY } from '../practiceKeys.js'

const PAGE = /^\d{1,3}$/
const STAGES = 7
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const int = (x, max) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(max, Math.floor(x)) : null)

export function normalizePrefs(raw) {
  const r = isObj(raw) ? raw : {}
  return { tr: r.tr === 'ru' || r.tr === 'kk' ? r.tr : '', mute: r.mute === true, luna: r.luna === true }
}

// Приключение — в форме прототипа: s — стадия 0–6, res — 1/0 «с первой попытки» по заданиям пройденных стадий,
// marks — сколько раз верно поставлен знак каждой семьи («Full stop» → 3).
export function normalizeRuns(raw) {
  const out = {}
  if (!isObj(raw)) return out
  for (const [id, run] of Object.entries(raw)) {
    if (!PAGE.test(id) || !isObj(run)) continue
    const s = int(run.s, STAGES - 1)
    if (s == null || !Array.isArray(run.res)) continue
    const marks = {}
    if (isObj(run.marks)) {
      for (const [k, v] of Object.entries(run.marks)) {
        const n = int(v, 1e4)
        if (n && k.length <= 40) marks[k] = n
      }
    }
    out[id] = { s, res: run.res.slice(0, 500).map((x) => (x ? 1 : 0)), marks }
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

export const readPrefs = () => normalizePrefs(readJson(PUNCTUATION_PREFS_KEY))
export function writePrefs(prefs) {
  const p = normalizePrefs(prefs)
  writeJson(PUNCTUATION_PREFS_KEY, p, !p.tr && !p.mute && !p.luna)
  return p
}

export const readRuns = () => normalizeRuns(readJson(PUNCTUATION_RUN_KEY))
export function writeRuns(runs) {
  const r = normalizeRuns(runs)
  writeJson(PUNCTUATION_RUN_KEY, r, !Object.keys(r).length)
  return r
}
