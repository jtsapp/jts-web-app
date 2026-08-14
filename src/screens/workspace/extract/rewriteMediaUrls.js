// E6: the lesson HTML references media relative to its own folder
// (`audio/…`, `images/…`). Once extracted, those relative URLs are resolved to
// absolute against the lesson's file URL so the natively-rendered lesson can
// actually load its audio/images from the file server.

/** Returns a copy of `lesson` with every relative media URL in its info-block
 *  HTML resolved to absolute against `baseUrl`. */
export function rewriteMediaUrls(lesson, baseUrl) {
  if (!lesson || !baseUrl) return lesson
  const steps = (lesson.steps || []).map((step) => ({
    ...step,
    blocks: (step.blocks || []).map((block) => rewriteBlock(block, baseUrl)),
  }))
  return { ...lesson, steps }
}

function rewriteBlock(block, baseUrl) {
  if (block?.type === 'vocab' && Array.isArray(block.cards)) {
    return {
      ...block,
      cards: block.cards.map((card) => rewriteCardImage(card, baseUrl)),
    }
  }
  if (block && typeof block.html === 'string') {
    return { ...block, html: rewriteHtml(block.html, baseUrl) }
  }
  return block
}

function rewriteCardImage(card, baseUrl) {
  const imageUrl = card?.imageUrl
  if (!imageUrl || isAbsolute(imageUrl)) return card
  try {
    return { ...card, imageUrl: new URL(imageUrl, baseUrl).href }
  } catch {
    return card
  }
}

/** Exported for tests: absolutise `src`/`href` in a fragment of HTML. */
export function rewriteHtml(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('[src]').forEach((el) => absolutizeAttr(el, 'src', baseUrl))
  doc.querySelectorAll('[href]').forEach((el) => absolutizeAttr(el, 'href', baseUrl))
  return doc.body.innerHTML
}

function absolutizeAttr(el, attr, baseUrl) {
  const value = el.getAttribute(attr)
  if (!value || isAbsolute(value)) return
  try {
    el.setAttribute(attr, new URL(value, baseUrl).href)
  } catch {
    // Leave unparseable values untouched.
  }
}

/** Absolute URL, protocol-relative, anchor, or inline data/blob — leave as-is. */
function isAbsolute(url) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url.trim())
}
