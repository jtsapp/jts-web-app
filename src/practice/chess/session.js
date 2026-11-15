// src/practice/chess/session.js
// Машина партии: чей ход, думает ли бот, часы, возврат хода, подсказка, исход и рейтинг.
// Живёт вне React (экран подписан через useSyncExternalStore), как машина «Неправильных глаголов»:
// ответ бота приходит позже и не должен зависеть от того, какой рендер был последним.
// О движке, хранилище и звуке не знает — всё приходит аргументами; сетевой соперник (часть 4)
// встанет на место makeOpponent.
import { createGame, kingSquare, capturedBy, materialLead, canMate } from './game.js'
import { newClock, fromSnapshot, remaining, switchTo, pause, flagged, snapshot } from './clock.js'
import { nextRating, scoreFor, isRated } from './rating.js'
import { cueOf } from './cues.js'

const LOW_TIME = 10000
const other = (side) => (side === 'w' ? 'b' : 'w')
const winOf = (side) => (side === 'w' ? '1-0' : '0-1')
const makeId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function createChessSession({
  makeOpponent, analyse, save, finish, getRating,
  now = () => performance.now(), wallClock = () => Date.now(), onCue = () => {}, newId = makeId,
}) {
  let game = null
  let meta = null // { id, startedAt, color, botRating, time }
  let opponent = null
  let clock = null
  let clockLog = [] // clockLog[n] — остатки после n полуходов; по нему возврат хода возвращает часы
  let flags = { usedUndo: false, usedHint: false }
  let status = 'idle'
  let thinking = false
  let hint = null
  let hintPending = false
  let outcome = null
  let ratingChange = null
  let engineError = false
  let lowTimeCued = false
  const listeners = new Set()

  function build() {
    if (!game) {
      return {
        status, fen: null, board: null, turn: null, playerColor: null, botRating: null, time: 0, moves: [], lastMove: null,
        check: null, thinking: false, hint: null, hintPending: false, rated: true, canUndo: false, clock: null,
        captured: { w: [], b: [] }, lead: 0, outcome, ratingChange, engineError,
      }
    }
    const moves = game.moves()
    const last = moves[moves.length - 1]
    const board = game.board()
    const turn = game.turn()
    const undoSteps = turn === meta.color ? 2 : 1
    return {
      status, fen: game.fen(), board, turn, playerColor: meta.color, botRating: meta.botRating, time: meta.time,
      moves: moves.map(({ san, from, to, color }) => ({ san, from, to, color })),
      lastMove: last ? { from: last.from, to: last.to } : null,
      check: game.inCheck() ? kingSquare(board, turn) : null,
      thinking, hint, hintPending, rated: !flags.usedUndo && !flags.usedHint,
      canUndo: status === 'playing' && moves.length >= undoSteps,
      clock: snapshot(clock, now()), captured: capturedBy(moves), lead: materialLead(moves),
      outcome, ratingChange, engineError,
    }
  }
  let snap = build()
  function emit() {
    snap = build()
    for (const fn of listeners) fn()
  }

  function persist() {
    save({
      ...meta, pgn: game.pgn(), movedAt: wallClock(), clock: snapshot(clock, now()), clockLog: clockLog.slice(),
      usedUndo: flags.usedUndo, usedHint: flags.usedHint,
    })
  }

  function end(result, reason, cue = true) {
    opponent?.cancel()
    thinking = false
    hint = null
    hintPending = false
    clock = pause(clock, now())
    status = 'over'
    outcome = { result, reason }
    const playerMoves = game.moves().filter((m) => m.color === meta.color).length
    const rated = isRated({ ...flags, playerMoves })
    const before = getRating()
    const after = rated ? nextRating(before, meta.botRating, scoreFor(result, meta.color)) : before
    ratingChange = { before, after, rated }
    // Партия без единого хода — не партия: в историю не идёт.
    if (game.ply() > 0) {
      finish({
        id: meta.id, endedAt: wallClock(), color: meta.color, botRating: meta.botRating, time: meta.time,
        result, reason, pgn: game.pgn(), rated, ratingBefore: before, ratingAfter: after,
      })
    }
    save(null)
    if (cue) onCue(cueOf(null, outcome, meta.color))
    emit()
  }

  function afterMove(move) {
    hint = null
    if (clock) {
      const t = now()
      clock = switchTo(clock, game.turn(), t)
      clockLog[game.ply()] = snapshot(clock, t)
    }
    const over = game.outcome()
    onCue(cueOf(move, over, meta.color))
    if (over) { end(over.result, over.reason, false); return }
    persist()
    emit()
    if (game.turn() !== meta.color) askBot()
  }

  function askBot() {
    const fen = game.fen()
    const asked = opponent
    thinking = true
    emit()
    asked.requestMove(fen).then((move) => {
      // Ответ на позицию, которой уже нет (возврат хода, новая партия), на доску не идёт.
      if (!move || status !== 'playing' || opponent !== asked || game.fen() !== fen) return
      thinking = false
      const made = game.move(move)
      if (made) afterMove(made)
      else emit()
    }, () => {})
  }

  function begin(nextMeta) {
    meta = nextMeta
    opponent = makeOpponent(meta.botRating)
    status = 'playing'
    thinking = false
    hint = null
    hintPending = false
    outcome = null
    ratingChange = null
    engineError = false
    lowTimeCued = false
  }

  return {
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getSnapshot: () => snap,

    start({ color, botRating, time }) {
      // Бросить рейтинговую партию ради новой — проиграть её: иначе рейтинг накручивается уходом из проигранных.
      if (status === 'playing') end(winOf(other(meta.color)), 'abandoned', false)
      game = createGame()
      flags = { usedUndo: false, usedHint: false }
      clock = newClock(time)
      clockLog = clock ? [snapshot(clock, now())] : []
      begin({ id: newId(), startedAt: wallClock(), color, botRating, time })
      persist()
      emit()
      if (color === 'b') askBot()
    },

    resume(saved) {
      let restored
      try { restored = createGame(saved.pgn) } catch { restored = null }
      if (!restored || restored.outcome()) { save(null); return false }
      game = restored
      flags = { usedUndo: !!saved.usedUndo, usedHint: !!saved.usedHint }
      const ply = game.ply()
      clock = saved.clock ? fromSnapshot(saved.clock) : null
      // Журнал другой длины (старая запись, сведение устройств) — заполняем текущими остатками.
      clockLog = !clock ? [] : saved.clockLog?.length === ply + 1 ? saved.clockLog.slice() : Array.from({ length: ply + 1 }, () => ({ ...saved.clock }))
      begin({ id: saved.id, startedAt: saved.startedAt, color: saved.color, botRating: saved.botRating, time: clock ? saved.time : 0 })
      // Перезагрузка часы останавливала; идут снова с сохранённого остатка.
      if (clock && ply > 0) clock = switchTo(clock, game.turn(), now())
      emit()
      if (game.turn() !== meta.color) askBot()
      return true
    },

    movesFrom(square) {
      if (status !== 'playing' || engineError || thinking || game.turn() !== meta.color) return []
      return game.movesFrom(square)
    },

    playerMove(from, to, promotion) {
      if (status !== 'playing' || engineError || thinking || game.turn() !== meta.color) return false
      const made = game.move({ from, to, promotion })
      if (!made) { onCue('illegal'); return false }
      afterMove(made)
      return true
    },

    undo() {
      if (status !== 'playing') return false
      // Бот уже ответил — снимаем его ход и свой; ещё думает — только свой.
      const steps = game.turn() === meta.color ? 2 : 1
      if (game.ply() < steps) return false
      opponent.cancel()
      thinking = false
      hint = null
      for (let i = 0; i < steps; i++) game.undo()
      flags.usedUndo = true
      if (clock) {
        const ply = game.ply()
        clock = fromSnapshot(clockLog[ply] || snapshot(clock, now()))
        clockLog.length = ply + 1
        if (ply > 0) clock = switchTo(clock, game.turn(), now())
      }
      persist()
      emit()
      return true
    },

    hint() {
      if (status !== 'playing' || engineError || thinking || hintPending || game.turn() !== meta.color) return
      const fen = game.fen()
      flags.usedHint = true
      hintPending = true
      persist()
      emit()
      const settle = (move) => {
        hintPending = false
        if (move && status === 'playing' && game.fen() === fen) hint = { from: move.from, to: move.to }
        emit()
      }
      analyse(fen).then(settle, () => settle(null))
    },

    resign() {
      if (status === 'playing') end(winOf(other(meta.color)), 'resignation')
    },

    // Экран зовёт раз в 100 мс: обновить часы на экране, поймать флаг и «мало времени».
    tick() {
      if (status !== 'playing' || !clock || engineError) return
      const t = now()
      const side = flagged(clock, t)
      if (side) {
        // Флаг — не поражение, если сопернику нечем ставить мат.
        end(canMate(game.board(), other(side)) ? winOf(other(side)) : '1/2-1/2', 'timeout')
        return
      }
      if (!lowTimeCued && clock.running === meta.color && remaining(clock, meta.color, t) <= LOW_TIME) {
        lowTimeCued = true
        onCue('lowtime')
      }
      emit()
    },

    engineFailed() {
      if (status !== 'playing') return
      engineError = true
      thinking = false
      hintPending = false
      clock = pause(clock, now())
      emit()
    },

    retry() {
      if (status !== 'playing' || !engineError) return
      engineError = false
      opponent = makeOpponent(meta.botRating)
      if (clock && game.ply() > 0) clock = switchTo(clock, game.turn(), now())
      emit()
      if (game.turn() !== meta.color) askBot()
    },

    destroy() {
      opponent?.cancel()
      listeners.clear()
    },
  }
}
