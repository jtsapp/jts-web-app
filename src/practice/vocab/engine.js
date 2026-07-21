import { shuffle } from './vocabData.js'

// Двухэтапный движок Словаря — порт из public/vocab/index.html.
// Этап 1 (COLLECT): листаем N премиальных карточек, отмечая «знаю / не знаю».
// Этап 2 (LEARN): адаптивный поток заданий; незнакомые и ошибочные слова
// возвращаются чаще и в большем числе форматов, пока не будут освоены.

export const COLLECT_N = { 5: 6, 15: 18, 30: 32 }
export const collectCount = (goalMin) => COLLECT_N[goalMin] || 18

// Личный набор: сначала невиданные, затем просроченные повторы, затем остальные.
export function pickCollectWords(scope, srs, n) {
  const now = Date.now()
  const fresh = scope.filter((w) => !srs[w.id])
  const seen = scope.filter((w) => srs[w.id])
  const due = seen.filter((w) => srs[w.id].due <= now)
  const rest = seen.filter((w) => !due.includes(w))
  let list = shuffle(fresh).concat(shuffle(due)).concat(shuffle(rest)).slice(0, n)
  if (list.length < n) list = scope.slice(0, n)
  return shuffle(list)
}

// Этап 2 тренирует ТОЛЬКО слова, отмеченные «не знаю». Если знакомы все —
// лёгкое повторение всего набора, чтобы сессия всё равно состоялась.
export function buildLearn(collected) {
  let picked = collected.filter((c) => !c.known)
  const reviewAll = picked.length === 0
  if (reviewAll) picked = collected.slice()
  const items = picked.map((c) => ({
    w: c.w,
    known: reviewAll ? !!c.known : false,
    strength: reviewAll && c.known ? 2 : 0,
    reps: 0,
    wrong: 0,
  }))
  return { items, buf: [], lastType: null, lastId: null, since: 99, challengeDone: false, count: 0 }
}

export const learnTarget = (i) => (i.known ? 2 : 3) // верных повторов до освоения
export const isMastered = (i) => i.strength >= learnTarget(i) || i.reps >= 6
export const masteredCount = (L) => L.items.filter(isMastered).length
export const learnDone = (L) => L.items.every(isMastered)
export const progressPct = (L) =>
  !L || !L.items.length ? 0 : (masteredCount(L) / L.items.length) * 100

// Свернуть буфер оценок (накопленный за задание) в силу слов.
export function processBuf(L) {
  const b = L.buf
  L.buf = []
  const agg = {}
  b.forEach((x) => {
    if (!(x.id in agg)) agg[x.id] = x.ok
    else if (!x.ok) agg[x.id] = false
  })
  Object.keys(agg).forEach((id) => {
    const it = L.items.find((i) => String(i.w.id) === String(id))
    if (!it) return
    it.reps++
    if (agg[id]) it.strength++
    else {
      it.strength = Math.max(0, it.strength - 1)
      it.wrong++
    }
  })
}

export const REC_TYPES = ['imagepick', 'choose', 'listen', 'defmatch']
export const MID_TYPES = ['context', 'construct', 'dragmatch', 'swipe', 'scramble', 'match']
export const PRO_TYPES = ['context', 'scramble', 'collocation', 'dialogue', 'pronounce', 'trace']

const poolForStrength = (s) =>
  s <= 0 ? REC_TYPES.slice() : s === 1 ? REC_TYPES.concat(MID_TYPES) : MID_TYPES.concat(PRO_TYPES)

// Следующее задание: самое слабое слово, тип по силе, без повтора прошлого типа.
// Раз в ~3 задания подмешиваем групповую механику (memory/match/dragmatch).
export function nextTask(L) {
  const all = L.items.map((i) => i.w)
  const active = L.items.filter((i) => !isMastered(i))
  const cand = active
    .slice()
    .sort((a, b) => a.strength - b.strength || a.reps - b.reps || (Math.random() < 0.5 ? -1 : 1))
  const target = cand.find((i) => i.w.id !== L.lastId) || cand[0] || L.items[0]
  const w = target.w
  const types = poolForStrength(target.strength).filter((ty) => ty !== L.lastType)
  let type
  const enough = L.items.length >= 3
  if (enough && L.since >= 3 && Math.random() < 0.5) {
    type = shuffle(['memory', 'match', 'dragmatch'])[0]
    L.since = 0
  } else {
    type = shuffle(types)[0] || 'choose'
    L.since++
  }
  let task
  if (type === 'memory' || type === 'match') {
    task = { type, pool: shuffle(all).slice(0, Math.min(4, all.length)), w }
  } else if (type === 'dragmatch') {
    task = { type, pool: shuffle(all).slice(0, Math.min(3, all.length)), w }
  } else if (type === 'collocation' && !(w.ph && w.ph.split(' ').length >= 2)) {
    type = 'context'
    task = { type, w, pool: all }
  } else {
    task = { type, w, pool: all }
  }
  L.lastType = type
  L.lastId = w.id
  L.count++
  return task
}

// N отвлекающих вариантов из набора (или из всей выборки, если набор мал).
export function distractors(w, n, pool, scope) {
  const src = (pool && pool.length >= n + 1 ? pool : scope).filter((x) => x.id !== w.id)
  return shuffle(src).slice(0, n)
}

export const mmss = (s) => {
  s = Math.max(0, s | 0)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
