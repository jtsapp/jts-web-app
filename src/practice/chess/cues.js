// src/practice/chess/cues.js
// Какой звук даёт ход. Отдельно от sound.js: правило проверяется тестом, а как звук звучит — на слух.
export function cueOf(move, outcome, playerColor) {
  if (outcome) {
    if (outcome.result === '1/2-1/2') return 'draw'
    return (outcome.result === '1-0') === (playerColor === 'w') ? 'win' : 'lose'
  }
  if (move.san.includes('+')) return 'check'
  if (move.promotion) return 'promote'
  if (move.captured) return 'capture'
  if (move.flags.includes('k') || move.flags.includes('q')) return 'castle'
  return 'move'
}
