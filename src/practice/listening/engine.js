// Listening trainer — pure session logic (no React, easy to unit-test).
// Ported faithfully from the source engine: norm() answer-normalization and
// mix() shuffle. Adds a compact linear "session" model (batch of tasks with a
// single requeue on a wrong answer) matching the Russian trainer designs.

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
      return { ok: norm(response) === norm(task.answer), heard: task.answer }
    default:
      return { ok: false, heard: task.answer || '' }
  }
}

// Compose the Russian feedback body (may contain <b> from `explanation`).
export function feedbackBody(task, ok, requeued) {
  const exp = task.explanation || ''
  if (ok) return exp || 'Отлично услышано.'
  let prefix = ''
  if (task.type === 'listen_choice') prefix = `Правильный ответ: <b>${task.answer}</b>. `
  else if (task.type === 'listen_assemble') prefix = `Вы услышали: «<b>${task.text}</b>». `
  else if (task.type === 'listen_type') prefix = `Вы услышали: <b>${task.answer}</b>. `
  let body = prefix + exp
  if (requeued) body += ' Это задание вернётся в конце.'
  return body.trim()
}

// Heading shown above each task type (matches the trainer designs).
export function headingFor(task) {
  if (task.type === 'listen_assemble') return 'Соберите предложение'
  if (task.type === 'listen_type') return 'Напишите, что вы услышали'
  return task.prompt || 'Что вы слышите?'
}
