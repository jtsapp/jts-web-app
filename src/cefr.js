// Адаптивный CEFR-движок: 2PL IRT + EAP по сетке.
// Портировано из референса JTS (jts-cefr-test), поля адаптированы под API
// /adaptive-test/questions (a, b, skill, level, options[{id,text}], correctOptionId).

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const CFG = { min: 10, max: 14, seTarget: 0.4 }

const GRID = []
for (let t = -4; t <= 4.0001; t += 0.1) GRID.push(+t.toFixed(2))

const p2pl = (t, a, b) => 1 / (1 + Math.exp(-a * (t - b)))

// Запасные IRT-параметры, если a/b не заданы в данных
const LEVEL_B = { A1: -2.5, A2: -1.5, B1: -0.5, B1plus: 0, B2: 0.5, B2plus: 1, C1: 1.5, C2: 2.5 }
const qa = (q) => (typeof q.a === 'number' && q.a > 0 ? q.a : 1)
const qb = (q) => (typeof q.b === 'number' ? q.b : LEVEL_B[q.level] ?? 0)

function makePosterior() {
  // log-приор N(0,2) — свободный, чтобы не зажимать крайние уровни
  return GRID.map((t) => (-0.5 * t * t) / 4)
}
function updatePost(post, q, correct) {
  const a = qa(q)
  const b = qb(q)
  for (let i = 0; i < GRID.length; i++) {
    const p = p2pl(GRID[i], a, b)
    post[i] += Math.log(Math.max(1e-9, correct ? p : 1 - p))
  }
}
function eap(post) {
  const m = Math.max(...post)
  let s = 0
  const w = post.map((l) => {
    const e = Math.exp(l - m)
    s += e
    return e
  })
  let mean = 0
  for (let i = 0; i < GRID.length; i++) mean += (GRID[i] * w[i]) / s
  let v = 0
  for (let i = 0; i < GRID.length; i++) v += (GRID[i] - mean) ** 2 * (w[i] / s)
  return { theta: mean, se: Math.sqrt(v) }
}
function pickNext(questions, theta, used, forceSkill) {
  let pool = questions.filter((q) => !used.has(q.id))
  if (forceSkill) {
    const f = pool.filter((q) => q.skill === forceSkill)
    if (f.length) pool = f
  }
  let best = null
  let bi = -1
  for (const q of pool) {
    const a = qa(q)
    const p = p2pl(theta, a, qb(q))
    const info = a * a * p * (1 - p) + Math.random() * 1e-4 // разрешение равенств
    if (info > bi) {
      bi = info
      best = q
    }
  }
  return best
}

export const bandOf = (t) =>
  t < -2 ? 'A1' : t < -1 ? 'A2' : t < 0 ? 'B1' : t < 1 ? 'B2' : t < 2 ? 'C1' : 'C2'
export const pctOf = (t) => Math.max(3, Math.min(97, ((t + 3) / 6) * 100))

export function createSession(questions) {
  const skills = [...new Set(questions.map((q) => q.skill))]
  return {
    questions,
    skills,
    post: makePosterior(),
    used: new Set(),
    responses: [],
    theta: 0,
    se: 1,
    n: 0,
    cur: null,
  }
}

export function isDone(s) {
  return s.n >= CFG.max || (s.n >= CFG.min && s.se < CFG.seTarget) || s.used.size >= s.questions.length
}

export function next(s) {
  if (isDone(s)) return null
  // первый проход: по одному вопросу каждого навыка для покрытия
  const force = s.n < s.skills.length ? s.skills[s.n] : null
  s.cur = pickNext(s.questions, s.theta, s.used, force)
  return s.cur
}

export function submit(s, q, chosenId) {
  const correct = chosenId === q.correctOptionId
  updatePost(s.post, q, correct)
  const est = eap(s.post)
  s.theta = est.theta
  s.se = est.se
  s.used.add(q.id)
  s.n++
  s.responses.push({ q, chosen: chosenId, correct, theta: s.theta })
  return correct
}

export function result(s) {
  const level = bandOf(s.theta)
  const correct = s.responses.filter((r) => r.correct).length
  return { level, correct, total: s.responses.length, theta: s.theta }
}
