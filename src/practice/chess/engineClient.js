// src/practice/chess/engineClient.js
// Клиент Stockfish. Движок — отдельная программа (GPL) в Web Worker: сайт его не импортирует, а переписывается
// с ним строками протокола UCI. Поиск один за раз: движок однопоточный, и вторая команда go поверх первой
// спутала бы, чей пришёл bestmove. Тот же клиент возьмёт тренер (часть 2) — search уже отдаёт оценку.
export const ENGINE_URL = '/chess/engine/stockfish-19-lite-single.js'
const READY_TIMEOUT = 20000
const CANCELLED = { move: null, score: null, cancelled: true }

export function parseBestMove(line) {
  const m = /^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/.exec(line)
  if (!m) return null
  return m[3] ? { from: m[1], to: m[2], promotion: m[3] } : { from: m[1], to: m[2] }
}

export function parseScore(line) {
  const m = /^info .*\bscore (cp|mate) (-?\d+)/.exec(line)
  if (!m) return null
  return m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) }
}

export function createEngine({ makeWorker = () => new Worker(ENGINE_URL), readyTimeout = READY_TIMEOUT, onCrash = () => {} } = {}) {
  let worker = null
  let dead = false
  let waiters = [] // [{ test, resolve }] — кто ждёт служебную строку (uciok, readyok)
  let search = null // { resolve, score, cancelled } — идущий поиск
  let queue = Promise.resolve()
  let rejectReady = () => {}

  const send = (cmd) => { try { worker?.postMessage(cmd) } catch { /* воркер уже погашен */ } }
  const waitFor = (test) => new Promise((resolve) => waiters.push({ test, resolve }))

  function fail(err) {
    if (dead) return
    dead = true
    waiters = []
    if (search) { search.resolve(CANCELLED); search = null }
    rejectReady(err)
    onCrash(err)
  }

  function onLine(line) {
    if (typeof line !== 'string') return
    waiters = waiters.filter((w) => {
      if (!w.test(line)) return true
      w.resolve()
      return false
    })
    if (!search) return
    if (line.startsWith('info ')) {
      const score = parseScore(line)
      if (score) search.score = score
    } else if (line.startsWith('bestmove')) {
      const done = search
      search = null
      done.resolve(done.cancelled ? CANCELLED : { move: parseBestMove(line), score: done.score, cancelled: false })
    }
  }

  const ready = new Promise((resolve, reject) => {
    rejectReady = reject
    try { worker = makeWorker() } catch (err) { dead = true; reject(err); onCrash(err); return }
    worker.onmessage = (ev) => onLine(ev.data)
    worker.onerror = (ev) => fail(new Error(ev?.message || 'engine error'))
    const timer = setTimeout(() => fail(new Error('engine timeout')), readyTimeout)
    waitFor((l) => l === 'uciok')
      .then(() => { const up = waitFor((l) => l === 'readyok'); send('isready'); return up })
      .then(() => { clearTimeout(timer); resolve() })
    send('uci')
  })
  // Отказ ready читает экран; без этого обработчика он всплыл бы необработанным отклонением.
  ready.catch(() => {})

  function run(fen, { options = {}, go = {} } = {}) {
    return new Promise((resolve) => {
      if (dead) { resolve(CANCELLED); return }
      search = { resolve, score: null, cancelled: false }
      for (const [name, value] of Object.entries(options)) send(`setoption name ${name} value ${value}`)
      send(`position fen ${fen}`)
      send(go.depth ? `go depth ${go.depth}` : `go movetime ${go.movetime || 500}`)
    })
  }

  return {
    ready,
    search(fen, settings) {
      const result = queue.then(() => ready).then(() => run(fen, settings), () => CANCELLED)
      queue = result
      return result
    },
    stop() {
      if (search && !search.cancelled) { search.cancelled = true; send('stop') }
    },
    destroy() {
      if (search) { search.resolve(CANCELLED); search = null }
      send('quit')
      dead = true
      try { worker?.terminate() } catch { /* уже погашен */ }
    },
  }
}
