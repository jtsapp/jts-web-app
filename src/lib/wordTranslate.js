// Тап-перевод слова — общая логика для читалки книг (BookDetail.jsx) и живого
// урока (workspace/useTapTranslate.js). Как в мобильной читалке: сначала
// словарь книги (если он есть у вызывающей стороны), иначе gtx (dt=t —
// основной перевод, dt=bd — словарные альтернативы). Кэш в localStorage
// (ключи «tl:слово»), чтобы повторные тапы не ходили в сеть; v2 — смена
// формата ключей после добавления казахского.

// Разбивает текст на слова, чтобы навесить тап-перевод. Знаки препинания
// остаются частью «токена», но для поиска перевода чистим их.
export function cleanWord(w) {
  return String(w || '')
    .replace(/[^A-Za-zА-Яа-яЁё'\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Предложения в блоке: граница — `.!?` и заглавная буква следующего. */
export function splitSentences(text) {
  const compact = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!compact) return []
  return compact.split(/(?<=[.!?])\s+(?=[A-ZА-ЯЁ"“«])/).filter(Boolean)
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

const TR_CACHE_KEY = 'jts_word_tr_v2'
let _trCache = null
function trCache() {
  if (_trCache) return _trCache
  try {
    _trCache = JSON.parse(window.localStorage.getItem(TR_CACHE_KEY)) || {}
  } catch {
    _trCache = {}
  }
  return _trCache
}

export async function translateWord(word, tl = 'ru') {
  const key = `${tl}:${word.toLowerCase()}`
  const cache = trCache()
  if (cache[key]) return cache[key]
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&dt=bd&q=` +
    encodeURIComponent(word)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const data = await res.json()
  // Для текста из двух предложений gtx отдаёт НЕСКОЛЬКО сегментов в data[0];
  // раньше брался только первый ([0][0][0]) и хвост выделения терялся —
  // склеиваем все (у одного слова сегмент один, поведение то же).
  const primary = (Array.isArray(data?.[0]) ? data[0] : [])
    .map((seg) => String(seg?.[0] || ''))
    .join('')
    .trim()
  const alternates = []
  if (Array.isArray(data?.[1])) {
    for (const pos of data[1]) {
      for (const m of pos?.[1] || []) {
        const s = String(m).trim()
        if (s && s.toLowerCase() !== primary.toLowerCase() && !alternates.includes(s)) {
          alternates.push(s)
        }
      }
    }
  }
  const out = { tr: primary, alternates: alternates.slice(0, 4) }
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
