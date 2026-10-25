// Ответы бэкенда Скорочтения → то, что рисует движок, и тело попытки → то, что бэкенд принимает.
//
// Ручки бэкенда писались параллельно с сайтом (контракт — backend docs/practice/SPEED_READING.md), поэтому
// чтение терпимо к именам полей: тело текста может прийти как body / text / x (форма прототипа), заголовок —
// объектом или строкой JSON, попытка — camelCase или snake_case. Разойдётся контракт — правится эта функция,
// а не движок. Отправка, наоборот, строгая: ровно девять полей (бэкенд отвечает 400 на лишние).

import { SPEEDS, srWords } from './rules.js'

const LANGS = ['ru', 'kk', 'en']
const SCORED_BY = new Set(['server', 'browser', 'none'])

function parseMaybe(v) {
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

function titleOf(raw, fallback) {
  const t = parseMaybe(raw)
  if (t && typeof t === 'object') {
    const first = LANGS.map((l) => t[l]).find((s) => typeof s === 'string' && s.trim()) || fallback
    return Object.fromEntries(LANGS.map((l) => [l, typeof t[l] === 'string' && t[l].trim() ? t[l] : first]))
  }
  const s = typeof t === 'string' && t.trim() ? t : fallback
  return { ru: s, kk: s, en: s }
}

const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

/** Образец: адрес и разметка [слово, начало, конец] обязательны, без них образца нет. */
export function normalizeSample(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.url !== 'string' || !raw.url) return null
  const words = parseMaybe(raw.words)
  if (!Array.isArray(words) || !words.length) return null
  const list = words.filter((w) => Array.isArray(w) && w.length >= 3).map((w) => [String(w[0]), Number(w[1]) || 0, Number(w[2]) || 0])
  if (!list.length) return null
  const wpm = num(raw.wpm)
  return { url: raw.url, words: list, wpm: wpm > 0 ? wpm : null }
}

/** Текст из списка ученика; без id или текста — null (такую запись экран не показывает). */
export function normalizeText(raw) {
  if (!raw || typeof raw !== 'object' || raw.id == null || raw.id === '') return null
  const body = [raw.body, raw.text, raw.x].find((v) => typeof v === 'string' && v.trim())
  if (!body) return null
  const id = String(raw.id)
  return {
    id,
    level: String(raw.level ?? raw.lv ?? ''),
    icon: String(raw.icon ?? raw.ic ?? ''),
    title: titleOf(raw.title ?? raw.t, id),
    body,
    // Число слов — своим разбиением: тем же, что режет телесуфлёр и выравнивает прочитанное.
    words: srWords(body).length,
    sample: normalizeSample(raw.sample),
  }
}

/** Попытка из ответа бэкенда (POST attempts → attempt, GET attempts → список). */
export function normalizeAttempt(raw) {
  const r = raw || {}
  const pick = (a, b) => (r[a] !== undefined ? r[a] : r[b])
  return {
    id: r.id ?? null,
    textId: String(pick('textId', 'text_id') ?? ''),
    // Название приходит с попыткой: по нему строка «Мои попытки» подписана и тогда, когда текст уже скрыли.
    title: r.title && typeof r.title === 'object' ? titleOf(r.title, '') : null,
    speed: num(r.speed),
    durationSec: num(pick('durationSec', 'duration_sec')),
    wordsTotal: num(pick('wordsTotal', 'words_total')),
    wordsRead: num(pick('wordsRead', 'words_read')),
    percent: num(r.percent),
    stars: num(r.stars) ?? 0,
    wpm: num(r.wpm),
    scoredBy: String(pick('scoredBy', 'scored_by') ?? ''),
    coins: num(r.coins) ?? 0,
    createdAt: pick('createdAt', 'created_at') ?? null,
  }
}

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)))

/**
 * Тело POST /mobile/speed-reading/attempts — ровно поля из проверки бэкенда (docs/practice/SPEED_READING.md):
 * скорость из семи, длительность не больше 200 с, прочитано не больше слов, звёзды 0–3, темп не больше 1000.
 * Записи здесь нет и быть не может (Д6).
 */
export function attemptBody(a) {
  const wordsTotal = clampInt(a.wordsTotal, 0, 100000)
  const speed = SPEEDS.reduce((best, s) => (Math.abs(s - a.speed) < Math.abs(best - a.speed) ? s : best), 1)
  return {
    textId: String(a.textId),
    speed,
    durationSec: clampInt(a.durationSec, 0, 200),
    wordsTotal,
    wordsRead: clampInt(a.wordsRead, 0, wordsTotal),
    percent: a.percent == null ? null : clampInt(a.percent, 0, 100),
    stars: clampInt(a.stars, 0, 3),
    wpm: a.wpm == null ? null : clampInt(a.wpm, 0, 1000),
    scoredBy: SCORED_BY.has(a.scoredBy) ? a.scoredBy : 'none',
  }
}
