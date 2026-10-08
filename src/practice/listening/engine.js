// Listening trainer — pure session logic (no React, easy to unit-test).
// Ported faithfully from the source engine: norm() answer-normalization and
// mix() shuffle. Adds a compact linear "session" model (batch of tasks with a
// single requeue on a wrong answer) matching the Russian trainer designs.

import { latinLookalikes } from '../../lib/latinLookalikes.js'

// case-insensitive; curly→straight quotes; punctuation→space; apostrophes
// dropped; whitespace collapsed. Used to compare type/assemble answers.
export function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,?!;:–—-]/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Fisher–Yates shuffle that guarantees a different order than the input
// (swaps the first two items if the shuffle happened to be the identity).
export function mix(input) {
  const a = input.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (a.length > 1 && a.every((v, i) => v === input[i])) {
    ;[a[0], a[1]] = [a[1], a[0]]
  }
  return a
}

export const SESSION_SIZE = 8
export const COINS_PER_TASK = 10

// Build a session: `size` tasks drawn from `tasks` starting at a random offset,
// avoiding two identical types in a row where possible. Returns fresh clones
// with a `_retry` flag the engine uses for the single requeue.
export function buildSession(tasks, size = SESSION_SIZE, startIndex = null) {
  const usable = tasks.filter((t) => t.audio) // only tasks whose audio was extracted
  if (usable.length === 0) return []
  const n = Math.min(size, usable.length)
  const start =
    startIndex == null ? Math.floor(Math.random() * usable.length) : startIndex % usable.length
  // take a window, then reorder to avoid adjacent same-type
  const window = []
  for (let i = 0; i < Math.min(usable.length, n * 2); i++) {
    window.push(usable[(start + i) % usable.length])
  }
  const picked = []
  const pool = window.slice()
  while (picked.length < n && pool.length) {
    const last = picked[picked.length - 1]
    let idx = pool.findIndex((t) => !last || t.type !== last.type)
    if (idx === -1) idx = 0
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked.map((t) => ({ ...t, _retry: false }))
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]
const NUMBER_RE = new RegExp(`\\b(${NUMBER_WORDS.join('|')})\\b`, 'g')

// Правки только для диктанта: ученик записывает услышанное, и форма записи
// смысла не меняет — cafés/cafes, 9/nine, OK/Okay, T A Y L O R/Taylor, «Т» с
// русской раскладки. В общую сверку ответов (answer-match) их не несём: в
// грамматике «напиши словами» бывает предметом задания.
function dictationForm(s) {
  return (
    latinLookalikes(String(s ?? ''))
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      // Апостроф снимаем сразу, как и norm(): иначе «one's» стало бы «1's».
      .replace(/[\u2018\u2019\u02BC\u00B4`']/g, '')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\bokay\b/g, 'ok')
      .replace(/\b(?:a|one) hundred\b/g, '100')
      .replace(NUMBER_RE, (w) => String(NUMBER_WORDS.indexOf(w)))
      // Три и больше одиночных букв подряд — имя по буквам, это одно слово.
      .replace(/\b[a-z](?:[\s.,;:!?-]+[a-z]\b){2,}/g, (m) => m.replace(/[^a-z]/g, ''))
  )
}

/**
 * Сверка диктанта. Ревью 08.10.2026: прежняя norm() браковала верную запись
 * услышанного — «Iʼm» с U+02BC, «cafes», «Okay», «9», «Taylor» за
 * «T A Y L O R», «underexplored». Стяжение и полная форма («I am» за «I'm»)
 * по-прежнему разные ответы: так закреплено в tests/listening-engine.spec.js,
 * и задание учит слышать именно слитную речь — менять только с решения
 * владельца.
 */
export function dictationMatches(response, answer) {
  const r = dictationForm(response)
  const a = dictationForm(answer)
  // Прежняя мягкость остаётся: апостроф и пунктуация не важны («Its friendlier»).
  if (norm(r) === norm(a)) return true
  // Слитно или через дефис: under-explored = underexplored. Только между
  // буквами: twenty-five → «20-5» не должно стать «205».
  const joined = (s) => norm(s.replace(/([a-z])-(?=[a-z])/g, '$1'))
  return joined(r) === joined(a)
}

// Validate a user's response for a task. Returns { ok, heard } where `heard`
// is the correct answer text (for feedback on a wrong answer).
export function checkAnswer(task, response) {
  switch (task.type) {
    case 'listen_choice':
      return { ok: response === task.answer, heard: task.answer }
    case 'listen_assemble': {
      const chosen = Array.isArray(response) ? response.join(' ') : String(response)
      return { ok: norm(chosen) === norm((task.tokens || []).join(' ')), heard: task.text }
    }
    case 'listen_type':
      return { ok: dictationMatches(response, task.answer), heard: task.answer }
    default:
      return { ok: false, heard: task.answer || '' }
  }
}

// Compose the feedback body (may contain <b> from `explanation`). UI strings
// come from the caller's t() (i18n.jsx) — the engine keeps no dictionary of
// its own; `explanation` and `prompt` are content data and stay as authored.
export function feedbackBody(task, ok, requeued, t) {
  const exp = task.explanation || ''
  if (ok) return exp || t('listening.fbNice')
  let prefix = ''
  if (task.type === 'listen_choice') prefix = t('listening.fbAnswer', { answer: task.answer })
  else if (task.type === 'listen_assemble') prefix = t('listening.fbHeard', { text: task.text })
  else if (task.type === 'listen_type') prefix = t('listening.fbHeardType', { answer: task.answer })
  let body = prefix + exp
  if (requeued) body += ' ' + t('listening.fbRetry')
  return body.trim()
}

// Heading shown above each task type (matches the trainer designs).
export function headingFor(task, t) {
  if (task.type === 'listen_assemble') return t('listening.headAssemble')
  if (task.type === 'listen_type') return t('listening.headType')
  return task.prompt || t('listening.headDefault')
}
