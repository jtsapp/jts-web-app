/**
 * Stored catalog JSON sometimes still has course `.order` / converted `.order-q`
 * chips inside info HTML. Those buttons have no handlers (CSS even sets
 * pointer-events: none), so «Build the questions» looks dead. Lift them into
 * real `order` practice questions — same idea as hoistSelectQuestions.
 */
function textOf(el) {
  return String(el?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlHasContent(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0
}

function isPermutation(ranks) {
  if (!ranks.length) return false
  const sorted = [...ranks].sort((a, b) => a - b)
  return sorted.every((rank, i) => rank === i + 1)
}

/** Course widget: `<div class="order" data-order="w3,w5,…">` + `.ochip[data-val]`. */
export function orderFromCourseOrder(container, id) {
  const chips = Array.from(container.querySelectorAll('.ochip'))
  if (chips.length < 2) return null

  const sequence = String(container.getAttribute('data-order') || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  const labels = chips.map((chip) => textOf(chip.querySelector('.txt')) || textOf(chip))
  if (labels.some((label) => !label)) return null
  if (sequence.length === 0) return null

  const ranked = chips.map((chip, index) => ({
    rank: sequence.indexOf(chip.getAttribute('data-val') ?? '') + 1,
    label: labels[index],
  }))
  if (!isPermutation(ranked.map((word) => word.rank))) return null

  const words = ranked.map((word) => word.label)
  const answer = [...ranked].sort((a, b) => a.rank - b.rank).map((word) => word.label)
  const prompt = promptBeside(container)
  return {
    id,
    type: 'order',
    ...(prompt ? { prompt } : {}),
    words,
    answer,
  }
}

/** Converted widget: `<div class="order-q">` + `.ochip[data-rank]`. */
export function orderFromOrderQ(container, id) {
  const chips = Array.from(container.querySelectorAll('.ochip'))
  if (chips.length < 2) return null
  if (chips.some((chip) => !chip.hasAttribute('data-rank'))) return null

  const ranked = chips.map((chip) => {
    const rank = Number(chip.getAttribute('data-rank'))
    return { rank, label: textOf(chip) }
  })
  if (ranked.some((word) => !Number.isInteger(word.rank) || !word.label)) return null
  if (!isPermutation(ranked.map((word) => word.rank))) return null

  const qEl = container.querySelector('.q')
  const prompt = qEl
    ? textOf(
        (() => {
          const clone = qEl.cloneNode(true)
          clone.querySelectorAll?.('.num, .say')?.forEach((el) => el.remove())
          return clone
        })(),
      )
    : ''

  return {
    id,
    type: 'order',
    ...(prompt ? { prompt } : {}),
    words: ranked.map((word) => word.label),
    answer: [...ranked].sort((a, b) => a.rank - b.rank).map((word) => word.label),
  }
}

function promptBeside(container) {
  const row = container.closest('.row, .line, li, .body') || container.parentElement
  if (!row) return ''
  const clone = row.cloneNode(true)
  clone.querySelectorAll('.order, .order-q, .ochip, .num, .why, .rev, button').forEach((el) => el.remove())
  return textOf(clone)
}

function extractOrdersFromHtml(html, stepId, nextIndex) {
  if (typeof DOMParser === 'undefined' || !html) {
    return { html, questions: [] }
  }
  if (!/\border-q\b|\bclass=["'][^"']*\border\b/i.test(html) && !/<div[^>]*\border\b/i.test(html)) {
    // Cheap reject; still parse if any ochip+data-order looks present.
    if (!/\bdata-order=|\bdata-rank=/i.test(html)) return { html, questions: [] }
  }

  const doc = new DOMParser().parseFromString(`<div id="jts-hoist">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-hoist') || doc.body
  const questions = []

  Array.from(root.querySelectorAll('.order-q')).forEach((el) => {
    const question = orderFromOrderQ(el, `${stepId}-o${nextIndex()}`)
    if (!question) return
    questions.push(question)
    el.remove()
  })

  Array.from(root.querySelectorAll('.order')).forEach((el) => {
    const question = orderFromCourseOrder(el, `${stepId}-o${nextIndex()}`)
    if (!question) return
    questions.push(question)
    const row = el.closest('.row, .line, li') || el
    row.remove()
  })

  return { html: root.innerHTML, questions }
}

function hoistBlocks(blocks, stepId) {
  const out = []
  let n = 0
  const nextIndex = () => n++

  for (const block of blocks || []) {
    const html = block?.html
    if (!html) {
      out.push(block)
      continue
    }

    if (block.type === 'practice') {
      const extracted = extractOrdersFromHtml(html, stepId, nextIndex)
      if (!extracted.questions.length) {
        out.push(block)
        continue
      }
      out.push({
        ...block,
        html: extracted.html,
        questions: [...(block.questions || []), ...extracted.questions],
      })
      continue
    }

    if (block.type === 'info' || block.type === 'grammar_concept') {
      const extracted = extractOrdersFromHtml(html, stepId, nextIndex)
      if (!extracted.questions.length) {
        out.push(block)
        continue
      }
      if (htmlHasContent(extracted.html)) {
        out.push({ ...block, html: extracted.html })
      }
      out.push({
        type: 'practice',
        ...(block.title ? { title: block.title } : {}),
        questions: extracted.questions,
      })
      continue
    }

    out.push(block)
  }

  return out
}

export function hoistOrderQuestions(lesson) {
  if (!lesson?.steps) return lesson
  return {
    ...lesson,
    steps: lesson.steps.map((step) => ({
      ...step,
      blocks: hoistBlocks(step.blocks, step.id || 's'),
    })),
  }
}
