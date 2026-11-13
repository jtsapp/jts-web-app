// Подсветка найденного в копии отклонённого текста (спека 2026-11-11 §3.3, §7). Сервер отдаёт hits так, как их
// написал ученик («х@й», а не нормализованное «хай»), поэтому ищем их в исходном тексте буквально; регистр — любой.
// Отдаём куски, а не HTML: их рисует React, и текст ученика никогда не попадает в разметку — экранирование делает
// сам React, dangerouslySetInnerHTML здесь не нужен вовсе.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Текст → [{ text, mark }]: mark — найденный фрагмент. Длинные находки раньше коротких: «блядь» целиком, а не «бля». */
export function highlightParts(text, hits) {
  const source = typeof text === 'string' ? text : ''
  if (!source) return []
  const words = [...new Set((Array.isArray(hits) ? hits : []).filter((h) => typeof h === 'string' && h.trim()))].sort(
    (a, b) => b.length - a.length,
  )
  if (!words.length) return [{ text: source, mark: false }]
  const re = new RegExp(words.map(escapeRe).join('|'), 'giu')
  const parts = []
  let last = 0
  for (const m of source.matchAll(re)) {
    if (m.index > last) parts.push({ text: source.slice(last, m.index), mark: false })
    parts.push({ text: m[0], mark: true })
    last = m.index + m[0].length
  }
  if (last < source.length) parts.push({ text: source.slice(last), mark: false })
  return parts
}
