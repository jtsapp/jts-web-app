'use client'

// Прогресс воркбука. Перенос S.prog/S.miss/S.sc из data/jtsworkbook-a0.html
// (award :6336, missKeys :5101, selfCheck в renderWrap :6416): экран либо
// пройден, либо нет — баллы не копятся; промахи запоминаются поимённо и
// возвращаются в «Разборе ошибок»; самопроверка в конце урока — три галочки.
//
// Ключ и событие — общие из practiceKeys.js; стейт целиком уезжает на сервер
// через pushModule('workbook', …) — семантика replace, см. practiceContract.js.
// Множество ОТКРЫТЫХ УРОВНЕЙ живёт отдельно (workbooksProgress.js): на нём
// висит квота PRACTICE_WORKBOOKS, и единицу её учёта менять нельзя.

import { WORKBOOK_KEY as KEY, WORKBOOK_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'

/** Ключ экрана: уровень отделён от урока, чтобы уровни не перетирали друг друга. */
export function actKey(level, n, i) {
  return level + ':' + n + '.' + i
}

function scKey(level, n, k) {
  return level + ':' + n + '.sc' + k
}

function obj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

export function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return { prog: obj(val.prog), miss: obj(val.miss), sc: obj(val.sc) }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return { prog: {}, miss: {}, sc: {} }
}

function writeState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
  pushModule('workbook', state)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

/**
 * Экран закрыт. Порт award(): «пройден» — это факт, а не балл, поэтому в prog
 * кладётся единица. Промахи перезаписываются целиком: пересдача экрана без
 * ошибок обязана убрать его из разбора, а не оставить старый список.
 *
 * Исключение — зачётный урок юнита (A2/B1/B2): у него есть отметка, значит
 * кроме факта надо помнить, сколько пунктов взято с первой попытки. Тогда в
 * prog ложится {d:1, c:<верных>}. Обычные экраны остаются единицей: за ними
 * баллов нет и заводить их не надо.
 */
export function markAct(level, n, i, missed, score) {
  const state = readState()
  const k = actKey(level, n, i)
  state.prog[k] = score == null ? 1 : { d: 1, c: Math.max(0, score) }
  if (missed && missed.length) state.miss[k] = missed.slice()
  else delete state.miss[k]
  writeState(state)
}

/** Верных с первой попытки на экране; у обычных экранов счёта нет. */
export function actRight(level, n, i, state) {
  const v = (state || readState()).prog[actKey(level, n, i)]
  return v && typeof v === 'object' ? Number(v.c) || 0 : 0
}

/**
 * Отметка за зачётный урок. Порт renderTestResult (:13847): счёт — сумма
 * верных по экранам, максимум — сумма пунктов, порог 70 %. Экраны без items
 * (объяснение, образец) в максимум не идут — их не за что оценивать.
 */
export function testScore(lesson, level, state) {
  const st = state || readState()
  let got = 0
  let total = 0
  lesson.acts.forEach((a, i) => {
    got += actRight(level, lesson.n, i, st)
    const task = a.task || a
    total += (task.items || []).length
  })
  const need = Math.ceil(total * 0.7)
  return { got, total, need, pass: total > 0 && got >= need }
}

/** Пересдача зачёта: урок очищается целиком — и отметки, и разбор ошибок. */
export function clearLesson(level, n, total) {
  const state = readState()
  for (let i = 0; i < total; i++) {
    const k = actKey(level, n, i)
    delete state.prog[k]
    delete state.miss[k]
  }
  writeState(state)
}

export function actPassed(level, n, i, state) {
  return !!(state || readState()).prog[actKey(level, n, i)]
}

/** Сколько экранов урока пройдено. */
export function lessonDone(level, n, total, state) {
  const st = state || readState()
  let c = 0
  for (let i = 0; i < total; i++) if (st.prog[actKey(level, n, i)]) c++
  return c
}

/** Первый непройденный экран урока — с него продолжаем. */
export function firstOpen(level, n, total, state) {
  const st = state || readState()
  for (let i = 0; i < total; i++) if (!st.prog[actKey(level, n, i)]) return i
  return 0
}

/**
 * Урок, к которому вести студента: первый недопройденный по порядку.
 * counts — {номер урока: сколько экранов}.
 */
export function nextLesson(level, nums, counts, state) {
  const st = state || readState()
  for (const n of nums) if (lessonDone(level, n, counts[n], st) < counts[n]) return n
  return nums[0]
}

/** Доля пройденных экранов уровня в процентах. */
export function levelProgress(level, counts, state) {
  const st = state || readState()
  let done = 0
  let total = 0
  for (const n of Object.keys(counts)) {
    total += counts[n]
    done += lessonDone(level, n, counts[n], st)
  }
  return total ? Math.round((done / total) * 100) : 0
}

/* ── Разбор ошибок ─────────────────────────────────────────────────────── */
/** Экраны с незакрытыми промахами, в порядке возрастания урока и экрана. */
export function missKeys(level, state) {
  const st = state || readState()
  const pre = level + ':'
  return Object.keys(st.miss)
    .filter((k) => k.startsWith(pre) && st.miss[k] && st.miss[k].length)
    .sort((a, b) => {
      const pa = a.slice(pre.length).split('.').map(Number)
      const pb = b.slice(pre.length).split('.').map(Number)
      return pa[0] - pb[0] || pa[1] - pb[1]
    })
}

export function missCount(level, state) {
  const st = state || readState()
  return missKeys(level, st).reduce((c, k) => c + st.miss[k].length, 0)
}

export function missFor(level, n, i, state) {
  return (state || readState()).miss[actKey(level, n, i)] || []
}

/**
 * Итог пересдачи в разборе. Порт кнопки «дальше» из renderReview: остаются
 * только те промахи, что провалены СНОВА, и обязательно в исходных индексах —
 * разбор показывает подмножество пунктов, и его нумерация своя.
 */
export function resolveMiss(level, n, i, stillWrong) {
  const state = readState()
  const k = actKey(level, n, i)
  const orig = state.miss[k] || []
  const keep = (stillWrong || []).map((m) => orig[m]).filter((x) => x !== undefined)
  if (keep.length) state.miss[k] = keep
  else delete state.miss[k]
  writeState(state)
}

/* ── Самопроверка в конце урока ────────────────────────────────────────── */
export function selfCheck(level, n, k, state) {
  return !!(state || readState()).sc[scKey(level, n, k)]
}

export function toggleSelfCheck(level, n, k) {
  const state = readState()
  const key = scKey(level, n, k)
  if (state.sc[key]) delete state.sc[key]
  else state.sc[key] = 1
  writeState(state)
  return !!state.sc[key]
}

export const WORKBOOK_PROGRESS_EVENT = EVENT
