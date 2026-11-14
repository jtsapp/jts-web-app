// src/practice/chess/rating.js
// Рейтинг ученика по формуле Эло. Считает браузер: для партий с ботом подделка никому не вредит,
// а к онлайну (часть 4) расчёт переедет на сервер.
export const START_RATING = 800
export const K = 32
export const FLOOR = 100

export const expected = (r, opp) => 1 / (1 + 10 ** ((opp - r) / 400))

export function nextRating(r, opp, score) {
  return Math.max(FLOOR, Math.round(r + K * (score - expected(r, opp))))
}

export function scoreFor(result, color) {
  if (result === '1/2-1/2') return 0.5
  return (result === '1-0') === (color === 'w') ? 1 : 0
}

// Возврат хода и подсказка — это уже не своя игра; партия, брошенная до второго хода, — не партия.
export function isRated({ usedUndo, usedHint, playerMoves }) {
  return !usedUndo && !usedHint && playerMoves >= 2
}
