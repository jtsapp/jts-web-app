import { useState, useEffect, useRef } from 'react'
import Footer from '../components/Footer.jsx'
import { getAdaptiveQuestions } from '../api.js'
import { createSession, next, submit, result, isDone, pctOf, LEVELS, CFG } from '../cefr.js'

// Позиции подписей уровней = pctOf центров полос (чтобы бегунок совпадал с подписями)
const LABEL_POS = [8.33, 25, 41.67, 58.33, 75, 91.67]

export default function LevelTestPage({ onClose, onDone }) {
  const [phase, setPhase] = useState('loading') // loading | error | question | result
  const [errMsg, setErrMsg] = useState('')
  const [cur, setCur] = useState(null)
  const [chosen, setChosen] = useState(null)
  const [checked, setChecked] = useState(false)
  const [n, setN] = useState(0)
  const [theta, setTheta] = useState(0)
  const [res, setRes] = useState(null)
  const sess = useRef(null)
  const advTimer = useRef(null)

  useEffect(() => {
    let alive = true
    getAdaptiveQuestions()
      .then((qs) => {
        if (!alive) return
        if (!Array.isArray(qs) || qs.length === 0) {
          setErrMsg('Не удалось загрузить вопросы теста.')
          setPhase('error')
          return
        }
        sess.current = createSession(qs)
        const q = next(sess.current)
        setCur(q)
        setN(sess.current.n)
        setTheta(sess.current.theta)
        setPhase('question')
      })
      .catch((e) => {
        if (!alive) return
        setErrMsg(e.message || 'Ошибка загрузки теста.')
        setPhase('error')
      })
    return () => {
      alive = false
      clearTimeout(advTimer.current)
    }
  }, [])

  function check() {
    if (chosen == null || checked) return
    submit(sess.current, cur, chosen)
    setChecked(true)
    setTheta(sess.current.theta)
    advTimer.current = setTimeout(advance, 950)
  }

  function advance() {
    const s = sess.current
    if (isDone(s)) {
      setRes(result(s))
      setPhase('result')
      return
    }
    const q = next(s)
    setCur(q)
    setChosen(null)
    setChecked(false)
    setN(s.n)
    setTheta(s.theta)
  }

  if (phase === 'loading' || phase === 'error') {
    return (
      <div className="screen">
        <div className="card card--plain">
          <div className="test-center">
            {phase === 'loading' ? (
              <>
                <div className="spinner" />
                <p className="form-sub">Готовим тест…</p>
              </>
            ) : (
              <>
                <p className="form-error">{errMsg}</p>
                <button className="btn-later" onClick={onClose}>
                  Назад
                </button>
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div className="screen">
        <div className="card card--plain">
          <div className="test-center">
            <div className="result-badge">{res.level}</div>
            <h2 className="form-title">Твой уровень — {res.level}</h2>
            <p className="form-sub">
              Правильных ответов: {res.correct} из {res.total}. Мы подберём обучение под твой уровень.
            </p>
            <button className="form-primary result-btn" onClick={() => onDone?.(res)}>
              Продолжить
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const q = cur
  const pct = pctOf(theta)
  const total = CFG.max // «из 14»

  return (
    <div className="screen">
      <div className="card card--plain">
        {/* Шапка теста */}
        <header className="test-header">
          <button className="test-close" onClick={onClose} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <span className="test-title">Тестирование на знания языка (CEFR)</span>
        </header>

        <section className="test-body">
          <div className="test-inner">
            <div className="test-count">
              Вопрос {n + 1} из {total}
            </div>

            {/* Слайдер уровня CEFR */}
            <div className="meter">
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${pct}%` }} />
                <div className="meter-thumb" style={{ left: `${pct}%` }} />
              </div>
              <div className="meter-labels">
                {LEVELS.map((lv, i) => (
                  <span key={lv} style={{ left: `${LABEL_POS[i]}%` }}>
                    {lv}
                  </span>
                ))}
              </div>
            </div>

            {/* Текст задания */}
            {q.passage && (
              <div className="test-passage">
                <div className="test-passage__label">Read the passage</div>
                <p>{q.passage}</p>
              </div>
            )}
            {q.prompt && !q.passage && <p className="test-prompt">{q.prompt}</p>}
            <p className="test-question">{q.question}</p>

            {/* Варианты */}
            <div className="test-options">
              {q.options.map((opt) => {
                let cls = 'option'
                if (checked) {
                  if (opt.id === chosen)
                    cls += opt.id === q.correctOptionId ? ' option--correct' : ' option--wrong'
                } else if (opt.id === chosen) {
                  cls += ' option--selected'
                }
                return (
                  <button
                    key={opt.id}
                    className={cls}
                    disabled={checked}
                    onClick={() => setChosen(opt.id)}
                  >
                    {opt.text}
                  </button>
                )
              })}
            </div>

            <button
              className="test-check"
              disabled={chosen == null || checked}
              onClick={check}
            >
              Проверить
            </button>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
