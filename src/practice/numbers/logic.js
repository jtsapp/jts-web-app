// «Числа» (Dexter's Number World): чистая логика игры, вынесенная из движка
// прототипа (data/jtsnumbers.html) ради тестов. Ни DOM, ни хранилища, ни
// звука; случайность приходит аргументом `rnd`.
//
// Задание — массив прототипа:
//   [say, answer, distractor1, distractor2, feedback, 'L'|'R', label, cue, topic, mode, rate]
// 'L' — на слух: Декстер слышит `say`; 'R' — на чтение: показан `cue`, на
// островах слова. topic/mode/rate дописывает сборка раунда.

export const GEN_ROUND = 16          // заданий в раунде босса и Lab
export const PASS = { topic: 0.7, boss: 0.8 }

const BOSS_SRC = {
  boss1: ['basic', 'teens', 'ordinals', 'phone', 'time', 'money'],
  boss2: ['dates', 'hundreds', 'measure', 'money'],
  boss3: ['fractions', 'maths', 'big', 'reallife'],
}

export function shuffle(a, rnd = Math.random) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const itemL = (say, a, d1, d2, fb) => [say, a, d1, d2, fb || '', 'L']
const tag = (it, src) => { const c = it.slice(); c[8] = src; return c }

/**
 * Раунды боссов и Listening Lab — из банков тем, как их собирает прототип
 * (плюс собственные задания из `rounds` раздела). Босс — только звук во всех
 * раундах и быстрее тем (0.85): так обещают объяснения.
 */
export function withGeneratedTours(sections, topicTours) {
  const tours = { ...topicTours }
  const listenItems = (ids, from, to) => ids.flatMap((id) => (tours[id] || []).slice(from, to)
    .flatMap((t) => t.items.filter((it) => it[5] === 'L').map((it) => tag(it, id))))
  const own = (s) => s.rounds.map((r) => tag(itemL(r[0], r[1], r[2], r[3], r[4]), s.id))
  for (const s of sections.filter((x) => x.boss)) {
    const src = BOSS_SRC[s.id] || []
    tours[s.id] = [
      { name: 'Sound only', goal: 'Numbers from every topic of this world. No words on screen.', hear: 'listen', rate: 0.95, own: own(s), items: listenItems(src, 0, 2) },
      { name: 'Faster', goal: 'Rules and sentences from the whole world, a little faster.', hear: 'listen', rate: 1.05, items: listenItems(src, 2, 4) },
      { name: 'Full speed', goal: 'The hardest items, at full speed.', hear: 'listen', rate: 1.15, items: listenItems(src, 4, 5) },
    ]
  }
  const all = sections.filter((s) => !s.boss && !s.lab).map((s) => s.id)
  const short = (it) => it[0].split(' ').length <= 5
  const lab = sections.find((s) => s.lab)
  if (lab) {
    tours.lab = [
      { name: 'Short and clear', goal: 'Short items from every world, spoken slowly.', hear: 'listen', rate: 0.85, own: own(lab), items: listenItems(all, 0, 2).filter(short) },
      { name: 'Normal speed', goal: 'Short items at the speed of real speech.', hear: 'listen', rate: 1.0, items: listenItems(all, 2, 5).filter(short) },
      { name: 'Speed ramp', goal: 'Every item a little faster than the one before.', hear: 'listen', ramp: true, items: listenItems(all, 3, 5) },
    ]
  }
  return tours
}

/** Ключ задания для «уже было»: что звучит/показано → ответ. */
export const itemKey = (it) => (it[7] || it[0]) + '→' + it[1]

/**
 * Задания одной игры раунда. Тема играет все задания группы в новом порядке;
 * босс и Lab — сначала свои задания, потом 16 наименее показанных, вперемешку
 * по темам и без повторов ответа. Режим: 'listen' — только звук, 'show' — слово
 * на экране и звук, 'mix' — первая половина со словами, дальше только звук.
 */
export function buildRound(section, group, seen = {}, rnd = Math.random) {
  let picked
  if (section.boss || section.lab) {
    picked = (group.own || []).slice(0, GEN_ROUND)
    const answers = new Set(picked.map((it) => it[1]))
    const used = new Set(picked.map(itemKey))
    let pool = shuffle(group.items, rnd).sort((a, b) => (seen[itemKey(a)] || 0) - (seen[itemKey(b)] || 0))
    const by = {}
    pool.forEach((it) => (by[it[8]] = by[it[8]] || []).push(it))
    const srcs = shuffle(Object.keys(by), rnd)
    pool = []
    let more = true
    while (more) {
      more = false
      for (const t of srcs) { const x = by[t].shift(); if (x) { pool.push(x); more = true } }
    }
    for (const it of pool) {
      if (picked.length >= GEN_ROUND) break
      if (used.has(itemKey(it)) || answers.has(it[1])) continue
      picked.push(it); used.add(itemKey(it)); answers.add(it[1])
    }
    picked = shuffle(picked, rnd)
  } else picked = shuffle(group.items, rnd)
  return picked.map((it, j) => {
    const c = it.slice()
    c[9] = group.hear === 'listen' ? 'listen' : group.hear === 'mix' ? (j < Math.ceil(picked.length / 2) ? 'show' : 'listen') : 'show'
    c[10] = group.ramp ? 'ramp' : (group.rate || 0.85)
    return c
  })
}

/** Темп i-го задания: в «нарастании» каждое чуть быстрее предыдущего. */
export function rateFor(item, i) {
  return item[10] === 'ramp' ? Math.min(1.0 + i * 0.02, 1.3) : (item[10] || 0.85)
}

/**
 * Где стоит правильный остров: каждый слот (лево/центр/право) — поровну (±1)
 * и никогда три раза подряд.
 */
export function positionPlan(n, rnd = Math.random) {
  const base = []
  const start = Math.floor(rnd() * 3)
  for (let i = 0; i < n; i++) base.push((start + i) % 3)
  for (let t = 0; t < 500; t++) {
    const p = shuffle(base, rnd)
    let ok = true
    for (let i = 2; i < n; i++) if (p[i] === p[i - 1] && p[i] === p[i - 2]) { ok = false; break }
    if (ok) return p
  }
  return base
}

/* Что произносится. Метки ударения опускаются (thirTEEN, THIRty → thirteen,
   thirty), имена — нет (May, Kazakhstan); пояснения в скобках не читаются. */
const stressMark = (t) => /[a-z]/.test(t) && (/[a-z][A-Z]/.test(t) || (t.match(/[A-Z]/g) || []).length > 1)
export function sayText(w) {
  return String(w).replace(/\s*\([^)]*\)/g, '').split(' ').map((t) => (stressMark(t) ? t.toLowerCase() : t)).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Что Декстер говорит после прыжка. Задание на слух — свой текст. Задание на
 * чтение — правильный ответ: пропуск заполняется целой фразой («How much are
 * these shoes?»), цифра, которую подсказка пишет словами, — словами подсказки
 * (21st → «twenty-first»), иначе сам ответ.
 */
export function spokenOf(it) {
  if (it[5] !== 'R') return it[0]
  const a = it[1], cue = it[7]
  if (it[0] !== a) return it[0]                                   // явный `say`
  if (cue.includes('___')) return sayText(cue.replace('___', a))
  if (/\d/.test(a) && !/\d/.test(cue)) return sayText(cue)
  return sayText(a)
}

/** Пример объяснения [цифра, слова]; строки '?'/'✓' — реплики диалога, читаются как есть. */
export const exSay = ([f, t]) => (/^[?✓]$/.test(f) ? t : sayText(t))

/**
 * Итог прыжка на верный остров. Чисто — без ошибок и без подсказки на слух:
 * 3 кристалла (+1 с третьего подряд, +2 с шестого), балл 1. С подсказкой — 2
 * кристалла и 0.75; после одной ошибки — 1 и 0.5; после двух (остров
 * подсвечен) — 0.
 */
export function jumpOutcome({ attempts, shown, mode, revealed, combo }) {
  if (revealed) return { kind: 'miss', gain: 0, score: 0, combo: 0 }
  const clean = attempts === 0 && !(shown && mode === 'listen')
  if (clean) {
    const c = combo + 1
    return { kind: 'gold', gain: 3 + (c >= 6 ? 2 : c >= 3 ? 1 : 0), score: 1, combo: c }
  }
  return { kind: 'silver', gain: attempts === 0 ? 2 : 1, score: attempts === 0 ? 0.75 : 0.5, combo: 0 }
}

export const passMark = (section) => (section.boss ? PASS.boss : PASS.topic)
export const starsFor = (acc, passed) => (passed ? (acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : 1) : 0)
