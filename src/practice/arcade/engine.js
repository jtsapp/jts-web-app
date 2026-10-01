// «Аркада» (Speak or Die) — движок игры. Здесь только время раунда: ни React, ни
// микрофона, поэтому правила игры проверяются тестом кадр за кадром.
//
// Семантику держим как в исходнике: молчание доводит пилу до дерева ровно за
// лимит сложности, речь отгоняет её в 1.4 раза медленнее, раунд — 60 секунд.

export const ROUND_SECONDS = 60

// Лимит тишины — сколько секунд молчания отделяет пилу от дерева. `band` —
// ориентир IELTS из исходной игры, а не оценка ученика.
export const DIFFICULTIES = [
  { key: 'easy', band: '4.0', limit: 12 },
  { key: 'medium', band: '5.5–6.0', limit: 10 },
  { key: 'hard', band: '7.0+', limit: 5 },
  { key: 'veryHard', band: '8.0+', limit: 2.5 },
]

export const initialState = () => ({
  speaking: 0,
  silence: 0,
  stops: 0,
  danger: 0,
  wasSpeaking: false,
  elapsed: 0,
})

// Один кадр. Длинный кадр (вкладку притормозили) обрезается и по концу раунда,
// и по моменту, когда пила дошла до дерева, — иначе молчание «переплатилось»
// бы сверх лимита, а итог раунда разошёлся бы с тем, что видел ученик.
export function advance(s, speaking, seconds, limit) {
  const dt = Math.max(
    0,
    Math.min(seconds, ROUND_SECONDS - s.elapsed, speaking ? Infinity : (1 - s.danger) * limit),
  )
  return {
    speaking: s.speaking + (speaking ? dt : 0),
    silence: s.silence + (speaking ? 0 : dt),
    stops: s.stops + (s.wasSpeaking && !speaking ? 1 : 0),
    danger: Math.max(0, Math.min(1, s.danger + (speaking ? -dt / (limit * 1.4) : dt / limit))),
    wasSpeaking: speaking,
    elapsed: s.elapsed + dt,
  }
}

// Пила у дерева. Сравнение с запасом: danger копится суммой дробей.
export const isLost = (s) => s.danger >= 1 - 1e-8

export const isOver = (s) => isLost(s) || s.elapsed >= ROUND_SECONDS
