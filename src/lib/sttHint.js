// Подсказка распознаванию: какие слова ожидаются (обратная связь 11.11 — «в караоке не записывает слова»).
// Пение — не речь: без подсказки распознавание теряет спетые слова, хотя ученик их пел. Текст песни известен заранее,
// поэтому караоке отдаёт его вместе с записью: Azure получает строки фразами (phrase list), Soniox — контекстом.
// Подсказка только поднимает вероятность этих слов — из тишины она слов не делает.

// Лимит Soniox — 8000 токенов на весь context; песне хватает с запасом.
export const HINT_MAX_CHARS = 3000
const MAX_PHRASES = 200
const MAX_PHRASE_CHARS = 80

/** Сырой текст из формы → { text, phrases } или null. Строки — фразами, без повторов (припев). */
export function sttHint(raw) {
  const text = String(raw ?? '').replace(/\r/g, '').slice(0, HINT_MAX_CHARS).trim()
  if (!text) return null
  const phrases = []
  for (const line of text.split('\n')) {
    const phrase = line.replace(/[^\p{L}\p{N}'’\s-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_PHRASE_CHARS).trim()
    if (phrase && !phrases.includes(phrase)) phrases.push(phrase)
    if (phrases.length >= MAX_PHRASES) break
  }
  return phrases.length ? { text, phrases } : null
}

/** Контекст Soniox для пения под фонограмму. */
export function singingContext(hint) {
  return {
    general: [{ key: 'domain', value: 'A student sings an English song along with a karaoke track' }],
    text: hint.text,
  }
}
