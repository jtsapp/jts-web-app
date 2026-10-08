// Тап-перевод слова — общая логика для читалки книг (BookDetail.jsx) и живого
// урока (workspace/useTapTranslate.js). Кэш в localStorage (ключи «tl:слово»),
// чтобы повторные тапы не ходили в сеть; v2 — смена формата ключей после
// добавления казахского.
//
// ПЕРЕВОД ИДЁТ ЧЕРЕЗ НАШ СЕРВЕР (`GET /translate`), а не напрямую в gtx.
// Раньше браузер дёргал `translate.googleapis.com` сам: ключа у той ручки нет,
// и Google режет её по IP — у одного перевод работал, у другого в тот же момент
// нет, а через минуту наоборот. Это и была жалоба «перевод то работает, то не
// работает и у учителя, и у студента». На сервере стоит общий кэш: слово,
// переведённое хоть кем-то, дальше отдаётся из памяти.

import { loadToken } from './session.js'
import { getPracticeToken } from '../api.js'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'

// Разбивает текст на слова, чтобы навесить тап-перевод. Знаки препинания
// остаются частью «токена», но для поиска перевода чистим их.
//
// Ревью 08.10.2026: типографский апостроф вырезался вместе с пунктуацией, и
// «I’ll» уходило в переводчик как «Ill» («больной»); тире вырезалось и
// склеивало соседние слова («sea—the» → «seathe»); буквы с диакритикой
// пропадали («café» → «caf»). Буква теперь — любая (\p{L}), а не только
// латиница и кириллица.
export function cleanWord(w) {
  return String(w || '')
    // Диакритика бывает отдельным знаком (буква плюс знак ударения после неё):
    // без склейки знак ушёл бы вместе с пунктуацией, и «café» стало бы «cafe».
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC\u00B4`]/g, "'")
    .replace(/[\u2010\u2011]/g, '-')
    .replace(/[\u2012-\u2015\u2212]/g, ' ')
    .replace(/[^\p{L}'\-\s]/gu, '')
    .replace(/\s+/g, ' ')
    // Апостроф на краю слова — кавычка вокруг него (‘Hello’) или «dogs'».
    .replace(/(^|\s)'+/g, '$1')
    .replace(/'+(?=\s|$)/g, '')
    .trim()
}

/**
 * Метка конца предложения и разбивка БЕЗ lookbehind.
 *
 * `(?<=…)` Safari до 16.4 не понимает, и это ошибка РАЗБОРА, а не выполнения:
 * браузер спотыкается на самой записи регулярки, файл не запускается, а с ним
 * не запускается весь чанк. Ни try/catch, ни сборщик не помогают — до кода дело
 * не доходит. На iPhone это и выглядит как белый экран или «зависло».
 *
 * Lookahead (`(?=…)`) Safari понимает давно, поэтому границу ставим заменой с
 * меткой, а делим уже по ней. Символ выбран такой, которого в текстах не бывает.
 */
const SENTENCE_BREAK = '\u0000'

/** Предложения в блоке: граница — `.!?` и заглавная буква следующего. */
export function splitSentences(text) {
  const compact = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!compact) return []
  return compact
    .replace(/([.!?])\s+(?=[A-ZА-ЯЁ"“«])/g, `$1${SENTENCE_BREAK}`)
    .split(SENTENCE_BREAK)
    .filter(Boolean)
}

/** Предложение, в котором стоит `hint` (тапнутое слово). Один абзац без
 *  точек отдаём целиком — в уроке это часто одна фраза без финальной точки. */
export function sentenceContaining(blockText, hint) {
  const compact = String(blockText || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!compact) return ''
  const sentences = splitSentences(compact)
  if (sentences.length <= 1) return compact
  const needle = String(hint || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!needle) return compact
  return sentences.find((s) => s.includes(needle)) || compact
}

const TAP_BLOCK =
  'p, li, h1, h2, h3, h4, td, th, blockquote, figcaption, .instruction, .subline, .byline, .explain, .bubble, .msg, .card, .cp-step__prompt, .cp-step__title, .cp-note__h, .cp-note__body, .cp-egs__card, .lw-q__prompt, .lw-q__sentence, .lw-practice__instruction, .lw-practice__hint, .lw-practice__title, .lw-info__title, .lw-speaking__task, .kl-task__title, .kl-task__sub, .kl-sentence, .kl-info, .kl-note'

/** Текст, который уходит в переводчик с тапа по `.lw-tap-w`: одно слово.
 *  Фразу берём только из выделения мышью (mouseup + isPhraseSelection). */
export function wordFromTap(el) {
  return cleanWord(el?.textContent)
}

/** Предложение вокруг тапнутого слова — для тестов и редких вызовов, где
 *  нужен контекст, а не словарная карточка. */
export function sentenceFromTap(el) {
  if (!el) return ''
  const host = el.closest?.(TAP_BLOCK) || el.parentElement || el
  const block = String(host.innerText || host.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
  const hint = String(el.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
  return sentenceContaining(block, hint)
}

// Выделение для перевода — одно-два предложения, не абзац. Раньше стоял
// потолок в 8 слов / 60 знаков, и нормальное предложение урока («You want
// the name of the person who wrote the report.») в перевод не попадало.
export function isPhraseSelection(raw) {
  const t = String(raw || '').trim()
  if (!t || t.includes('\n')) return false
  const compact = t.replace(/\s+/g, ' ')
  if (!compact.includes(' ')) return false
  const words = compact.split(' ').filter(Boolean)
  if (words.length < 2 || words.length > 50 || compact.length > PHRASE_MAX_CHARS) return false
  return splitSentences(compact).length <= 2
}

/** Как в Edvibe: перевод фразы — до 100 символов. */
export const PHRASE_MAX_CHARS = 100

export function isOversizedPhrase(raw) {
  const t = String(raw || '').trim()
  if (!t || t.includes('\n')) return false
  const compact = t.replace(/\s+/g, ' ')
  return compact.includes(' ') && compact.length > PHRASE_MAX_CHARS
}

/** Слово или предложение, с которым открываем тултип. Иначе выделение
 *  мусорное (абзац) — старый перевод надо закрыть, а не оставлять висеть. */
export function isTapSelection(raw) {
  const word = cleanWord(raw)
  if (!word) return false
  if (!word.includes(' ')) return true
  return isPhraseSelection(raw)
}

// v3: ключ кэша — слово как есть, с регистром. В v2 он был в нижнем регистре,
// и «May» (май) отдавало перевод «may» (может), «Turkey» — «turkey»
// (ревью 08.10.2026). Записи v2 смешаны — выбрасываем их, а не доверяем.
const TR_CACHE_KEY = 'jts_word_tr_v3'
const TR_CACHE_OLD = 'jts_word_tr_v2'
let _trCache = null
function trCache() {
  if (_trCache) return _trCache
  try {
    window.localStorage.removeItem(TR_CACHE_OLD)
    _trCache = JSON.parse(window.localStorage.getItem(TR_CACHE_KEY)) || {}
  } catch {
    _trCache = {}
  }
  return _trCache
}

// Отказ в демо-токене (стенд без демо-доступа, бэкенд не пустил) запоминаем на
// минуту: getPracticeToken отказ не кэширует, и каждый тап гостя по
// непереведённому слову слал бы вход демо-аккаунта на бэкенд.
const DEMO_RETRY_MS = 60_000
let demoRetryAt = 0
async function guestToken() {
  if (Date.now() < demoRetryAt) return null
  const tok = await getPracticeToken(null).catch(() => null)
  if (!tok) demoRetryAt = Date.now() + DEMO_RETRY_MS
  return tok
}

export async function translateWord(word, tl = 'ru') {
  const key = `${tl}:${word}`
  const cache = trCache()
  if (cache[key]) return cache[key]

  // У гостя своего токена нет, а без токена /translate отвечает 401 — гость
  // не видел перевода нигде. В Практике он и так ходит с демо-токеном
  // (getPracticeToken, тот же у Книг и Комиксов), а перевод ничего не пишет,
  // так что общий демо-аккаунт здесь безопасен (ревью 08.10.2026).
  const token = loadToken() || (await guestToken())
  const url = `${API_BASE}/translate?tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(word)}`
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const data = await res.json()

  const primary = String(data?.tr || '').trim()
  const alternates = Array.isArray(data?.alternates) ? data.alternates.slice(0, 4) : []
  const out = { tr: primary, alternates }
  if (primary) {
    cache[key] = out
    try {
      window.localStorage.setItem(TR_CACHE_KEY, JSON.stringify(cache))
    } catch {
      /* квота localStorage — работаем без кэша */
    }
  }
  return out
}
