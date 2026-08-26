/**
 * Stage-head lead used to become the first info card, so live showed the
 * subtitle above the real stage title. Repairs stored catalog JSON; convert
 * now emits `.ex-lead` for new imports.
 */
const LEAD_MAX = 120

export function hoistStepLeads(steps) {
  return (steps || []).map(hoistStepLead)
}

export function hoistStepLead(step) {
  if (!step) return step
  const fromBlocks = takeLeadInfo(step.blocks)
  const subtitle = norm(step.subtitle) || fromBlocks.subtitle
  if (!subtitle) return step
  // Same text as the stage title — keep one heading, not title + identical lead.
  if (same(subtitle, step.title)) {
    const blocks =
      fromBlocks.subtitle && same(subtitle, fromBlocks.subtitle)
        ? fromBlocks.blocks
        : step.blocks || []
    if (!step.subtitle && blocks === step.blocks) return step
    const next = { ...step, blocks }
    delete next.subtitle
    return next
  }
  const blocks =
    fromBlocks.subtitle && same(subtitle, fromBlocks.subtitle)
      ? fromBlocks.blocks
      : step.blocks || []
  if (subtitle === step.subtitle && blocks === step.blocks) return step
  return { ...step, subtitle, blocks }
}

function takeLeadInfo(blocks) {
  const list = blocks || []
  const first = list[0]
  if (!first || first.type !== 'info' || first.title) return { blocks: list }
  const subtitle = leadTextFromInfoHtml(first.html)
  if (!subtitle) return { blocks: list }
  return { subtitle, blocks: list.slice(1) }
}

export function leadTextFromInfoHtml(html) {
  if (!html || typeof DOMParser === 'undefined') return undefined
  const doc = new DOMParser().parseFromString(`<div id="jts-lead">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-lead') || doc.body
  const kids = [...root.childNodes].filter((n) => !(n.nodeType === 3 && !String(n.textContent || '').trim()))
  if (kids.length !== 1 || kids[0].nodeType !== 1) return undefined
  const el = kids[0]
  if (el.tagName !== 'P') return undefined
  if (el.className && /instruction|subline|ohint|gc-lead|ex-lead/.test(el.className)) return undefined
  if (el.querySelector('ul, ol, table, input, button, audio, textarea, select, .egs, .wbank, .gap, .task')) {
    return undefined
  }
  const text = norm(el.textContent)
  if (!text || text.length > LEAD_MAX) return undefined
  return text
}

function norm(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function same(a, b) {
  return norm(a).toLowerCase() === norm(b).toLowerCase()
}
