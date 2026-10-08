// Маркер в тексте Reading: выделения хранятся смещениями в тексте абзаца, а не DOM-узлами — так их можно
// сохранить в попытке и нарисовать в разборе тем же кодом. key абзаца — «<текст>:<абзац>».
// Маркер один — жёлтый (правка по макету «IELTS new»: один цвет, два действия — выделить и убрать). Старые выделения
// попыток с цветами 2 и 3 рисуются тем же жёлтым: color в данных оставлен, чтобы черновики и разборы не ломались.
export const MARKER_COLOR = 1

// Новое выделение поверх старых: пересекающиеся куски того же абзаца заменяются (как маркер на бумаге).
export function addHighlight(list, h) {
  if (!h || h.end <= h.start) return list
  const rest = []
  for (const x of list) {
    if (x.key !== h.key || x.end <= h.start || x.start >= h.end) {
      rest.push(x)
      continue
    }
    if (x.start < h.start) rest.push({ ...x, end: h.start })
    if (x.end > h.end) rest.push({ ...x, start: h.end })
  }
  return [...rest, h].sort((a, b) => (a.key === b.key ? a.start - b.start : a.key < b.key ? -1 : 1))
}

// Убрать маркер с куска абзаца: пересекающиеся выделения обрезаются, кусок посередине делит выделение на два.
export function removeHighlight(list, r) {
  if (!r || r.end <= r.start) return list
  const out = []
  for (const x of list) {
    if (x.key !== r.key || x.end <= r.start || x.start >= r.end) {
      out.push(x)
      continue
    }
    if (x.start < r.start) out.push({ ...x, end: r.start })
    if (x.end > r.end) out.push({ ...x, start: r.end })
  }
  return out
}

/** Есть ли маркер на куске абзаца — показывать ли «Убрать выделение». */
export function overlapsHighlight(list, r) {
  return list.some((x) => x.key === r.key && x.start < r.end && x.end > r.start)
}

// Текст абзаца → куски для рендера: [{ text, color|null, mark|null }]. mark — подсветка ответа в разборе
// (цитата), рисуется поверх маркера ученика.
export function segments(text, highlights, mark) {
  const cuts = new Set([0, text.length])
  for (const h of highlights) {
    cuts.add(clamp(h.start, text))
    cuts.add(clamp(h.end, text))
  }
  if (mark) {
    cuts.add(clamp(mark.start, text))
    cuts.add(clamp(mark.end, text))
  }
  const points = [...cuts].sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < points.length - 1; i++) {
    const s = points[i]
    const e = points[i + 1]
    if (e <= s) continue
    const h = highlights.find((x) => x.start <= s && x.end >= e)
    const inMark = mark && mark.start <= s && mark.end >= e
    out.push({ text: text.slice(s, e), color: h ? h.color : null, mark: inMark ? mark.kind || 'answer' : null })
  }
  return out
}

function clamp(n, text) {
  return Math.max(0, Math.min(text.length, n))
}

// Где в абзаце цитата ответа: прототип позволяет пропуск середины многоточием («beaten … six hours») —
// подсвечиваем от начала первой части до конца последней.
export function findQuote(text, quote) {
  if (!quote) return null
  const parts = String(quote).split(/…|\.\.\./).map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return null
  const lower = text.toLowerCase()
  const first = lower.indexOf(parts[0].toLowerCase())
  if (first < 0) return null
  let end = first + parts[0].length
  for (const p of parts.slice(1)) {
    const at = lower.indexOf(p.toLowerCase(), end)
    if (at < 0) break
    end = at + p.length
  }
  return { start: first, end }
}
