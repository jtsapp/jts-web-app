// src/screens/ChessPage.jsx
'use client'

// Шахматы: партия против Stockfish (?screen=chess). Спека — docs/superpowers/specs/2026-11-14-chess-design.md.
//
// Экран — оболочка над машиной партии (practice/chess/session.js): та живёт вне React, экран на неё подписан.
// Движок — отдельная программа в Web Worker (GPL, файлы в public/chess/engine), поднимается при входе
// в раздел и гасится при уходе: 1,8 МБ wasm и поток незачем держать на остальных экранах.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ownerOf } from '../practice/progressStore.js'
import { CHESS_PREFS_KEY, CHESS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { createEngine } from '../practice/chess/engineClient.js'
import { createBotOpponent } from '../practice/chess/opponent.js'
import { createChessSession } from '../practice/chess/session.js'
import { FULL_STRENGTH } from '../practice/chess/strength.js'
import { readChess, currentOf, saveCurrent, recordGame } from '../practice/chess/chessProgress.js'
import { playChessCue, wakeChessSound, sleepChessSound, isChessSoundOn, setChessSoundOn } from '../practice/chess/sound.js'
import { chessT, CHESS_LANGS } from './chess/strings.js'
import { PieceSprite } from './chess/pieces.jsx'
import Board from './chess/Board.jsx'
import { PlayerBar, MoveList, Actions } from './chess/GamePanel.jsx'
import NewGameDialog from './chess/NewGameDialog.jsx'
import ResultDialog from './chess/ResultDialog.jsx'
import HistoryView from './chess/HistoryView.jsx'

function readPrefs() {
  try { return JSON.parse(window.localStorage.getItem(CHESS_PREFS_KEY) || '{}') || {} } catch { return {} }
}
function writePrefs(patch) {
  try { window.localStorage.setItem(CHESS_PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch })) } catch { /* приватное окно */ }
}

// E2E подменяет движок функцией «позиция → ход» (tests/chess.spec.js): настоящий Stockfish в тесте — это
// секунды ожидания и недетерминированные ходы. В проде подмена не читается.
function makeEngine(onCrash) {
  const fake = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.__jtsFakeChessEngine
  if (!fake) return { engine: createEngine({ onCrash }), fake: false }
  const parse = (s) => (typeof s === 'string' && s.length >= 4 ? { from: s.slice(0, 2), to: s.slice(2, 4), ...(s[4] ? { promotion: s[4] } : {}) } : null)
  return {
    fake: true,
    engine: {
      ready: Promise.resolve(),
      search: async (fen) => ({ move: parse(await fake(fen)), score: null, cancelled: false }),
      stop() {},
      destroy() {},
    },
  }
}

function useChessProgress() {
  const [state, setState] = useState(() => readChess())
  useEffect(() => {
    const sync = () => setState(readChess())
    window.addEventListener(CHESS_PROGRESS_EVENT, sync)
    return () => window.removeEventListener(CHESS_PROGRESS_EVENT, sync)
  }, [])
  return state
}

function ChessGame({ userName }) {
  const [lang, setLang] = useState(() => (CHESS_LANGS.includes(readPrefs().lang) ? readPrefs().lang : 'en'))
  const t = useMemo(() => chessT(lang), [lang])
  const [soundOn, setSoundOn] = useState(() => isChessSoundOn())
  const [tab, setTab] = useState('play')
  const [dialog, setDialog] = useState(null) // 'new' | 'resign' | 'confirmNew' | null
  const [flipped, setFlipped] = useState(false)
  const [resultSeen, setResultSeen] = useState(null) // id партии, чьё окно итога закрыли
  const [review, setReview] = useState(null) // запись истории, открытая в разборе
  const [engineState, setEngineState] = useState('loading') // 'loading' | 'ready' | 'failed'
  const [engineRun, setEngineRun] = useState(0)
  const progress = useChessProgress()

  const engineRef = useRef(null)
  const fakeRef = useRef(false)
  const sessionRef = useRef(null)
  if (!sessionRef.current) {
    sessionRef.current = createChessSession({
      // В подмене бот отвечает сразу и без случайных ходов: тест задаёт его ходы сам.
      makeOpponent: (rating) => createBotOpponent({
        engine: engineRef.current, rating,
        ...(fakeRef.current ? { rng: () => 1, minDelay: 0 } : {}),
      }),
      analyse: (fen) => engineRef.current.search(fen, FULL_STRENGTH).then((r) => r.move),
      save: saveCurrent,
      finish: recordGame,
      getRating: () => readChess().rating,
      onCue: playChessCue,
    })
  }
  const session = sessionRef.current
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)

  // Движок: поднять при входе, погасить при уходе; «Retry» пересоздаёт его (engineRun).
  useEffect(() => {
    let alive = true
    const { engine, fake } = makeEngine(() => { if (alive) { setEngineState('failed'); session.engineFailed() } })
    engineRef.current = engine
    fakeRef.current = fake
    setEngineState('loading')
    engine.ready.then(() => { if (alive) setEngineState('ready') }, () => {})
    if (engineRun === 0) {
      // Недоигранная партия возвращается сама; ждать движок не нужно — его поиск встанет в очередь за ready.
      const saved = currentOf(readChess())
      if (!saved || !session.resume(saved)) setDialog('new')
    } else {
      session.retry()
    }
    return () => {
      alive = false
      engine.destroy()
    }
  }, [engineRun, session])

  useEffect(() => () => { session.destroy(); sleepChessSound() }, [session])

  // Часы на экране и флаг — раз в 100 мс, только пока идёт партия с часами.
  const ticking = snap.status === 'playing' && !!snap.clock
  useEffect(() => {
    if (!ticking) return undefined
    const id = setInterval(() => session.tick(), 100)
    return () => clearInterval(id)
  }, [ticking, session])

  const pickLang = (next) => { setLang(next); writePrefs({ lang: next }) }
  const toggleSound = () => { const next = !soundOn; setChessSoundOn(next); setSoundOn(next) }

  const play = ({ color, botRating, time }) => {
    wakeChessSound()
    writePrefs({ color, botRating, time })
    const side = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color
    session.start({ color: side, botRating, time })
    setFlipped(false)
    setDialog(null)
    setTab('play')
  }
  const askNew = () => {
    if (snap.status !== 'playing' || snap.moves.length === 0) { setDialog('new'); return }
    setDialog('confirmNew')
  }
  const move = (from, to, promotion) => { wakeChessSound(); session.playerMove(from, to, promotion) }

  const orientation = snap.playerColor ? (flipped ? (snap.playerColor === 'w' ? 'b' : 'w') : snap.playerColor) : 'w'
  const top = orientation === 'w' ? 'b' : 'w'
  const names = (side) => side === snap.playerColor
    ? { name: userName?.trim() || t('you'), sub: String(progress.rating) }
    : { name: t('bot'), sub: snap.thinking ? t('thinking') : String(snap.botRating ?? '') }
  const lastByBot = snap.moves.length > 0 && snap.moves[snap.moves.length - 1].color !== snap.playerColor
  const showResult = snap.status === 'over' && resultSeen !== snap.fen && !dialog
  // Бросить партию после второго своего хода без возвратов и подсказок — проиграть её (см. session.start).
  const rated = snap.rated && snap.moves.filter((m) => m.color === snap.playerColor).length >= 2
  const prefs = readPrefs()

  return (
    <div className="ch" data-status={snap.status} data-turn={snap.turn || ''} data-engine={engineState} lang={lang}>
      <PieceSprite />
      <header className="ch-head">
        <h1 className="ch-head__title">{t('title')}</h1>
        <div className="ch-tabs" role="tablist">
          {[['play', 'tabPlay'], ['games', 'tabGames']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} data-tab={key}
              className={`ch-tabs__item ${tab === key ? 'is-on' : ''}`} onClick={() => { setTab(key); setReview(null) }}>{t(label)}</button>
          ))}
        </div>
        <div className="ch-head__tools">
          <button type="button" className="ch-tool" data-act="sound" aria-pressed={soundOn} onClick={toggleSound}>{soundOn ? t('soundOn') : t('soundOff')}</button>
          <div className="ch-seg ch-seg--small" role="radiogroup" aria-label="Language">
            {CHESS_LANGS.map((code) => (
              <button key={code} type="button" role="radio" aria-checked={lang === code} data-lang={code}
                className={`ch-seg__item ${lang === code ? 'is-on' : ''}`} onClick={() => pickLang(code)}>{code.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'games' && (
        <HistoryView t={t} history={progress.history} open={review} onOpen={setReview} onClose={() => setReview(null)} />
      )}

      {tab === 'play' && snap.board && (
        <div className="ch-game">
          <div className="ch-stage">
            <Board fen={snap.fen} board={snap.board} orientation={orientation} playerColor={snap.playerColor}
              interactive={snap.status === 'playing'} movesFrom={session.movesFrom} onMove={move}
              lastMove={snap.lastMove} check={snap.check} hint={snap.hint} animateLast={lastByBot} t={t} />
          </div>
          <aside className="ch-side">
            <PlayerBar {...names(top)} side={top} snap={snap} />
            {!snap.rated && snap.status === 'playing' && <p className="ch-unrated" data-unrated>{t('unrated')}</p>}
            {snap.engineError && (
              <p className="ch-alert" role="alert">{t('engineStopped')} <button type="button" className="ch-link" data-act="retry" onClick={() => setEngineRun((n) => n + 1)}>{t('retry')}</button></p>
            )}
            <MoveList moves={snap.moves} />
            <Actions t={t} snap={snap} onUndo={() => session.undo()} onHint={() => session.hint()} onFlip={() => setFlipped((f) => !f)}
              onResign={() => setDialog('resign')} onNew={askNew} />
            <PlayerBar {...names(orientation)} side={orientation} snap={snap} />
          </aside>
        </div>
      )}

      {dialog === 'new' && (
        <NewGameDialog t={t} rating={progress.rating} defaults={prefs} engine={engineState} onPlay={play}
          onRetry={() => setEngineRun((n) => n + 1)} onClose={snap.board ? () => setDialog(null) : null} />
      )}
      {(dialog === 'resign' || dialog === 'confirmNew') && (
        <div className="ch-dialog" data-dialog="confirm" role="dialog" aria-modal="true">
          <div className="ch-dialog__card">
            <p className="ch-dialog__text">{dialog === 'resign' ? t('confirmResign') : rated ? t('confirmNewRated') : t('confirmNew')}</p>
            <div className="ch-dialog__actions">
              <button type="button" className="ch-btn ch-btn--ghost" onClick={() => setDialog(null)}>{t('cancel')}</button>
              <button type="button" className="ch-btn ch-btn--main" data-act="confirm"
                onClick={() => { if (dialog === 'resign') { session.resign(); setDialog(null) } else setDialog('new') }}>
                {dialog === 'resign' ? t('resign') : t('newGame')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showResult && (
        <ResultDialog t={t} snap={snap}
          onRematch={() => play({ color: snap.playerColor === 'w' ? 'b' : 'w', botRating: snap.botRating, time: snap.time })}
          onNew={() => setDialog('new')}
          onReview={() => setResultSeen(snap.fen)} />
      )}
    </div>
  )
}

export default function ChessPage({ userName, userLevel, token, onNav, onProfile }) {
  // Чей прогресс: вход и выход пересоздают раздел; тихое обновление токена — нет (ownerOf стабилен).
  const owner = ownerOf(token)
  const supported = typeof WebAssembly === 'object' && typeof Worker === 'function'
  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} active="chess" onNav={onNav} onProfile={onProfile}>
      {supported ? <ChessGame key={owner} userName={userName} /> : <p className="ch ch-alert">{chessT('en')('unsupported')}</p>}
    </LearningLayout>
  )
}
