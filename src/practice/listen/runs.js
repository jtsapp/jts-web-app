// Прогоны набора Just to Listen — как levelScreen() и start() прототипа: части
// урока, урок-повторение, «Повторить юнит», тест уровня. Случайность приходит
// аргументом (rnd), чтобы прогон воспроизводился в тестах.

import { containsTarget } from './compare.js'

export const PART = 12
export const TEST_SIZE = 20
export const UNIT_REVIEW_SIZE = 15
export const REVIEW_LESSON_SIZE = 20

/** Урок длиннее PART слов — на части поровну (как parts() прототипа). */
export function parts(w) {
  const n = Math.ceil(w.length / PART)
  if (n <= 1) return [w]
  const size = Math.ceil(w.length / n)
  const out = []
  for (let i = 0; i < w.length; i += size) out.push(w.slice(i, i + size))
  return out
}

export function shuffle(a, rnd = Math.random) {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export const sample = (a, n, rnd = Math.random) => shuffle(a, rnd).slice(0, n)

export const setWords = (set) => set.units.flatMap((u) => u.lessons.flatMap((l) => l.w))

/**
 * Прогоны набора. Run: { key, kind: 'test'|'unit'|'lesson'|'review', u?, l?, part?, parts?, title, words, size? }.
 * size — сколько слов взять случайно (тесты и повторения); без него — все слова части.
 */
export function buildRuns(set) {
  const all = set.units.flatMap((u) => u.lessons)
  const test = { key: `${set.id}-T`, kind: 'test', title: set.name, words: setWords(set), size: TEST_SIZE }
  const units = set.units.map((u) => {
    const words = u.lessons.flatMap((l) => l.w)
    const review = words.length
      ? { key: `${set.id}-U${u.u}`, kind: 'unit', u: u.u, title: u.title || '', words, size: UNIT_REVIEW_SIZE }
      : null
    return { u: u.u, title: u.title || '', review, lessons: u.lessons.map((l) => lessonRuns(set.id, all, l)) }
  })
  return { test, units }
}

function lessonRuns(setId, all, l) {
  const base = { l: l.l, t: l.t, g: l.g || '', words: l.w }
  if (!l.w.length) {
    // Пустой урок — повторение: пул уроков после прошлого повторения.
    const idx = all.indexOf(l)
    let from = idx - 1
    while (from >= 0 && all[from].w.length) from--
    const pool = all.slice(from + 1, idx).flatMap((x) => x.w)
    const run = { key: `${setId}-L${l.l}-R`, kind: 'review', l: l.l, title: l.t, words: pool, size: REVIEW_LESSON_SIZE }
    return { ...base, review: true, fromL: all[from + 1]?.l, toL: all[idx - 1]?.l, runs: [run] }
  }
  const ps = parts(l.w)
  const runs = ps.map((p, pi) => ({
    key: `${setId}-L${l.l}-${pi}`, kind: 'lesson', l: l.l, part: pi, parts: ps.length, title: l.t, words: p,
  }))
  return { ...base, review: false, runs }
}

/**
 * Карточки прогона, как start() прототипа: перемешаны, лишние варианты
 * предложения без целевого слова отброшены (первый — звучит — остаётся всегда).
 */
export function makeDeck(entries, rnd = Math.random) {
  return shuffle(entries, rnd).map(([en, ru, exEn, exRu, note]) => {
    const word = String(en).trim()
    const variants = String(exEn || '').split('||').map((s) => s.trim())
    return {
      en: word,
      ru: String(ru || '').trim(),
      exEn: variants.filter((s, i) => s && (i === 0 || containsTarget(s, word))).join('||'),
      exRu: String(exRu || '').trim(),
      note: String(note || '').trim(),
    }
  })
}

export function runDeck(run, rnd = Math.random) {
  return makeDeck(run.size ? sample(run.words, run.size, rnd) : run.words, rnd)
}

/** «Свой список» преподавателя: строка «english - русский - sentence - предложение». */
export function parseOwnList(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.split(/\s+[-–—]\s+|\t/).map((s) => s.trim()))
    .filter((r) => r[0] && r[1])
}
