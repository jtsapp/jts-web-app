// src/practice/chess/opponent.js
// Соперник — тот, у кого партия спрашивает ход. Сейчас это бот; онлайн-соперник (часть 4) реализует те же
// requestMove и cancel поверх сети, и машина партии не изменится.
import { botSettings, weakMove, MIN_BOT } from './strength.js'

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function createBotOpponent({ engine, rating, rng = Math.random, minDelay = 400, sleep = defaultSleep }) {
  // Номер запроса: ответ на отменённый (возврат хода, новая партия) не должен попасть на доску.
  let token = 0
  return {
    async requestMove(fen) {
      const mine = ++token
      const settings = botSettings(rating)
      // Мгновенный ответ выглядит как сбой, а звук хода сливается со звуком хода ученика.
      const pause = sleep(minDelay)
      let move
      if (rng() < settings.blunder) {
        move = weakMove(fen, rng, rating > MIN_BOT)
      } else {
        const found = await engine.search(fen, settings)
        if (found.cancelled) return null
        move = found.move
      }
      await pause
      return mine === token ? move : null
    },
    cancel() {
      token++
      engine.stop()
    },
  }
}
