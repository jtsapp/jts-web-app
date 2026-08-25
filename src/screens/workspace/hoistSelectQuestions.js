import { tidyLessonText } from './tidyLessonText.js'

const PLACEHOLDER = /^(?:[-—–…]|choose\b|select\b|выбер)/i

function isPlaceholder(label, value) {
  if (value === '' || value === '—' || value === '–') return true
  if (!label) return true
  return PLACEHOLDER.test(label)
}

function htmlHasContent(html) {
  const text = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0
}

function promptFromSelect(select) {
  const row = select.closest('.row, .line, li, p, .body') || select.parentElement
  if (!row) return ''
  const clone = row.cloneNode(true)
  clone.querySelectorAll('select, option, .num, .why, .rev').forEach((el) => el.remove())
  return tidyLessonText((clone.textContent || '').replace(/\s+/g, ' ').trim())
}

export function choiceFromSelect(select, id) {
  const options = Array.from(select.querySelectorAll('option'))
    .map((opt) => {
      const label = (opt.textContent || '').trim()
      const value = (opt.getAttribute('value') ?? label).trim()
      return { label, value }
    })
    .filter((opt) => !isPlaceholder(opt.label, opt.value))
  const labels = [...new Set(options.map((opt) => opt.label).filter(Boolean))]
  if (labels.length < 2) return null

  const raw = (select.getAttribute('data-answer') || '').trim()
  const matched = options.find(
    (opt) => opt.value === raw || opt.label === raw || opt.label.toLowerCase() === raw.toLowerCase(),
  )
  const answer = matched?.label || ''
  const why = tidyLessonText(select.getAttribute('data-why') || '')
  return {
    id,
    type: 'choice',
    prompt: promptFromSelect(select),
    options: labels,
    answer,
    ...(answer ? {} : { open: true }),
    ...(why ? { why } : {}),
  }
}

function extractSelectsFromHtml(html, stepId, nextIndex) {
  if (typeof DOMParser === 'undefined' || !html || !/<select/i.test(html)) {
    return { html, questions: [] }
  }
  const doc = new DOMParser().parseFromString(`<div id="jts-hoist">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-hoist') || doc.body
  const questions = []
  Array.from(root.querySelectorAll('select')).forEach((select) => {
    // Скорость у .player/.player — не задание, а контрол плеера (B2 Navigate).
    if (select.closest('.player, .player, .audio, .listen, .rate')) return
    const question = choiceFromSelect(select, `${stepId}-sel${nextIndex()}`)
    if (!question) return
    questions.push(question)
    const row = select.closest('.row, .line, li') || select
    row.remove()
  })
  return { html: root.innerHTML, questions }
}

const SPEED_RATE = /^\d+(?:[.,]\d+)?\s*[x×]$/i

function isPlaybackSpeedQuestion(question) {
  if (question?.type !== 'choice') return false
  const options = Array.isArray(question.options) ? question.options : []
  if (options.length < 2) return false
  return options.every((opt) => SPEED_RATE.test(String(opt).trim()))
}

function htmlHasMeaningfulContent(html) {
  return htmlHasContent(html)
}

function dropPlaybackSpeedQuestions(blocks) {
  const out = []
  for (const block of blocks || []) {
    if (block?.type !== 'practice' || !Array.isArray(block.questions)) {
      out.push(block)
      continue
    }
    const questions = block.questions.filter((q) => !isPlaybackSpeedQuestion(q))
    if (questions.length === block.questions.length) {
      out.push(block)
      continue
    }
    if (questions.length > 0) {
      out.push({ ...block, questions })
      continue
    }
    if (htmlHasMeaningfulContent(block.html)) {
      out.push({ type: 'info', title: block.title, html: block.html })
    } else if (block.audio?.src) {
      out.push({ ...block, questions: [] })
    }
  }
  return out
}

function hoistBlocks(blocks, stepId) {
  const out = []
  let n = 0
  const nextIndex = () => n++
  for (const block of blocks || []) {
    const html = block?.html
    if (block?.type === 'practice' && html && /<select/i.test(html)) {
      const extracted = extractSelectsFromHtml(html, stepId, nextIndex)
      out.push({
        ...block,
        html: extracted.html,
        questions: [...(block.questions || []), ...extracted.questions],
      })
      continue
    }
    if ((block?.type === 'info' || block?.type === 'grammar_concept') && html && /<select/i.test(html)) {
      const extracted = extractSelectsFromHtml(html, stepId, nextIndex)
      if (htmlHasContent(extracted.html)) out.push({ ...block, html: extracted.html })
      if (extracted.questions.length) {
        out.push({ type: 'practice', title: block.title, questions: extracted.questions })
      }
      continue
    }
    out.push(block)
  }
  return out
}

// Уже сохранённый JSON урока мог оставить нативные <select> в info-HTML —
// экстрактор их не считал заданием, поэтому не было ни пилюль, ни live-sync.
export function hoistSelectQuestions(lesson) {
  if (!lesson?.steps) return lesson
  return {
    ...lesson,
    steps: lesson.steps.map((step) => ({
      ...step,
      blocks: dropPlaybackSpeedQuestions(hoistBlocks(step.blocks, step.id || 's')),
    })),
  }
}
