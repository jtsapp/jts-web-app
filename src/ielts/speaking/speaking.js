// Speaking: чистые функции заданий и ответов. Тайминги — экзаменационные (ТЗ §15):
// Part 1 — короткие ответы, Part 2 — минута подготовки и до двух минут монолога, Part 3 — развёрнутые ответы.

export const SPEAKING_CRITERIA = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']

export const TIMING = {
  part1: { answerSec: 45 },
  part2: { prepSec: 60, answerSec: 120, minSec: 60, followUpSec: 30 },
  part3: { answerSec: 75 },
}

/** Вопросы, на которые отвечают: у Part 2 — сама карточка (id задания), как у бэкенда (speakingQuestions). */
export function speakingQuestions(doc) {
  if (!doc) return []
  if (doc.kind === 'part2') return [{ id: doc.id, question: doc.cue, bullets: doc.bullets || [], followUp: doc.followUp }]
  return (doc.questions || []).map((q) => ({ id: q.id, question: q.question, followUp: q.followUp }))
}

export const speakingTasks = (items, kind) => (items || []).filter((t) => t.kind === kind)

export function speakingSummary(items) {
  const sum = (list) => ({ total: list.length, done: list.filter((t) => t.attemptCount > 0).length })
  return { part1: sum(speakingTasks(items, 'part1')), part2: sum(speakingTasks(items, 'part2')), part3: sum(speakingTasks(items, 'part3')), shadowing: sum(speakingTasks(items, 'shadowing')) }
}

/** Темп речи: слов в минуту по стенограмме и длительности ответа. Пустой ответ — null, а не 0. */
export function wordsPerMinute(transcript, durationSec) {
  const words = String(transcript || '').trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  if (!words || !durationSec || durationSec < 3) return null
  return Math.round((words / durationSec) * 60)
}

/** Общий band Speaking: среднее имеющихся критериев (без произношения — трёх), .25 и .75 вверх. Как у бэкенда. */
export function speakingBand(criteria) {
  const v = SPEAKING_CRITERIA.map((k) => criteria?.[k]).filter((x) => x != null).map(Number)
  if (v.length < 3 || v.some((x) => !Number.isFinite(x))) return null
  return Math.floor((v.reduce((a, b) => a + b, 0) / v.length) * 2 + 0.5) / 2
}

/** Произношение по Azure: accuracy ответов, взвешенная по длительности, → band (0–100 → 0–9, шаг 0.5). */
export function pronunciationBand(results) {
  let w = 0
  let sum = 0
  for (const r of results || []) {
    if (!r || r.mock || !Number.isFinite(r.accuracy) || !(r.durationSec > 0)) continue
    sum += r.accuracy * r.durationSec
    w += r.durationSec
  }
  if (!w) return null
  return Math.max(0, Math.min(9, Math.round(((sum / w) / 100) * 9 * 2) / 2))
}

export function formatSec(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
