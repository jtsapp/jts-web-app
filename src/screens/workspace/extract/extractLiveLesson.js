// Maps an already-rendered live-lesson `Document` to the workspace lesson JSON
// (steps → blocks → questions). Ported from the web-admin extractor (kept in
// sync); produces info / practice{choice,match,gap.open} blocks that
// LessonWorkspacePage already renders.
//
// Pure: reads `doc` only through DOM APIs, never globals/network. Every step is
// defensive — a missing or malformed piece is skipped, never thrown, so one
// broken section can't abort the whole extraction.

const LEVEL_PATTERN = /A0|A1|A2|B1|B2|C1|C2/

export function extractLiveLesson(doc) {
  const level = safe(() => extractLevel(doc), 'A1')
  const unit = safe(() => textOf(doc.querySelector('.hero .kick')), '')
  const title = safe(() => textOf(doc.querySelector('.hero h1')), '')
  const topics = safe(() => extractTopics(doc), [])
  const introBlocks = safe(() => extractIntroBlocks(doc), [])
  const steps = safe(() => extractSteps(doc), [])

  if (introBlocks.length > 0 && steps.length > 0) {
    steps[0] = { ...steps[0], blocks: [...introBlocks, ...steps[0].blocks] }
  }

  return { unit, title, level, topics, steps }
}

function safe(fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function textOf(el) {
  return (el?.textContent ?? '').trim()
}

function extractLevel(doc) {
  const mk = textOf(doc.querySelector('.mk')).match(LEVEL_PATTERN)
  if (mk) return mk[0]
  const kick = textOf(doc.querySelector('.hero .kick')).match(LEVEL_PATTERN)
  return kick ? kick[0] : 'A1'
}

function extractTopics(doc) {
  const seen = new Set()
  const topics = []
  doc.querySelectorAll('.ex-tag').forEach((el) => {
    const tag = textOf(el)
    if (!tag || seen.has(tag)) return
    seen.add(tag)
    topics.push({ id: slug(tag), title: tag })
  })
  return topics
}

// Intro info blocks outside any `.ex` step (hero goal, panic poster, vocab).
// They get prepended to the first step's blocks.
function extractIntroBlocks(doc) {
  const blocks = []

  const goal = doc.querySelector('.hero .goal')
  if (goal && !goal.closest('.ex')) {
    blocks.push({ type: 'info', title: 'Цель', html: sanitize(doc, goal.innerHTML) })
  }

  const panic = doc.querySelector('.panic-poster')
  if (panic && !panic.closest('.ex')) {
    const h = panic.querySelector('h3')
    blocks.push({ type: 'info', title: h ? textOf(h) : undefined, html: sanitize(doc, panic.innerHTML) })
  }

  const vocab = doc.querySelector('.vocab')
  if (vocab && !vocab.closest('.ex')) {
    const h = vocab.querySelector('.vhead h2')
    blocks.push({ type: 'info', title: h ? textOf(h) : undefined, html: sanitize(doc, vocab.innerHTML) })
  }

  return blocks
}

function extractSteps(doc) {
  const steps = []
  Array.from(doc.querySelectorAll('.ex')).forEach((section, index) => {
    try {
      steps.push(extractStep(doc, section, index))
    } catch {
      // Malformed section — skip it, keep the rest of the lesson usable.
    }
  })
  return steps
}

function extractStep(doc, section, index) {
  const id = section.id || `step-${index + 1}`
  const numText = textOf(section.querySelector('.ex-num'))
  const parsed = parseInt(numText, 10)
  const order = Number.isNaN(parsed) ? index + 1 : parsed
  const title = textOf(section.querySelector('.ex-head h2'))
  const tagEl = section.querySelector('.ex-tag')
  const tag = tagEl ? textOf(tagEl) : undefined
  const topicId = tag ? slug(tag) : undefined
  const body = section.querySelector('.ex-body')
  const blocks = body ? extractBodyBlocks(doc, body, id, title) : []
  return { id, order, title, tag, topicId, blocks }
}

function extractBodyBlocks(doc, body, sectionId, stepTitle) {
  const blocks = []

  const choiceQuestions = mapSkippingErrors(
    Array.from(body.querySelectorAll('.mcq')),
    (el, i) => extractChoiceQ(el, sectionId, i),
  )
  if (choiceQuestions.length > 0) {
    blocks.push({ type: 'practice', title: stepTitle, questions: choiceQuestions })
  }

  const matchQuestions = mapSkippingErrors(
    Array.from(body.querySelectorAll('.match')),
    (el, i) => extractMatchQ(el, sectionId, i),
  )
  if (matchQuestions.length > 0) {
    blocks.push({ type: 'practice', title: stepTitle, questions: matchQuestions })
  }

  const gapQuestions = mapSkippingErrors(
    Array.from(body.querySelectorAll('.exit-rows .exit-row')),
    (el, i) => extractGapQ(el, sectionId, i),
  )
  if (gapQuestions.length > 0) {
    blocks.push({ type: 'practice', title: stepTitle, questions: gapQuestions })
  }

  if (blocks.length === 0) {
    return [{ type: 'info', title: stepTitle, html: sanitize(doc, body.innerHTML) }]
  }

  // Preserve non-graded siblings (e.g. a `.listen` audio the exercise depends
  // on) that would otherwise be dropped now that a practice block exists.
  return [...extractAuxInfoBlocks(doc, body), ...blocks]
}

function extractAuxInfoBlocks(doc, body) {
  const blocks = []
  Array.from(body.children).forEach((child) => {
    if (containsGradedElement(child) || !hasMeaningfulContent(child)) return
    blocks.push({ type: 'info', html: sanitize(doc, child.outerHTML) })
  })
  return blocks
}

function containsGradedElement(el) {
  return (
    el.matches('.mcq, .match, .exit-rows, .exit-row') ||
    el.querySelector('.mcq, .match, .exit-row') !== null
  )
}

function hasMeaningfulContent(el) {
  if ((el.textContent ?? '').trim().length > 0) return true
  return el.querySelector('audio, video, img, iframe, source') !== null
}

function mapSkippingErrors(items, fn) {
  const results = []
  items.forEach((item, index) => {
    try {
      results.push(fn(item, index))
    } catch {
      // Malformed question — skip it rather than failing the whole block.
    }
  })
  return results
}

function extractChoiceQ(mcqEl, sectionId, index) {
  const qEl = mcqEl.querySelector('.q')
  const prompt = qEl ? promptTextWithoutNumAndSay(qEl) : ''
  const options = Array.from(mcqEl.querySelectorAll('.opt')).map((opt) => textOf(opt))
  const correctEl = mcqEl.querySelector('.opt[data-correct]')
  const answer = correctEl ? textOf(correctEl) : ''
  return { id: `${sectionId}-c${index}`, type: 'choice', prompt, options, answer }
}

function promptTextWithoutNumAndSay(qEl) {
  const clone = qEl.cloneNode(true)
  clone.querySelectorAll('.num, .say').forEach((el) => el.remove())
  return (clone.textContent ?? '').trim()
}

function extractMatchQ(matchEl, sectionId, index) {
  const termTiles = Array.from(matchEl.querySelectorAll('.terms .mtile[data-key]'))
  const defTiles = Array.from(matchEl.querySelectorAll('.defs .mtile[data-key]'))
  const pairs = termTiles
    .map((term) => {
      const key = term.getAttribute('data-key')
      const def = defTiles.find((d) => d.getAttribute('data-key') === key)
      if (!key || !def) return null
      return { left: textOf(term), right: textOf(def) }
    })
    .filter((pair) => pair !== null)
  return { id: `${sectionId}-m${index}`, type: 'match', pairs }
}

function extractGapQ(row, sectionId, index) {
  const gapBefore = textOf(row.querySelector('.chunk'))
  return { id: `${sectionId}-g${index}`, type: 'gap', open: true, gapBefore, gapAfter: '' }
}

// Strips <script>/<style> and any `on*` attribute from a fragment of HTML.
function sanitize(doc, html) {
  const container = doc.createElement('div')
  container.innerHTML = html
  container.querySelectorAll('script, style').forEach((el) => el.remove())
  container.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name)
    })
  })
  return container.innerHTML
}

function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
