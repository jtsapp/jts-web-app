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
/**
 * Самая медленная бегущая строка: 225 слов (потолок текста) на 75 сл/мин — ровно 3 минуты, потолок записи (Д15).
 * Основа «1x» — темп образца, и у медленного голоса 0,5x ушло бы ниже 75: конец текста не влез бы в запись.
 */
export const MIN_WPM = 75

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

/** Темп скорости: основа (темп образца или 150) × множитель, целым — как SR.wpm прототипа; не ниже MIN_WPM. */
export function speedWpm(base, mult) {
  return Math.max(MIN_WPM, Math.round((base > 0 ? base : BASE_WPM) * mult))
}

/* ---- числа цифрами в распознанном тексте ----
   Распознавание (Azure в /api/transcribe, Web Speech в Chrome) пишет числа цифрами: «four hundred and twelve»
   приходит как «412», «seven» — как «7». Слово текста с цифрой из распознанного не совпадёт, и верно прочитанные
   числа оставались бы серыми — до 5–9 % слов в текстах с числами, звезда. Поэтому после числа из распознанного
   дописываем его словами (британская запись, с «and»), а сами цифры оставляем первыми: в тексте бывает и «Flight
   512». Лишние слова выравнивание переживает — оно ищет слово текста среди пяти следующих услышанных. */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]

function below100(n) {
  if (n < 20) return [ONES[n]]
  // «twenty-five» в тексте — одно слово с дефисом (srNorm склеит его в twentyfive)
  return [TENS[Math.floor(n / 10)] + (n % 10 ? ONES[n % 10] : '')]
}
function below1000(n, tail) {
  const out = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) out.push(ONES[h], 'hundred')
  if (r) {
    if (h || tail) out.push('and')
    out.push(...below100(r))
  }
  return out
}
/** Целое словами: 412 → four hundred and twelve, 12000000 → twelve million. */
export function numberWords(n) {
  if (!Number.isSafeInteger(n) || n < 0) return []
  if (n === 0) return ['zero']
  const out = []
  let rest = n
  for (const [size, name] of SCALES) {
    if (rest >= size) {
      out.push(...below1000(Math.floor(rest / size), false), name)
      rest %= size
    }
  }
  if (rest) out.push(...below1000(rest, out.length > 0))
  return out
}

/** Распознанные слова с числами, дописанными словами (цифры остаются на своём месте). */
export function expandHeard(heard) {
  const out = []
  for (const w of heard || []) {
    out.push(w)
    const t = String(w).replace(/^[^\d-]+|[^\d]+$/g, '')
    let m
    if ((m = /^(-?)(\d{1,3}(?:,\d{3})+|\d+)$/.exec(t))) {
      const n = Number(m[2].replace(/,/g, ''))
      if (n <= 999999999999) out.push(...(m[1] ? ['minus'] : []), ...numberWords(n))
    } else if ((m = /^(\d{1,2}):(\d{2})$/.exec(t))) {
      const h = Number(m[1])
      const min = Number(m[2])
      out.push(...numberWords(h), ...(min ? numberWords(min) : ["o'clock"]))
    }
  }
  return out
}

/** Выравнивание с числами словами — им считают и итог, и живую подсветку. */
export function alignHeard(words, heard) {
  return srAlign(words, expandHeard(heard))
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
