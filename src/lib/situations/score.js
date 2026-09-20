// Сборка итогового балла устного ответа из осей.
//
// Веса — из прототипа «ситуаций.html», менять их без замера нельзя: цифра
// показывается студенту и по ней он судит о прогрессе, так что любой сдвиг
// шкалы читается как «я стал хуже говорить».
//
// Произношение приходит от Azure, остальные четыре оси — от грейдера. Azure
// может не ответить (нет ключей, сбой, слишком короткое аудио) — тогда ось
// показывается как «n/a», а её вес РАСПРЕДЕЛЯЕТСЯ по остальным, а не
// обнуляется: иначе отсутствие произношения молча срезало бы итог на четверть,
// и студент решил бы, что говорит хуже, чем вчера. Прототип вёл себя так же,
// когда браузер не давал confidence.

export const WEIGHTS = {
  grammar: 0.3,
  pronunciation: 0.25,
  vocabulary: 0.2,
  fluency: 0.15,
  coherence: 0.1,
}

export const AXES = Object.keys(WEIGHTS)

// Балл оси: число 0–100 или null, если оси нет. NaN/строка/отрицательное — это
// сбой поставщика, а не «ноль баллов»: ноль студент прочтёт как приговор.
//
// Пустые значения отсекаем ДО Number(): `Number(null)`, `Number('')` и
// `Number(false)` дают ноль, то есть отсутствующая ось молча превратилась бы
// в «ноль баллов за произношение» — ровно то, чего этот модуль и не должен
// допускать.
export function normalizeAxis(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Итоговый балл по доступным осям.
 * @param {{grammar?:number, pronunciation?:number|null, vocabulary?:number,
 *          fluency?:number, coherence?:number}} axes
 * @returns {{ axes: Record<string, number|null>, overall: number|null }}
 */
export function composeScore(axes = {}) {
  const clean = {}
  for (const axis of AXES) clean[axis] = normalizeAxis(axes[axis])

  let sum = 0
  let weight = 0
  for (const axis of AXES) {
    if (clean[axis] == null) continue
    sum += clean[axis] * WEIGHTS[axis]
    weight += WEIGHTS[axis]
  }

  // Ни одной оси — считать нечего. Ноль здесь был бы враньём.
  const overall = weight > 0 ? Math.round(sum / weight) : null
  return { axes: clean, overall }
}

// Подпись к баллу. Пороги — из прототипа; ключи, а не готовый текст, потому что
// подпись показывается на языке интерфейса (i18n живёт на клиенте).
export function scoreLabelKey(overall) {
  if (overall == null) return 'situations.score.na'
  if (overall >= 85) return 'situations.score.excellent'
  if (overall >= 70) return 'situations.score.great'
  if (overall >= 55) return 'situations.score.good'
  return 'situations.score.keepPractising'
}
