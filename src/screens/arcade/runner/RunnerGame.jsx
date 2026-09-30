import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { loadLevelWords } from '../../../practice/vocab/vocabData.js'
import { createDeck } from '../../../practice/arcade/runner/deck.js'
import {
  LIVES,
  RUN_DIFFICULTIES,
  advance,
  createRun,
  isOver,
  move,
  needsRow,
  spawnRow,
  speedOf,
} from '../../../practice/arcade/runner/engine.js'
import { useArcadeFullscreen } from '../useArcadeFullscreen.js'
import { formatNumber } from '../format.js'
import RunnerResults from './RunnerResults.jsx'
import { CollapseIcon, ExpandIcon, PlayIcon } from '../../../components/icons.jsx'
import { PkChevron } from '../../practice/PracticeIcons.jsx'

// «Word Rush» — вторая игра «Аркады». Разделение как у Speak or Die: правила
// — src/practice/arcade/runner/ (колода и движок, под тестами), мир three.js
// — runnerScene.js (грузится динамическим импортом, в общий бандл не
// попадает), а здесь жизненный цикл: выбор сложности, загрузка слов, отсчёт,
// кадры, ввод, пауза, итоги. Шапка над сценой — обычный HTML: слово-вопрос,
// жизни и счёт должны быть чёткими и доступными, а не пикселями на canvas.
//
// Состояние забега живёт в ref и двигается каждый кадр; в React уходит
// только то, что видно в шапке, и только когда оно меняется.

const COUNTDOWN = 3
// Скорость «витрины» до старта: город едет, бегун бежит, ворот нет.
const IDLE_SPEED = 5
const TOAST_SECONDS = 1.5
const BEST_KEY = 'jts_arcade_runner_best'
const ACTIVE = ['countdown', 'playing']

function readBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {}
  } catch {
    return {}
  }
}

// Рекорд — удобство этого браузера, не прогресс: хранилище может быть
// недоступно (приватное окно), тогда рекорд просто не запоминается.
function saveBest(key, score) {
  const all = readBest()
  if (score <= (all[key] || 0)) return false
  all[key] = score
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(all))
  } catch {
    /* не запомнили — не страшно */
  }
  return true
}

function hudOf(s, status, countdown) {
  return {
    status,
    count: status === 'countdown' ? Math.max(1, Math.ceil(countdown)) : 0,
    prompt: s?.row?.prompt ?? null,
    options: s?.row?.options ?? null,
    correct: s?.row?.correct ?? null,
    lane: s?.lane ?? 1,
    lives: s?.lives ?? LIVES,
    score: s?.score ?? 0,
    streak: s?.streak ?? 0,
    toast:
      s?.last && !s.last.hit && s.elapsed - s.last.at < TOAST_SECONDS
        ? { prompt: s.last.prompt, answer: s.last.answer }
        : null,
  }
}

function PauseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

export default function RunnerGame({ onExit }) {
  const { t, lang } = useI18n()
  // Средняя сложность по умолчанию — как у Speak or Die.
  const [level, setLevel] = useState(1)
  const [status, setStatus] = useState('loading') // loading | ready | starting | countdown | playing | paused | finished
  const [error, setError] = useState(null) // null | webgl | words
  const [hud, setHud] = useState(() => hudOf(null, 'loading', 0))
  const [result, setResult] = useState(null)
  const canvas = useRef(null)
  const panel = useRef(null)
  const scene = useRef(null)
  const game = useRef({ state: null, deck: null, countdown: 0, level: 1 })
  const statusRef = useRef('loading')
  const hudSig = useRef('')
  const touch = useRef(null)
  const fullscreen = useArcadeFullscreen(panel)
  const difficulty = RUN_DIFFICULTIES[level]

  // Статус читают и кадры, и обработчики клавиш — им нужен ref, а шапке —
  // состояние React. Меняем оба сразу.
  function go(next) {
    statusRef.current = next
    setStatus(next)
  }

  useEffect(() => {
    let alive = true
    let frame = 0
    let prev = performance.now()
    let current = null

    function syncHud(s, st, countdown) {
      const view = hudOf(s, st, countdown)
      const sig = JSON.stringify(view)
      if (sig === hudSig.current) return
      hudSig.current = sig
      setHud(view)
    }

    function finish(s) {
      const g = game.current
      const key = RUN_DIFFICULTIES[g.level].key
      const record = s.score > 0 && saveBest(key, s.score)
      setResult({ ...s, level: g.level, best: readBest()[key] || s.score, record })
      go('finished')
    }

    function step(dt) {
      const g = game.current
      const st = statusRef.current
      let s = g.state
      if (st === 'countdown') {
        g.countdown -= dt
        if (g.countdown <= 0) go('playing')
      } else if (st === 'playing' && s) {
        if (needsRow(s)) s = spawnRow(s, g.deck.next())
        const before = s.seq
        s = advance(s, dt)
        if (s.seq !== before && !s.last.hit) g.deck.miss(s.last)
        g.state = s
        if (isOver(s)) finish(s)
      }
      const running = !!s && st !== 'ready'
      current.render(
        {
          lane: s?.lane ?? 1,
          row: running ? s.row : null,
          last: running ? s.last : null,
          speed: running ? speedOf(s) : IDLE_SPEED,
          speedMul: s?.speedMul ?? 1,
          moving: st === 'ready' || st === 'starting' || ACTIVE.includes(st),
        },
        dt,
      )
      syncHud(running ? s : null, statusRef.current, g.countdown)
    }

    function tick(now) {
      // Кадр рисования не длиннее 0.1 с: после фона сцена не «прыгает».
      const dt = Math.min(0.1, (now - prev) / 1000)
      prev = now
      step(dt)
      frame = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(() => current?.resize())
    if (canvas.current) observer.observe(canvas.current)

    ;(async () => {
      try {
        const mod = await import('./runnerScene.js')
        const assets = await mod.loadRunnerAssets()
        if (!alive) return
        current = mod.createRunnerScene(canvas.current, assets)
        scene.current = current
        current.resize()
        go('ready')
        prev = performance.now()
        frame = requestAnimationFrame(tick)
      } catch (e) {
        if (!alive) return
        console.warn('[word-rush] сцена не поднялась', e)
        setError('webgl')
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      current?.dispose()
      scene.current = null
    }
  }, [])

  function steer(dir) {
    const g = game.current
    if (g.state && ACTIVE.includes(statusRef.current)) g.state = move(g.state, dir)
  }

  function togglePause() {
    const st = statusRef.current
    if (st === 'playing') go('paused')
    else if (st === 'paused') go('playing')
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const st = statusRef.current
      const dir = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : 0
      if (dir && ACTIVE.includes(st)) {
        e.preventDefault()
        steer(dir)
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && (st === 'playing' || st === 'paused')) {
        e.preventDefault()
        togglePause()
      }
    }
    // Скрытая вкладка — пауза, а не конец: в отличие от Speak or Die здесь
    // нечего «переплачивать», забег просто ждёт.
    const onHide = () => {
      if (document.hidden && statusRef.current === 'playing') go('paused')
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
    // steer/togglePause читают только ref'ы — подписка одна на всё время экрана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    if (statusRef.current === 'starting' || !scene.current) return
    const d = RUN_DIFFICULTIES[level]
    setResult(null)
    setError(null)
    go('starting')
    try {
      const lists = await Promise.all(d.levels.map((l) => loadLevelWords(l)))
      // Пока грузились слова, с экрана могли уйти: сцена уже освобождена,
      // забег запускать некуда.
      if (!scene.current) return
      if (lists.some((list) => !list || !list.length)) throw new Error('words')
      game.current = { state: createRun(d.lead), deck: createDeck(lists.flat(), { lang }), countdown: COUNTDOWN, level }
      scene.current.reset()
      go('countdown')
    } catch {
      if (!scene.current) return
      setError('words')
      go('ready')
    }
  }

  function pickLevel(i) {
    if (!['ready', 'finished'].includes(statusRef.current)) return
    setLevel(i)
    setResult(null)
    game.current = { state: null, deck: null, countdown: 0, level: i }
    go('ready')
  }

  function onPointerDown(e) {
    touch.current = { x: e.clientX, y: e.clientY }
  }

  // Свайп — сдвиг на дорожку в его сторону; тап — к той половине поля, где
  // коснулись. Кнопки оверлеев тоже внутри поля, но их нажатия приходят не
  // во время забега и сюда не доходят.
  function onPointerUp(e) {
    const from = touch.current
    touch.current = null
    if (!from || !ACTIVE.includes(statusRef.current)) return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx))
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const r = e.currentTarget.getBoundingClientRect()
      steer(e.clientX < r.left + r.width / 2 ? -1 : 1)
    }
  }

  const busy = !['ready', 'finished'].includes(status)

  let overlay = null
  if (error === 'webgl') {
    overlay = (
      <div className="ar-run-over" role="alert">
        <p>{t('arcade.run.error.webgl')}</p>
        {onExit && (
          <button type="button" className="ar-run-btn" onClick={onExit}>
            {t('arcade.toHub')}
          </button>
        )}
      </div>
    )
  } else if (status === 'loading' || status === 'starting') {
    overlay = (
      <div className="ar-run-over">
        <span className="ar-spinner" aria-hidden="true" />
        <p role="status">{t(status === 'loading' ? 'arcade.run.loading' : 'arcade.run.loadingWords')}</p>
      </div>
    )
  } else if (status === 'ready') {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.ready')}</h3>
        <p>{t('arcade.run.readyHint')}</p>
        <ul className="ar-rules">
          <li>{t('arcade.run.rule.lives')}</li>
          <li>{t('arcade.run.rule.speed')}</li>
          <li>{t('arcade.run.rule.controls')}</li>
        </ul>
        {error === 'words' && (
          <p className="ar-run-error" role="alert">
            {t('arcade.run.error.words')}
          </p>
        )}
        <button type="button" className="ar-run-btn" onClick={() => void start()}>
          {t(error === 'words' ? 'arcade.run.retry' : 'arcade.run.start')}
          <PkChevron size={18} />
        </button>
      </div>
    )
  } else if (status === 'paused') {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.paused')}</h3>
        <p>{t('arcade.run.pausedHint')}</p>
        <button type="button" className="ar-run-btn" onClick={togglePause}>
          <PlayIcon size={16} />
          {t('arcade.run.resume')}
        </button>
      </div>
    )
  } else if (status === 'finished' && result) {
    overlay = (
      <div className="ar-run-over">
        <h3>{t('arcade.run.over')}</h3>
        <p>{t('arcade.run.overHint', { score: result.score })}</p>
        <button type="button" className="ar-run-btn" onClick={() => void start()}>
          {t('arcade.run.again')}
          <PkChevron size={18} />
        </button>
      </div>
    )
  }

  return (
    <section className="ar-game ar-run" aria-label={t('arcade.run.section')}>
      <div className="ar-choose">
        <h2>{t('arcade.chooseChallenge')}</h2>
        <span>{t('arcade.run.chooseHint')}</span>
      </div>
      <div className="ar-levels">
        {RUN_DIFFICULTIES.map((d, i) => (
          <button
            key={d.key}
            type="button"
            disabled={busy}
            aria-pressed={i === level}
            className={`ar-level ar-level--${d.key}${i === level ? ' is-on' : ''}`}
            onClick={() => pickLevel(i)}
          >
            <span className="ar-level__top">
              <span className="ar-level__bars" aria-hidden="true">
                {[0, 1, 2, 3].map((n) => (
                  <i key={n} style={{ height: 7 + n * 3, opacity: n <= i ? 1 : 0.25 }} />
                ))}
              </span>
              <b>{t(`arcade.difficulty.${d.key}`)}</b>
              <span className="ar-level__dot" aria-hidden="true" />
            </span>
            <span className="ar-level__meta">
              {t('arcade.run.words', { levels: d.levels.join('–') })}
              <span>{t('arcade.run.lead', { seconds: formatNumber(d.lead, lang) })}</span>
            </span>
          </button>
        ))}
      </div>

      <div ref={panel} className={`ar-panel ar-run-panel${fullscreen.active ? ' is-full' : ''}`}>
        <div className="ar-panel__top">
          <span className="ar-brand">
            <i aria-hidden="true" /> WORD RUSH
            <b>{t(`arcade.difficulty.${difficulty.key}`)}</b>
          </span>
          <span className="ar-run-tools">
            {(status === 'playing' || status === 'paused') && (
              <button type="button" className="ar-tool" onClick={togglePause}>
                {status === 'paused' ? <PlayIcon size={16} /> : <PauseGlyph />}
                <span>{t(status === 'paused' ? 'arcade.run.resume' : 'arcade.run.pause')}</span>
              </button>
            )}
            <button type="button" className="ar-tool" aria-pressed={fullscreen.active} onClick={() => void fullscreen.toggle()}>
              {fullscreen.active ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
              <span>{t(fullscreen.active ? 'arcade.exitFullscreen' : 'arcade.fullscreen')}</span>
            </button>
          </span>
        </div>

        <div
          className="ar-run-stage"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          data-options={hud.options ? hud.options.join('|') : ''}
          data-correct={hud.correct ?? ''}
          data-lane={hud.lane}
          data-lives={hud.lives}
          data-score={hud.score}
        >
          <canvas ref={canvas} className="ar-run-canvas" aria-hidden="true" />
          {status !== 'loading' && !error && (
            <div className="ar-run-hud">
              <div className="ar-run-lives" role="img" aria-label={t('arcade.run.lives', { n: hud.lives })}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <span key={i} className={i < hud.lives ? 'is-on' : ''} aria-hidden="true">
                    ♥
                  </span>
                ))}
              </div>
              <div className="ar-run-score">
                <small>{t('arcade.run.score')}</small>
                <b>{hud.score}</b>
                {hud.streak >= 3 && <em>{t('arcade.run.streak', { n: hud.streak })}</em>}
              </div>
            </div>
          )}
          {/* На паузе слово прячется: иначе над ответом можно думать сколько угодно. */}
          {hud.prompt && status !== 'paused' && (
            <div className="ar-run-prompt" aria-live="polite">
              <small>{t('arcade.run.translate')}</small>
              <b lang={lang === 'kk' ? 'kk' : 'ru'}>{hud.prompt}</b>
            </div>
          )}
          {hud.toast && (
            <p className="ar-run-toast" role="status">
              {t('arcade.run.miss', { prompt: hud.toast.prompt, answer: hud.toast.answer })}
            </p>
          )}
          {status === 'countdown' && (
            <div key={hud.count} className="ar-run-count" aria-live="assertive">
              {hud.count}
            </div>
          )}
          {overlay}
        </div>
        <p className="ar-run-keys">{t('arcade.run.controls')}</p>
      </div>

      {result && status === 'finished' && (
        <RunnerResults result={result} onAgain={() => void start()} onExit={onExit} />
      )}
    </section>
  )
}
