// Чистые правила Скорочтения — перенос из прототипа кабинета (data/jts-student-cabinet.html: srWords, srNorm,
// srAlign, формулы экрана итога и подписи скорости). Сверяются с оракулом самого прототипа
// (__fixtures__/oracle.json, rules.test.js): красный тест — порт разъехался с исходником.
//
// Отличие от прототипа одно: основа темпа «1x» — не только 150 сл/мин, а темп записанного образца
// (sample.wpm), когда он есть. Образец играет со скоростью mult, и телесуфлёр на той же скорости должен ехать
// вровень с ним — иначе «читай как образец» расходилось бы с бегущей строкой.

/** Скорости — множитель к темпу диктора; ровно эти семь (ТЗ §4.1). */
export const SPEEDS = [0.5, 0.7, 1, 1.5, 2, 2.5, 3]
/** 1x ≈ 150 слов в минуту — естественная речь носителя (прототип). */
export const BASE_WPM = 150
/** Телесуфлёр останавливает запись сам через 2,5 с после конца текста (srRecord прототипа). */
export const AUTO_STOP_MS = 2500

export const srWords = (s) => String(s || '').split(/\s+/).filter(Boolean)
export const srNorm = (w) => String(w).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '')

/**
 * Жадное выравнивание прочитанного с текстом: слово текста засчитано, если среди следующих пяти услышанных
 * есть оно же (или у слов длиннее четырёх букв совпали первые четыре). Перенос srAlign дословно.
 * @param {string[]} words  слова текста
 * @param {string[]} heard  что распознано
 * @returns {boolean[]}
 */
export function srAlign(words, heard) {
  const W = words.map(srNorm)
  const Hh = (heard || []).map(srNorm).filter(Boolean)
  const ok = new Array(W.length).fill(false)
  let j = 0
  for (let i = 0; i < W.length && j < Hh.length; i++) {
    if (!W[i]) {
      ok[i] = true
      continue
    }
    for (let k = j; k < Math.min(Hh.length, j + 5); k++) {
      if (Hh[k] === W[i] || (W[i].length > 4 && Hh[k].slice(0, 4) === W[i].slice(0, 4))) {
        ok[i] = true
        j = k + 1
        break
      }
    }
  }
  return ok
}

/** Звёзды экрана итога: ≥85 % — 3, ≥60 % — 2, ≥30 % — 1. null — оценки нет. */
export function starsOf(pct) {
  if (pct == null) return null
  return pct >= 85 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0
}

/**
 * Процент, звёзды и свой темп — формулы srResultView. read == null — распознавания не было вовсе. Нулевой
 * темп прототип не показывает (`realWpm ? … : ''`) — здесь это null, его же получает и бэкенд.
 * @param {{ read: number|null, words: number, dur: number }} tr
 */
export function resultOf({ read, words, dur }) {
  const pct = read != null ? Math.round((read / words) * 100) : null
  const wpm = (read != null && dur && Math.round((read / dur) * 60)) || null
  return { pct, stars: starsOf(pct), wpm }
}

/** Темп скорости: основа (темп образца или 150) × множитель, целым — как SR.wpm прототипа. */
export function speedWpm(base, mult) {
  return Math.round((base > 0 ? base : BASE_WPM) * mult)
}

/** «≈ N секунд» подписи скорости. */
export function paceSeconds(words, wpm) {
  return Math.round((words / wpm) * 60)
}

/** Сколько едет текст телесуфлёра, мс (total в srRecord). */
export function scrollMs(words, wpm) {
  return (words / wpm) * 60 * 1000
}

/**
 * Индекс слова текста, которое звучит в момент t записи образца. Разметка образца — по слову на каждый
 * пробельный кусок текста (src/lib/speedReading/sample.js); если длины разошлись (текст поправили после
 * синтеза, разметка старая) — индекс переносится пропорционально, чтобы подсветка не вставала.
 * @param {[string, number, number][]} timings
 * @param {number} t  секунды
 * @param {number} n  слов в тексте на экране
 */
export function sampleIndexAt(timings, t, n) {
  if (!Array.isArray(timings) || !timings.length) return 0
  let lo = 0
  let hi = timings.length - 1
  let k = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (timings[mid][1] <= t) {
      k = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (n === timings.length) return k
  return Math.min(n - 1, Math.max(0, Math.round((k * (n - 1)) / Math.max(1, timings.length - 1))))
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** Попыток сегодня (по местной дате устройства) — строка «Попыток сегодня» стартового экрана. */
export function todayCount(attempts, now = new Date()) {
  const today = dayKey(now)
  let n = 0
  for (const a of attempts || []) {
    if (!a?.createdAt) continue
    const d = new Date(a.createdAt)
    if (!Number.isNaN(d.getTime()) && dayKey(d) === today) n++
  }
  return n
}
