// Предложение вокруг слова, на которое нажал ученик: пример для «Моего словаря» (отзыв АруЖан, 03.11.2026).
// Берём текст ближайшего блока (абзац, строка диалога, пункт), режем на предложения и отдаём первое, где есть
// слово. Длиннее 200 знаков или без слова — null: пример должен быть простым, а обрывок абзаца ученику ничего
// не скажет.
const BLOCK = 'p, li, td, blockquote, .cp-note__body, .cp-step__prompt, h1, h2, h3, div'
const MAX = 200

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function sentenceAround(anchorEl, word) {
  const block = anchorEl?.closest?.(BLOCK)
  const text = String(block?.textContent || '').replace(/\s+/g, ' ').trim()
  if (!text || !word) return null
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]
  const needle = new RegExp(`(^|[^A-Za-z'])${escapeRe(String(word))}($|[^A-Za-z'])`, 'i')
  const hit = sentences.map((s) => s.trim()).find((s) => needle.test(s))
  return hit && hit.length <= MAX ? hit : null
}
