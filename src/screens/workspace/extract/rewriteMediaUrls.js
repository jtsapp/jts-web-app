// E6: the lesson HTML references media relative to its own folder
// (`audio/…`, `images/…`). Once extracted, those relative URLs are resolved to
// absolute against the lesson's file URL so the natively-rendered lesson can
// actually load its audio/images from the file server.

/** Returns a copy of `lesson` with every relative media URL in its info-block
 *  HTML resolved to absolute against `baseUrl`. */
export function rewriteMediaUrls(lesson, baseUrl) {
  if (!lesson) return lesson
  const steps = (lesson.steps || []).map((step) => ({
    ...step,
    blocks: (step.blocks || []).map((block) => rewriteBlock(block, baseUrl)),
  }))
  return { ...lesson, steps }
}

function rewriteBlock(block, baseUrl) {
  if (block?.type === 'vocab' && Array.isArray(block.cards)) {
    if (!baseUrl) return block
    return {
      ...block,
      cards: block.cards.map((card) => rewriteCardImage(card, baseUrl)),
    }
  }
  let next = block
  if (next && typeof next.html === 'string') {
    next = { ...next, html: rewriteHtml(next.html, baseUrl || '') }
  }
  if (baseUrl && next?.audio?.src && !isAbsolute(next.audio.src)) {
    try {
      next = { ...next, audio: { ...next.audio, src: new URL(next.audio.src, baseUrl).href } }
    } catch {
      // leave unparseable src
    }
  }
  return next
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
  hydrateCoursePlayers(doc.body)
  if (baseUrl) {
    doc.querySelectorAll('[src]').forEach((el) => absolutizeAttr(el, 'src', baseUrl))
    doc.querySelectorAll('[href]').forEach((el) => absolutizeAttr(el, 'href', baseUrl))
  }
  return doc.body.innerHTML
}

/**
 * B2 (и тот же виджет на других уровнях) рисует плеер разметкой: Play, полоса,
 * «0:00 / --:--», <select> скорости. В приложении этого JS нет, поэтому на
 * экране остаётся голый текст, а скорость уезжает в вопрос с «Проверить».
 * Подменяем на настоящий <audio controls>, ключ дорожки — data-track.
 */
function audioFileForTrack(track) {
  const id = String(track).trim()
  return /\.(mp3|m4a|ogg)$/i.test(id) ? id : `${id}.mp3`
}

function hydrateCoursePlayers(root) {
  root.querySelectorAll('.player').forEach((el) => {
    const isWidget =
      el.hasAttribute('data-track') ||
      el.hasAttribute('data-jts-media') ||
      el.querySelector('.bar, .wave, .time, .rate, audio')
    if (!isWidget) return
    el.querySelectorAll('button, .bar, .wave, .time, .rate, select').forEach((node) => node.remove())
    if (el.querySelector('audio')) return
    const track = el.getAttribute('data-track') || el.getAttribute('data-jts-media')
    if (!track) return
    const audio = el.ownerDocument.createElement('audio')
    audio.setAttribute('controls', '')
    audio.setAttribute('preload', 'none')
    // Урок в каталоге лежит в lessons/, дорожки — рядом в audio/, как у convertPlayer.
    audio.setAttribute('src', `../audio/${audioFileForTrack(track)}`)
    el.appendChild(audio)
  })
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
