// Темп ученика — методика Луны (ТЗ v2.0, 8.3): «уровень i+1: 3 ошибки подряд — шаг легче, всё верно быстро — сложнее»
// и «держать долю верных около 80 %: ниже — объяснение и упрощение, выше — усложнение». Спека — раздел 4.
//
// Считает код, а не модель: по последним ответам (журнал study_answer, последние 90 минут) — вердикт и вещь, к которой он
// относится. Что значит «проще» и «сложнее», тоже решает код (lines.js: правило той же темы или следующая тема
// программы) — модель только говорит, а адрес берёт из строки.

export const PACE = {
  windowMs: 90 * 60_000, // «сейчас» — последние полтора часа
  maxAnswers: 30,
  minAnswers: 8, // меньше — доля верных шумит
  streakWrong: 3,
  low: 0.7, // ниже — объяснение и упрощение
  high: 0.9, // от — усложнение (при быстрых ответах)
  fastMs: 10_000, // быстрый ответ — пауза с прошлого не больше
  fastShare: 0.6,
  streakFast: 8,
}

/**
 * @typedef {{ item: string, ok: boolean, gapMs?: number|null, at: number, title?: string|null }} Answer
 * @typedef {{ verdict: 'easier'|'harder'|'hold'|'none', why?: 'streak'|'low'|'high'|'fast', item?: string, title?: string|null,
 *             n: number, accuracy: number|null, streak?: number }} Pace
 */

/**
 * @param {Answer[]} answers ответы (любой порядок)
 * @param {number} now
 * @returns {Pace}
 */
export function paceOf(answers, now, opts = {}) {
  const o = { ...PACE, ...opts }
  const recent = (answers || [])
    .filter((a) => a && typeof a.ok === 'boolean' && now - Number(a.at) <= o.windowMs && Number(a.at) <= now)
    .sort((a, b) => Number(b.at) - Number(a.at))
    .slice(0, o.maxAnswers)
  const n = recent.length
  if (!n) return { verdict: 'none', n: 0, accuracy: null }
  const right = recent.filter((a) => a.ok).length
  const accuracy = right / n
  const last = recent[0]

  // Ошибки подряд — в одной вещи: три промаха в разных темах — не «эта тема не идёт».
  let wrong = 0
  for (const a of recent) {
    if (a.item !== last.item || a.ok) break
    wrong++
  }
  if (wrong >= o.streakWrong) return { verdict: 'easier', why: 'streak', item: last.item, title: last.title ?? null, n, accuracy, streak: wrong }

  const timed = recent.filter((a) => Number.isFinite(a.gapMs) && a.gapMs != null)
  const fast = (a) => Number.isFinite(a.gapMs) && a.gapMs != null && a.gapMs <= o.fastMs
  let fastRun = 0
  for (const a of recent) {
    if (!a.ok || !fast(a)) break
    fastRun++
  }
  if (fastRun >= o.streakFast) return { verdict: 'harder', why: 'fast', item: last.item, title: last.title ?? null, n, accuracy, streak: fastRun }
  if (n < o.minAnswers) return { verdict: 'hold', n, accuracy }
  if (accuracy < o.low) return { verdict: 'easier', why: 'low', item: last.item, title: last.title ?? null, n, accuracy }
  // «Всё верно и быстро»: без замеров паузы (ответы «Словаря» пишутся пачкой в конце) — только верно, не «быстро».
  const quick = timed.length >= o.minAnswers / 2 && timed.filter(fast).length / timed.length >= o.fastShare
  if (accuracy >= o.high && quick) return { verdict: 'harder', why: 'high', item: last.item, title: last.title ?? null, n, accuracy }
  return { verdict: 'hold', n, accuracy }
}
