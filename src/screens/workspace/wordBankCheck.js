import { answerMatches } from '../../lib/answer-match.js'

const GAP = 'input.gap, textarea.gap'

/** В HTML есть пропуска с ключом — есть что проверить кнопкой «Проверить». */
export function htmlHasCheckableWordBank(html) {
  const s = String(html || '')
  if (!/\bclass=["'][^"']*\bgap\b/.test(s)) return false
  return /\bdata-answer\s*=/.test(s)
}

export function wordBankAnswersAttempted(answers, prefix) {
  if (!prefix || !answers) return false
  const p = `${prefix}-gap-`
  return Object.entries(answers).some(([k, v]) => k.startsWith(p) && v != null && String(v).trim() !== '')
}

export function collectCheckableGapIds(root) {
  if (!root) return []
  return [...root.querySelectorAll(GAP)]
    .filter((gap) => (gap.getAttribute('data-answer') || '').trim())
    .map((gap) => gap.getAttribute('data-question-id') || gap.getAttribute('data-qid'))
    .filter(Boolean)
}

function gapKeyNote(gap) {
  const next = gap.nextElementSibling
  return next && next.classList.contains('lw-gap-key') ? next : null
}

/**
 * Красит пропуски с `data-answer` в верно/неверно (как course Check answers).
 * `reveal` — рядом с ошибкой пишет первый принятый вариант. Без ключа — open, не считаем.
 */
export function gradeWordBankInRoot(root, { reveal = false } = {}) {
  if (!root) return { correct: 0, total: 0 }
  let correct = 0
  let total = 0
  root.querySelectorAll(GAP).forEach((gap) => {
    const raw = (gap.getAttribute('data-answer') || '').trim()
    const note = gapKeyNote(gap)
    if (!raw) {
      gap.classList.remove('is-correct', 'is-wrong')
      if (note) note.remove()
      return
    }
    total += 1
    const ok = answerMatches(gap.value, raw.split('|').map((a) => a.trim()).filter(Boolean))
    gap.classList.toggle('is-correct', ok)
    gap.classList.toggle('is-wrong', !ok)
    if (reveal && !ok) {
      const text = raw.split('|')[0].trim()
      const el = note || document.createElement('span')
      el.className = 'lw-gap-key'
      el.textContent = text
      if (!note) gap.after(el)
    } else if (note) {
      note.remove()
    }
    if (ok) correct += 1
  })
  return { correct, total }
}

export function clearWordBankGrades(root) {
  if (!root) return
  root.querySelectorAll(GAP).forEach((gap) => {
    gap.classList.remove('is-correct', 'is-wrong')
    const note = gapKeyNote(gap)
    if (note) note.remove()
  })
}
