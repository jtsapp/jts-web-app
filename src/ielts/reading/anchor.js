import { findQuote } from './highlights.js'

// Где в тексте ответ: textAnchor ({ paragraph: 'A', text?: 'B' }) → ключ абзаца «<текст>:<абзац>», а цитата →
// смещения для подсветки. Текст берётся из якоря, иначе из группы вопроса (в полном тесте group.text — номер
// текста, а якорь знает только абзац). Без якоря ищем цитату по всем абзацам — у дриллов якоря часто нет.
export function textIndex(doc, label) {
  if (!label) return 0
  const i = (doc?.texts || []).findIndex((x) => String(x.label) === String(label))
  return i >= 0 ? i : 0
}

export function locateAnswer(doc, reveal, groupText) {
  const texts = doc?.texts || []
  const anchor = reveal?.textAnchor
  const quote = reveal?.quote
  const tryPara = (ti, pi) => {
    const p = texts[ti]?.paragraphs?.[pi]
    if (!p) return null
    const q = findQuote(p.text || '', quote)
    return { key: `${ti}:${pi}`, start: q?.start ?? 0, end: q?.end ?? 0, label: p.label || null, textLabel: texts[ti]?.label || null, found: !!q }
  }
  if (anchor) {
    const ti = textIndex(doc, anchor.text || groupText)
    const pi = (texts[ti]?.paragraphs || []).findIndex((p) => p.label === anchor.paragraph)
    if (pi >= 0) {
      const hit = tryPara(ti, pi)
      if (hit?.found || !quote) return hit
    }
  }
  if (quote) {
    for (let ti = 0; ti < texts.length; ti++) {
      for (let pi = 0; pi < (texts[ti].paragraphs || []).length; pi++) {
        const hit = tryPara(ti, pi)
        if (hit?.found) return hit
      }
    }
  }
  return null
}

// Список меток для «какой абзац / какой текст» (matching_information): буквы абзацев текста группы, а если
// абзацы без букв (GT) — буквы текстов.
export function paragraphChoices(doc, groupText) {
  const texts = doc?.texts || []
  const scope = groupText ? [texts[textIndex(doc, groupText)]].filter(Boolean) : texts
  const paras = scope.flatMap((x) => (x.paragraphs || []).map((p) => p.label)).filter(Boolean)
  if (paras.length) return [...new Set(paras)]
  return texts.map((x) => x.label).filter(Boolean)
}
