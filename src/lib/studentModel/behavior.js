// Поведение ученика (ТЗ v2.0, 8.1: «когда занимается, сколько выдерживает без перерыва»). Спека — раздел 5.
//
// По времени ответов заданий за 30 дней: подход — ответы без перерыва дольше BREAK_MS; часы — по Алматы (часовой пояс
// школы: своего пояса ученика у веба нет). «Что пропускает» и «на что реагирует» — следующий шаг (данные плана на
// бэкенде, кнопки событий — только на вкладке).

export const BEHAVIOR = {
  breakMs: 10 * 60_000,
  tzOffsetMin: 5 * 60, // Asia/Almaty, UTC+5 круглый год
  minSessions: 3, // меньше — о привычках не говорим
  windowHours: 3,
}

const localHour = (ms, off) => new Date(ms + off * 60_000).getUTCHours()
const localDay = (ms, off) => new Date(ms + off * 60_000).toISOString().slice(0, 10)

/**
 * @param {number[]} times миллисекунды ответов (любой порядок)
 * @returns {{ days: number, sessions: number, medianMin: number|null, longestMin: number|null,
 *             window: {from: number, to: number, share: number}|null }}
 */
export function behaviorOf(times, opts = {}) {
  const o = { ...BEHAVIOR, ...opts }
  const ts = (times || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!ts.length) return { days: 0, sessions: 0, medianMin: null, longestMin: null, window: null }
  const days = new Set(ts.map((t) => localDay(t, o.tzOffsetMin))).size
  const runs = []
  let start = ts[0]
  let prev = ts[0]
  for (const t of ts.slice(1)) {
    if (t - prev > o.breakMs) {
      runs.push(prev - start)
      start = t
    }
    prev = t
  }
  runs.push(prev - start)
  // Минута на последний ответ подхода: подход из одного ответа — «минута», а не ноль.
  const mins = runs.map((ms) => Math.max(1, Math.round(ms / 60_000) + 1)).sort((a, b) => a - b)
  const median = mins.length >= o.minSessions ? mins[Math.floor((mins.length - 1) / 2)] : null
  const longest = mins.length >= o.minSessions ? mins[mins.length - 1] : null

  // Окно часов, где больше всего ответов: скользящее по кругу суток.
  let window = null
  if (mins.length >= o.minSessions) {
    const hist = new Array(24).fill(0)
    for (const t of ts) hist[localHour(t, o.tzOffsetMin)]++
    let best = -1
    let from = 0
    for (let h = 0; h < 24; h++) {
      let sum = 0
      for (let k = 0; k < o.windowHours; k++) sum += hist[(h + k) % 24]
      // При равенстве — окно, которое начинается с часа, где ответы есть: ответы в 19:00–19:20 — это «с 19 до 22», а не
      // «с 17 до 20».
      if (sum > best || (sum === best && hist[h] > 0 && hist[from] === 0)) {
        best = sum
        from = h
      }
    }
    window = { from, to: (from + o.windowHours) % 24, share: best / ts.length }
  }
  return { days, sessions: mins.length, medianMin: median, longestMin: longest, window }
}
