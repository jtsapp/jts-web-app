import { useState, useEffect, useRef } from 'react'
import Footer from '../components/Footer.jsx'
import Shell from '../components/Shell.jsx'
import { startAdaptiveSession, submitAdaptiveAnswer } from '../api.js'
import { pctOf, LEVELS } from '../cefr.js'
import { useI18n } from '../i18n.jsx'

// Декоративная «печать» с зубчатым краем (белый бейдж уровня)
function SealBadge({ level }) {
  const bumps = 14
  const cx = 100
  const cy = 100
  const R = 66
  const r = 15
  const dots = []
  for (let i = 0; i < bumps; i++) {
    const a = (Math.PI * 2 * i) / bumps - Math.PI / 2
    dots.push(<circle key={i} cx={cx + R * Math.cos(a)} cy={cy + R * Math.sin(a)} r={r} />)
  }
  return (
    <div className="result-seal">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <g fill="#fff">
          <circle cx={cx} cy={cy} r={R + 6} />
          {dots}
        </g>
      </svg>
      <span className="result-level">{level}</span>
    </div>
  )
}

// Позиции подписей уровней = pctOf центров полос (чтобы бегунок совпадал с подписями)
const LABEL_POS = [8.33, 25, 41.67, 58.33, 75, 91.67]

export default function LevelTestPage({ onClose, onDone, token }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState('loading') // loading | error | question | result
  const [errMsg, setErrMsg] = useState('')
  const [cur, setCur] = useState(null)
  const [chosen, setChosen] = useState(null)
  // Правильность приходит с сервера — на клиенте её взять неоткуда.
  const [verdict, setVerdict] = useState(null)
  const [n, setN] = useState(1)
  const [total, setTotal] = useState(0)
  const [theta, setTheta] = useState(0)
  const [res, setRes] = useState(null)
  const [sending, setSending] = useState(false)
  const sessionToken = useRef(null)
  const pending = useRef(null)
  const advTimer = useRef(null)

  useEffect(() => {
    let alive = true
    startAdaptiveSession(token)
      .then((s) => {
        if (!alive) return
        if (!s || !s.question) {
          // Пустой errMsg → рендер возьмёт локализованный t('test.errLoad').
          setErrMsg('')
          setPhase('error')
          return
        }
        sessionToken.current = s.sessionToken
        setCur(s.question)
        setN(s.questionNumber || 1)
        setTotal(s.maxQuestions || 0)
        setPhase('question')
      })
      .catch((e) => {
        if (!alive) return
        setErrMsg(e.message || '')
        setPhase('error')
      })
    return () => {
      alive = false
      clearTimeout(advTimer.current)
    }
  }, [token])

  async function check() {
    if (chosen == null || verdict || sending) return
    setSending(true)
    try {
      const answer = await submitAdaptiveAnswer({
        sessionToken: sessionToken.current,
        questionId: cur.id,
        optionId: chosen,
        token,
      })
      setErrMsg('')
      setVerdict({ correct: answer.correct, correctOptionId: answer.correctOptionId })
      if (typeof answer.theta === 'number') setTheta(answer.theta)
      pending.current = answer
      advTimer.current = setTimeout(advance, 950)
    } catch (e) {
      // Вопрос остаётся на экране — ответ просто не ушёл.
      setErrMsg(e.message || '')
    } finally {
      setSending(false)
    }
  }

  function advance() {
    const answer = pending.current
    pending.current = null
    if (!answer) return
    if (answer.finished) {
      setRes(answer.result)
      setPhase('result')
      return
    }
    setCur(answer.nextQuestion)
    setChosen(null)
    setVerdict(null)
    setN(answer.questionNumber || n + 1)
  }

  if (phase === 'loading' || phase === 'error') {
    return (
      <div className="screen">
        <div className="card card--plain">
          <div className="test-center">
            {phase === 'loading' ? (
              <>
                <div className="spinner" />
                <p className="form-sub">{t('test.loading')}</p>
              </>
            ) : (
              <>
                <p className="form-error">{errMsg || t('test.errLoad')}</p>
                <button className="btn-later" onClick={onClose}>
                  {t('common.back')}
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
    // Посетителю показываем измеренную полосу; в профиль сервер пишет свой,
    // ограниченный каталогом уровень (assignedLevel).
    const level = res.detectedLevel || res.assignedLevel
    const wrong = res.answered - res.correct
    return (
      <Shell onBack={() => onDone?.(res)}>
        <div className="result-wrap">
          <div className="result-card">
            <h2 className="result-heading">{t('result.great')}</h2>
            <p className="result-caption">{t('result.determined')}</p>

            <SealBadge level={level} />

            <div className="result-stats">
              <div className="rstat">
                <div className="rstat-top">
                  <span className="rstat-ic rstat-ic--red" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M8.5 15.5c.7-1 2-1.6 3.5-1.6s2.8.6 3.5 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="rstat-num rstat-num--red">{wrong}</span>
                </div>
                <div className="rstat-label rstat-label--red">{t('result.wrong')}</div>
              </div>

              <div className="rstat">
                <div className="rstat-top">
                  <span className="rstat-ic rstat-ic--green" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="currentColor" />
                      <path d="m8 12.5 2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="rstat-num rstat-num--green">{res.correct}</span>
                </div>
                <div className="rstat-label rstat-label--green">{t('result.correct')}</div>
              </div>
            </div>

            <button className="result-continue" onClick={() => onDone?.(res)}>
              {t('result.continue')}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  const q = cur
  const pct = pctOf(theta)

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
          <span className="test-title">{t('test.header')}</span>
        </header>

        <section className="test-body">
          <div className="test-inner">
            <div className="test-count">{t('test.question', { n, total })}</div>

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
                <div className="test-passage__label">{t('test.readPassage')}</div>
                <p>{q.passage}</p>
              </div>
            )}
            {q.prompt && !q.passage && <p className="test-prompt">{q.prompt}</p>}
            <p className="test-question">{q.question}</p>

            {/* Варианты */}
            <div className="test-options">
              {q.options.map((opt) => {
                let cls = 'option'
                if (verdict) {
                  if (opt.id === chosen)
                    cls += opt.id === verdict.correctOptionId ? ' option--correct' : ' option--wrong'
                } else if (opt.id === chosen) {
                  cls += ' option--selected'
                }
                return (
                  <button
                    key={opt.id}
                    className={cls}
                    disabled={verdict != null}
                    onClick={() => setChosen(opt.id)}
                  >
                    {opt.text}
                  </button>
                )
              })}
            </div>

            {errMsg && <p className="form-error">{errMsg}</p>}

            <button
              className="test-check"
              disabled={chosen == null || verdict != null || sending}
              onClick={check}
            >
              {t('test.check')}
            </button>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
