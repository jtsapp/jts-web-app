// src/practice/chess/strength.js
// Рейтинг бота → настройки Stockfish. У движка шкала UCI_Elo начинается с 1320 (проверено запуском сборки
// 19 lite: min 1320 max 3190). Ниже — своя достройка: самый слабый уровень движка на малой глубине плюс доля
// случайных ходов. Она приблизительная: гарантируется только, что выше рейтинг — не слабее игра.
import { Chess } from 'chess.js'

export const MIN_BOT = 400
export const MAX_BOT = 2800
export const BOT_STEP = 100
export const NATIVE_FLOOR = 1320

export function clampBot(r) {
  const n = Number(r)
  if (!Number.isFinite(n)) return 800
  return Math.min(MAX_BOT, Math.max(MIN_BOT, Math.round(n / BOT_STEP) * BOT_STEP))
}

// Все три опции шлются на каждый поиск: подсказка и бот ходят одним движком, и забытая опция
// прошлого поиска сделала бы бота гроссмейстером на один ход.
export const FULL_STRENGTH = {
  options: { UCI_LimitStrength: 'false', UCI_Elo: NATIVE_FLOOR, 'Skill Level': 20 },
  go: { movetime: 500 },
  blunder: 0,
}

export function botSettings(rating) {
  const r = clampBot(rating)
  if (r >= NATIVE_FLOOR) {
    const share = (r - NATIVE_FLOOR) / (MAX_BOT - NATIVE_FLOOR)
    return {
      options: { UCI_LimitStrength: 'true', UCI_Elo: r, 'Skill Level': 20 },
      go: { movetime: Math.round(300 + share * 700) },
      blunder: 0,
    }
  }
  return {
    options: { UCI_LimitStrength: 'false', UCI_Elo: NATIVE_FLOOR, 'Skill Level': 0 },
    go: { depth: 1 + Math.floor((r - MIN_BOT) / 300) },
    blunder: 0.5 - (r - MIN_BOT) * 0.0005,
  }
}

const LEVELS = [[800, 'beginner'], [1200, 'novice'], [1600, 'club'], [2000, 'strongClub'], [2200, 'expert'], [2500, 'master']]
export function levelKey(rating) {
  const r = clampBot(rating)
  for (const [below, key] of LEVELS) if (r < below) return key
  return 'grandmaster'
}

/**
 * Случайный допустимый ход. careful — не ставить своего ферзя под бой одним ходом, если есть другие ходы:
 * без этого бот на 800 зевал бы ферзя чаще живого новичка. Генератор приходит аргументом — ради теста.
 */
export function weakMove(fen, rng, careful) {
  const chess = new Chess(fen)
  let moves = chess.moves({ verbose: true })
  if (!moves.length) return null
  if (careful) {
    const safe = moves.filter((m) => {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion })
      const hangs = chess.moves({ verbose: true }).some((reply) => reply.captured === 'q')
      chess.undo()
      return !hangs
    })
    if (safe.length) moves = safe
  }
  const m = moves[Math.min(moves.length - 1, Math.floor(rng() * moves.length))]
  return m.promotion ? { from: m.from, to: m.to, promotion: m.promotion } : { from: m.from, to: m.to }
}
