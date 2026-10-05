// Маркер SAT — порт HL из прототипа jts-sat-platform (js/modules/question.js). Подсветка хранится смещениями в тексте
// корня (текст задания или вопрос), а не сохранённым HTML: восстановленный текст всегда побайтово тот же, что в
// банке, и ничего из сделанного студентом не может стать разметкой. Свой движок, а не PassagePane IELTS: там текст
// — абзацы строк, а у SAT задание — HTML банка (подчёркивания, таблицы, списки), и смещение считается по всему корню.

const SPACE = /\s/

/** Склеить пересекающиеся и соприкасающиеся отрезки — повторные проходы маркером остаются аккуратными. */
export function merge(ranges) {
  const sorted = ranges
    .filter((r) => r && r.end > r.start)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start - b.start)
  const out = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push(r)
  }
  return out
}

/** Снять отрезок, в который попадает точка (тап по подсветке). */
export function removeAt(ranges, point) {
  return ranges.filter((r) => point < r.start || point >= r.end)
}

/**
 * Довести отрезок до целых слов и срезать пробелы по краям: выделение, остановленное посреди «straightforward»,
 * значит слово целиком, а подсветка, режущая слово пополам, выглядит ошибкой отрисовки.
 */
export function snap(text, r) {
  const word = (i) => i >= 0 && i < text.length && !SPACE.test(text[i])
  let start = Math.max(0, r.start)
  let end = Math.min(r.end, text.length)
  while (start > 0 && word(start - 1) && word(start)) start--
  while (end < text.length && word(end - 1) && word(end)) end++
  while (start < end && SPACE.test(text[start])) start++
  while (end > start && SPACE.test(text[end - 1])) end--
  return end > start ? { start, end } : null
}

// ---- DOM: работает только в браузере, вызывается из эффектов ----

function texts(root) {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */)
  const out = []
  let n
  while ((n = walker.nextNode())) out.push(n)
  return out
}

/** Весь текст корня в порядке чтения — та же строка, в которой живут смещения. */
export function textOf(root) {
  return texts(root).map((n) => n.nodeValue).join('')
}

function offsetOf(root, node, offset) {
  let total = 0
  for (const n of texts(root)) {
    if (n === node) return total + offset
    total += n.nodeValue.length
  }
  // край выделения стоит на элементе, а не на тексте (тройной клик): считаем по детям
  if (root.contains(node)) {
    const r = root.ownerDocument.createRange()
    r.selectNodeContents(root)
    r.setEnd(node, offset)
    return r.toString().length
  }
  return -1
}

/** Текущее выделение внутри root как {start, end}; null — пусто или вне корня. */
export function fromSelection(root, sel) {
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
  const a = offsetOf(root, range.startContainer, range.startOffset)
  const b = offsetOf(root, range.endContainer, range.endOffset)
  if (a < 0 || b < 0 || a === b) return null
  return { start: Math.min(a, b), end: Math.max(a, b) }
}

/** Обернуть отрезки в <mark class="st-hl" data-at>. Вызывать на только что отрисованном корне. */
export function apply(root, ranges) {
  const merged = merge(ranges || [])
  if (!merged.length) return
  const doc = root.ownerDocument
  // с конца: обёртка разбивает текстовые узлы, и смещения дальше по тексту не должны съезжать
  for (const r of merged.slice().reverse()) {
    let pos = 0
    for (const n of texts(root)) {
      const len = n.nodeValue.length
      const nodeStart = pos
      const nodeEnd = pos + len
      pos = nodeEnd
      if (nodeEnd <= r.start || nodeStart >= r.end) continue
      if (n.parentNode?.nodeName === 'MARK') continue
      const from = Math.max(0, r.start - nodeStart)
      const to = Math.min(len, r.end - nodeStart)
      let target = n
      if (to < len) target.splitText(to)
      if (from > 0) target = target.splitText(from)
      const mark = doc.createElement('mark')
      mark.className = 'st-hl'
      mark.dataset.at = String(nodeStart + from)
      target.parentNode.replaceChild(mark, target)
      mark.appendChild(target)
    }
  }
}
