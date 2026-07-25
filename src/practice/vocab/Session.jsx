import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { speak as ttsSpeak, sfx as playSfx, buzz as vibrate } from './audio.js'
import { shuffle, tr as trW, altTr as altTrW } from './vocabData.js'
import {
  buildLearn, processBuf, nextTask, learnDone, masteredCount, isMastered,
  distractors as pickDistractors, progressPct, mmss,
} from './engine.js'
import { gradeWord } from './state.js'
import { Choose, Listen, ImagePick, DefMatch, Context, Dialogue, Collocation, Assemble, Swipe } from './tasks/basic.jsx'
import { DragMatch, Match, Memory, Trace, Pronounce, Challenge } from './tasks/games.jsx'

// Этап 2: поток заданий с таймером, комбо и фидбеком. Порт session-экрана
// прототипа. LEARN мутируется движком (как в оригинале) и живёт в ref;
// перерисовку вызываем счётчиком шага.

const TASKS = {
  choose: Choose,
  listen: Listen,
  imagepick: ImagePick,
  defmatch: DefMatch,
  context: Context,
  dialogue: Dialogue,
  collocation: Collocation,
  swipe: Swipe,
  dragmatch: DragMatch,
  match: Match,
  memory: Memory,
  trace: Trace,
  pronounce: Pronounce,
}

export default function Session({ collected, scope, S, set, setQuiet, T, lang, onExit, onFinish, toast }) {
  const learnRef = useRef(null)
  if (learnRef.current === null) learnRef.current = buildLearn(collected)
  const L = learnRef.current

  const statsRef = useRef({
    total: L.items.length, correct: 0, answered: 0, newLearned: 0,
    xp: 0, mistakes: 0, bestCombo: 0, start: Date.now(),
  })
  const comboRef = useRef(0)
  const [task, setTask] = useState(null)
  const [step, setStep] = useState(0)           // счётчик шага: триггерит выбор задания
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState(null) // {ok, w, ans}
  const [reward, setReward] = useState(null)
  const [challenge, setChallenge] = useState(false)
  const [left, setLeft] = useState(S.goalMin * 60)
  const [over, setOver] = useState(false)
  const [timesUp, setTimesUp] = useState(false)
  const endAtRef = useRef(Date.now() + S.goalMin * 60000)

  const speak = useCallback(
    (text, opts) => ttsSpeak(text, { accent: S.accent, onNoVoice: () => toast(T.noVoice), ...opts }),
    [S.accent, T, toast],
  )
  const sfx = useCallback((k) => playSfx(k, S.sound), [S.sound])

  /* ── таймер: обратный отсчёт, затем «+сверх» ── */
  useEffect(() => {
    const id = setInterval(() => {
      const ms = endAtRef.current - Date.now()
      setLeft(Math.ceil(ms / 1000))
      if (ms <= 0 && !over) {
        setOver(true)
        setTimesUp(true)
        playSfx('reveal', S.sound)
        vibrate([20, 40, 20])
      }
    }, 500)
    return () => clearInterval(id)
  }, [over, S.sound])

  /* ── SRS: пишем прогресс и буферим оценку для этапа ── */
  const grade = useCallback(
    (w, correct, knew) => {
      // Патч функцией: SRS пишется много раз за задание, и считать его от
      // снимка из замыкания нельзя — предыдущие записи затирались бы.
      let becameNew = false
      setQuiet((cur) => {
        const { st, wasNew } = gradeWord(cur, w, correct, knew)
        becameNew = wasNew
        return { srs: { ...cur.srs, [w.id]: st }, seenCount: cur.seenCount + (wasNew ? 1 : 0) }
      })
      if (becameNew) statsRef.current.newLearned++
      L.buf.push({ id: w.id, ok: !!correct })
    },
    [setQuiet, L],
  )

  const advance = useCallback(() => {
    processBuf(L)
    setFeedback(null)
    setTask(null)
    setStep((s) => s + 1)
  }, [L])

  const bumpCombo = () => {
    comboRef.current++
    if (comboRef.current > statsRef.current.bestCombo) statsRef.current.bestCombo = comboRef.current
    setCombo(comboRef.current)
  }

  const correct = useCallback(
    (w) => {
      bumpCombo()
      const st = statsRef.current
      st.correct++
      st.answered++
      st.xp += 10 + Math.min(10, (comboRef.current - 1) * 2)
      sfx('good')
      vibrate(15)
      speak(w.en)
      setReward('✓ ' + T.fbGood[(Math.random() * T.fbGood.length) | 0])
      setTimeout(() => setReward(null), 900)
      setTimeout(advance, 950)
    },
    [advance, sfx, speak, T],
  )

  const wrong = useCallback(
    (w, ans) => {
      comboRef.current = 0
      setCombo(0)
      const st = statsRef.current
      st.mistakes++
      st.answered++
      sfx('bad')
      vibrate([10, 30, 10])
      speak(w.en)
      setFeedback({ ok: false, w, ans })
    },
    [sfx, speak],
  )

  // Групповые задания: одна оценка на весь набор.
  const groupWin = useCallback(
    (words, xp, allOk = true) => {
      words.forEach((x) => grade(x, allOk, false))
      bumpCombo()
      const st = statsRef.current
      st.correct++
      st.answered++
      st.xp += xp
      setTimeout(() => {
        setReward('✓ ' + T.fbGood[(Math.random() * T.fbGood.length) | 0])
        setTimeout(() => setReward(null), 900)
        setTimeout(advance, 650)
      }, 250)
    },
    [grade, advance, T],
  )

  // Статистика финального раунда (он ведёт свой счёт).
  const chStat = useCallback((ok, pts, nc) => {
    const st = statsRef.current
    st.answered++
    if (ok) {
      st.correct++
      st.xp += pts
      comboRef.current = nc
      if (nc > st.bestCombo) st.bestCombo = nc
      setCombo(nc)
    } else {
      st.mistakes++
      comboRef.current = 0
      setCombo(0)
    }
  }, [])

  const finish = useCallback(() => {
    onFinish({ ...statsRef.current, elapsed: Date.now() - statsRef.current.start })
  }, [onFinish])

  const ctx = useMemo(
    () => ({
      T, lang, scope, S, speak, sfx, buzz: vibrate, shuffle,
      grade, correct, wrong, advance, groupWin, chStat,
      tr: (w) => trW(w, lang),
      altTr: (w) => altTrW(w, lang),
      distractors: (w, n, pool) => pickDistractors(w, n, pool, scope),
    }),
    [T, lang, scope, S, speak, sfx, grade, correct, wrong, advance, groupWin, chStat],
  )

  /* ── что показываем на этом шаге: выбор задания или переход к финалу ── */
  useEffect(() => {
    if (challenge || feedback || task) return
    if (L.count > 250) return finish() // страховочный предел
    if (learnDone(L)) {
      if (!L.challengeDone && L.items.length >= 3) {
        L.challengeDone = true
        setChallenge(true)
        return
      }
      return finish()
    }
    setTask(nextTask(L))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, challenge, task])

  const Task = task && TASKS[task.type]
  const mastered = masteredCount(L)
  const pctTime = Math.max(2, Math.min(100, ((S.goalMin * 60 - Math.max(0, left)) / (S.goalMin * 60)) * 100))

  return (
    <section className="v-screen v-show">
      <div className="v-sess-top">
        <button className="v-sess-x" onClick={onExit} aria-label="exit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="v-prog"><i style={{ width: pctTime + '%' }} /></div>
        <div className={`v-sess-timer${over ? ' v-over' : left <= 30 ? ' v-warn' : ''}`}>
          {over ? '+' + mmss((Date.now() - endAtRef.current) / 1000) : mmss(left)}
        </div>
        <button className="v-sound-btn" onClick={() => set((cur) => ({ sound: !cur.sound }))} aria-label="sound">
          {S.sound ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="v-sess-sub">
        <div className="v-round-name">
          <span className="v-e">📚</span>{T.learnTitle} · {mastered}/{L.items.length}
        </div>
        <div className={`v-combo${combo >= 2 ? ' v-on' : ''}`}>{combo >= 2 ? `🔥 ${combo} ${T.chCombo}` : ''}</div>
      </div>

      <div className="v-stage v-enter" key={challenge ? 'ch' : step}>
        {challenge ? (
          <Challenge item={{ type: 'challenge', pool: L.items.map((i) => i.w), w: L.items[0].w }} ctx={ctx} onFinish={finish} />
        ) : task ? (
          task.type === 'construct' || task.type === 'scramble' ? (
            <Assemble item={task} ctx={ctx} mode={task.type === 'construct' ? 'letters' : 'words'} />
          ) : Task ? (
            <Task item={task} ctx={ctx} />
          ) : (
            <Choose item={task} ctx={ctx} />
          )
        ) : null}
      </div>

      {reward && <div className="v-reward v-show">{reward}</div>}

      {feedback && (
        <div className={`v-feedback v-up ${feedback.ok ? 'v-good' : 'v-bad'}`}>
          <div className="v-fb-bubble">
            {feedback.ok
              ? T.fbGood[(Math.random() * T.fbGood.length) | 0]
              : T.fbBad[(Math.random() * T.fbBad.length) | 0]}
          </div>
          <div className="v-fb-h">{feedback.ok ? `✓ ${T.correct}` : `↻ ${T.wrong}`}</div>
          <div className="v-fb-sub">
            {feedback.ok ? (
              <><b>{feedback.w.en}</b> — {trW(feedback.w, lang)}</>
            ) : (
              <>{T.answerWas} <b>{feedback.ans || feedback.w.en}</b>{!feedback.ans && ' · ' + trW(feedback.w, lang)}</>
            )}
          </div>
          <button className="v-btn" onClick={advance}>{learnDone(L) ? T.finish : T.tapNext}</button>
        </div>
      )}

      {timesUp && (
        <div className="v-ov v-show">
          <div className="v-ov-card">
            <div className="v-ov-emo">⏰</div>
            <div className="v-ov-h">{T.tuH}</div>
            <div className="v-ov-stats">
              <div className="v-ov-stat"><div className="v-v">{statsRef.current.answered}</div><div className="v-l">{T.tasksDone}</div></div>
              <div className="v-ov-stat"><div className="v-v">{statsRef.current.newLearned}</div><div className="v-l">{T.wordsLearned}</div></div>
            </div>
            <button className="v-btn" onClick={() => setTimesUp(false)}>{T.tuCont}</button>
            <button className="v-btn v-ghost" style={{ marginTop: 10 }} onClick={finish}>{T.tuFin}</button>
          </div>
        </div>
      )}
    </section>
  )
}
