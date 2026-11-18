// Разметка фразы Видеодиктанта — одна грамматика у бэкенда (VideoDictationRules), админки и сайта
// (спека docs/superpowers/specs/2026-11-18-video-dictation-design.md, «Разметка фразы»):
//  - текст 1–120 знаков — после схлопывания пробелов в один и обрезки краёв; без «|» и без цифр ASCII 0–9 (ячейки
//    цифр не показывают — числа словами);
//  - [...] — пропуск: скобки парные, не вложенные; внутри после обрезки непусто, только латинские буквы ASCII,
//    апостроф ASCII ('), дефис и пробел, хотя бы одна буква (`[ love ]` — можно); вне скобок «[» и «]» не встречаются,
//    а типографский апостроф (’) вне пропуска — можно, в пропуске — ошибка;
//  - скобок нет — пропуск вся фраза: каждое слово — группа ячеек, знаки препинания видны только после ответа;
//    хотя бы одна латинская буква обязательна.
// Уточнения — из плана бэкенда (18.11.2026, спека «Разметка фразы»): сайт обязан принять всё, что принял сервер.
//
// Цель пропуска — буквы (letters Just to Listen): регистр, пробелы, апострофы и знаки не набираются, ячейки задают
// длину. Сайт читает уже проверенное сервером, поэтому фразу, не прошедшую правила, урок пропускает (phrasesOf).

import { letters } from '../listen/compare.js'

export const MAX_PHRASE_CHARS = 120

const GAP_CHARS = /^[A-Za-z' -]+$/
const LATIN = /[A-Za-z]/

const fail = (error) => ({ ok: false, error })

/**
 * Текст фразы → { ok: true, whole, tokens, target, plain } | { ok: false, error }.
 * tokens — по порядку: { kind: 'text', text, glue } — видимое слово, { kind: 'cells', start, size, glue } — группа
 * ячеек слова пропуска (start — индекс первой буквы в target). glue — слово стоит вплотную к предыдущему без пробела
 * (`un[believ]able`, `[puddles].`), у первого false; во фразе без скобок слово без латинских букв выпадает, а glue
 * следующего считается по пробелу в тексте, не по соседнему токену. target — буквы всех пропусков подряд, plain — фраза без скобок
 * с одним пробелом между словами.
 * error: empty | tooLong | pipe | digits | nested | unbalanced | emptyGap | gapChars | gapNoLetters | noLetters.
 */
export function parsePhrase(raw) {
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (!text) return fail('empty')
  if (text.length > MAX_PHRASE_CHARS) return fail('tooLong')
  if (text.includes('|')) return fail('pipe')
  if (/[0-9]/.test(text)) return fail('digits')

  // Части по скобкам: { gap, text }.
  const parts = []
  let open = false
  let from = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '[') {
      if (open) return fail('nested')
      parts.push({ gap: false, text: text.slice(from, i) })
      open = true
      from = i + 1
    } else if (c === ']') {
      if (!open) return fail('unbalanced')
      parts.push({ gap: true, text: text.slice(from, i) })
      open = false
      from = i + 1
    }
  }
  if (open) return fail('unbalanced')
  parts.push({ gap: false, text: text.slice(from) })

  const gaps = parts.filter((p) => p.gap)
  for (const g of gaps) {
    const inner = g.text.trim()
    if (!inner) return fail('emptyGap')
    if (!GAP_CHARS.test(inner)) return fail('gapChars')
    if (!LATIN.test(inner)) return fail('gapNoLetters')
  }
  const whole = gaps.length === 0
  if (whole && !LATIN.test(text)) return fail('noLetters')

  // glue смотрит на текст без скобок: слово приклеено, если прямо перед ним не пробел (и оно не первое).
  const bare = parts.map((p) => p.text).join('')
  const tokens = []
  let target = ''
  let offset = 0
  for (const p of parts) {
    for (const m of p.text.matchAll(/\S+/g)) {
      const word = m[0]
      const at = offset + m.index
      const glue = at > 0 && bare[at - 1] !== ' '
      if (!p.gap && !whole) {
        tokens.push({ kind: 'text', text: word, glue })
        continue
      }
      // Слово без латинских букв («—», «…») во фразе без скобок ячеек не получает — его покажет фраза после ответа.
      const w = letters(word)
      if (!w) continue
      tokens.push({ kind: 'cells', start: target.length, size: w.length, glue })
      target += w
    }
    offset += p.text.length
  }
  const plain = text.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()
  return { ok: true, whole, tokens, target, plain }
}

/**
 * Фразы урока из segments бэкенда [[start, end, text], …] → [{ n, start, end, …parsePhrase }]. Фраза с неверными
 * временами или разметкой пропускается; n — номер среди оставшихся (по нему «Пройти ошибки заново» берёт фразы).
 */
export function phrasesOf(segments) {
  if (!Array.isArray(segments)) return []
  const out = []
  for (const seg of segments) {
    if (!Array.isArray(seg)) continue
    const [start, end, text] = seg
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) continue
    const parsed = parsePhrase(text)
    if (parsed.ok) out.push({ n: out.length, start, end, ...parsed })
  }
  return out
}
