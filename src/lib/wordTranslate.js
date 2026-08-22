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

// Выделенная фраза для перевода — короткое словосочетание, не абзац.
// Длинное выделение почти всегда артефакт пересборки DOM (поллинг чата /
// Angular CD), и слать его в переводчик бессмысленно.
export function isPhraseSelection(raw) {
  const t = String(raw || '').trim()
  if (!t || t.includes('\n')) return false
  const compact = t.replace(/\s+/g, ' ')
  if (!compact.includes(' ')) return false
  const words = compact.split(' ').filter(Boolean)
  return words.length >= 2 && words.length <= 8 && compact.length <= 60
}

/** Слово или короткая фраза, с которой открываем тултип. Иначе выделение
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
  const primary = String(data?.[0]?.[0]?.[0] || '').trim()
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
