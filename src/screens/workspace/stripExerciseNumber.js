/**
 * Course HTML titles/instructions often keep the old stage number («3 · Choose…»),
 * while the live sheet stamps its own badge from practice order. Showing both
 * reads as two conflicting numerations (badge 2 + «3 · …»).
 *
 * Middot may be · / • / ∙, and spaces may be NBSP from `&middot;` HTML.
 */
const LEAD_NUM =
  /^\d+[\s\u00a0\u202f]*[·.•∙･・\-–—:)][\s\u00a0\u202f]*/u
const AFTER_SENTENCE_NUM =
  /([.!?…]["'»]?\s+)\d+[\s\u00a0\u202f]*[·.•∙･・][\s\u00a0\u202f]*/gu
const LEAD_DOT = /^\d+\.\s+/

export function stripExerciseNumber(title) {
  const raw = String(title || '').trim()
  if (!raw) return ''
  const out = raw.replace(LEAD_NUM, '').replace(LEAD_DOT, '').trim()
  return out || raw
}

/** Title + instruction: also drop «N ·» after a sentence («…example. 1 · Match»). */
export function stripExerciseNumbersInText(text) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const out = raw.replace(AFTER_SENTENCE_NUM, '$1').replace(LEAD_NUM, '').replace(LEAD_DOT, '').trim()
  return out || raw
}

/**
 * Same cleanup inside course HTML (`.instruction` / `.subline`), keeping markup
 * when the number prefix is plain text at the start (or after a sentence).
 */
export function stripExerciseNumbersInHtml(html) {
  if (!html || typeof DOMParser === 'undefined') return html
  if (!/\d/.test(html)) return html
  const doc = new DOMParser().parseFromString(`<div id="jts-strip">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-strip') || doc.body
  root.querySelectorAll('.instruction, .subline, .ohint').forEach((el) => {
    // Prefer text cleanup when the node is wording-only — preserves no nested tags.
    if (!el.querySelector('b, i, em, strong, a, span, code')) {
      const cleaned = stripExerciseNumbersInText(el.textContent || '')
      if (cleaned && cleaned !== (el.textContent || '').trim()) el.textContent = cleaned
      return
    }
    const before = el.innerHTML
    const after = stripExerciseNumbersInText(
      before
        .replace(/&nbsp;/gi, ' ')
        .replace(/&middot;/gi, '·'),
    )
    // Only safe when we didn't lose tags: compare tag counts.
    if ((before.match(/</g) || []).length === 0) {
      el.innerHTML = after
    } else {
      // Strip leading «N ·» from the HTML string without touching nested tags.
      el.innerHTML = before
        .replace(/^(\s|&nbsp;)*\d+(\s|&nbsp;|\u00a0|\u202f)*(&middot;|[·.•∙･・\-–—:)])(\s|&nbsp;)+/i, '')
        .replace(
          /([.!?…]["'»]?)(\s|&nbsp;)+(\d+)(\s|&nbsp;|\u00a0|\u202f)*(&middot;|[·.•∙･・])(\s|&nbsp;)*/gi,
          '$1$2',
        )
    }
  })
  return root.innerHTML
}
