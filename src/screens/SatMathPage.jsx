'use client'

// SAT Math — сложные задачи Digital SAT: шесть юнитов по 22 вопроса подряд по
// номерам (задачник PrepPros «Advanced Digital SAT Math: 150 Hard Questions»;
// вопросы 133–150 в раздел не вошли — решение 05.10.2026).
//
// Вопрос — картинка, нарезанная из PDF скриптом scripts/extract-sat-math.py:
// формулы, таблицы и чертежи книги без потерь не перенабрать, а ответ всё
// равно вводится отдельно — буквой или числом, как в Bluebook. Сверка ответа —
// src/practice/sat/check.js.
//
// Лучший результат юнита живёт в localStorage устройства: раздел открывается
// только диплинком (?screen=sat), карточки в Практике у него нет, и заводить
// под него серверный прогресс рано.

import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { checkAnswer, formatAnswer, parseNumber } from '../practice/sat/check.js'

const BASE = '/sat/math-advanced/'
const BEST_KEY = 'jts_sat_math_best'
const LETTERS = ['A', 'B', 'C', 'D']

function readBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {}
  } catch {
    return {}
  }
}

function writeBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best))
  } catch {
    /* приватное окно или квота — результат просто не запомнится */
  }
}

export default function SatMathPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [unit, setUnit] = useState(null)
  // Перезапуск юнита — новый ключ у SatRun: так сбрасывается всё его состояние.
  const [run, setRun] = useState(0)
  // На сервере localStorage нет, но расхождения при гидратации не будет:
  // результаты рисуются только после загрузки units.json, то есть на клиенте.
  const [best, setBest] = useState(() => (typeof window === 'undefined' ? {} : readBest()))
  const topRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetch(BASE + 'units.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const open = (u) => {
    setUnit(u)
    setRun((n) => n + 1)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const finish = (u, score) => {
    setBest((prev) => {
      const next = { ...prev, [u.id]: Math.max(prev[u.id] ?? 0, score) }
      writeBest(next)
      return next
    })
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="sat" ref={topRef}>
        <div className="sat-top">
          <button type="button" className="sat-back" onClick={() => (unit ? setUnit(null) : onNav?.('practice'))}>
            ← {unit ? t('sat.toUnits') : t('sat.toPractice')}
          </button>
          <div className="sat-crumb">
            <b>{t('sat.crumb')}</b>
            {unit && <span>{t('sat.unit', { n: unit.index })}</span>}
          </div>
        </div>

        {failed && <div className="sat-notice sat-notice--err">{t('sat.loadError')}</div>}
        {!failed && !data && <div className="sat-notice">{t('sat.pageLoading')}</div>}
        {data && !unit && <SatUnits data={data} best={best} t={t} onOpen={open} />}
        {data && unit && (
          <SatRun
            key={`${unit.id}-${run}`}
            unit={unit}
            t={t}
            onFinish={(score) => finish(unit, score)}
            onRestart={() => open(unit)}
            onExit={() => setUnit(null)}
          />
        )}
      </div>
    </LearningLayout>
  )
}

function SatUnits({ data, best, t, onOpen }) {
  return (
    <>
      <header className="sat-head">
        <div className="sat-eyebrow">
          <span />
          {t('sat.eyebrow')}
        </div>
        <h1>
          {t('sat.title')}
          <span className="sat-dot">.</span>
        </h1>
        <p className="sat-sub">{t('sat.subtitle')}</p>
      </header>

      <div className="sat-units">
        {data.units.map((u) => {
          const total = u.questions.length
          const mcq = u.questions.filter((q) => q.format === 'mcq').length
          const score = best[u.id]
          return (
            <button key={u.id} type="button" className="sat-unit" onClick={() => onOpen(u)}>
              <span className="sat-unit__no">{String(u.index).padStart(2, '0')}</span>
              <span className="sat-unit__title">{t('sat.unit', { n: u.index })}</span>
              <span className="sat-unit__range">{t('sat.range', { from: u.range[0], to: u.range[1] })}</span>
              <span className="sat-unit__mix">{t('sat.mix', { mcq, spr: total - mcq })}</span>
              {score != null && (
                <span className="sat-unit__bar" aria-hidden="true">
                  <i style={{ width: `${(score / total) * 100}%` }} />
                </span>
              )}
              <span className={'sat-unit__best' + (score != null ? ' is-done' : '')}>
                {score != null ? t('sat.best', { score, total }) : t('sat.notStarted')}
              </span>
              <span className="sat-unit__go">{score != null ? t('sat.again') : t('sat.start')} →</span>
            </button>
          )
        })}
      </div>

      <p className="sat-source">{t('sat.source')}</p>
    </>
  )
}

function SatRun({ unit, t, onFinish, onRestart, onExit }) {
  const questions = unit.questions
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  // null — ещё не проверяли; true/false — вердикт по текущему вопросу.
  const [verdict, setVerdict] = useState(null)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const cardRef = useRef(null)

  const q = questions[idx]
  const last = idx === questions.length - 1

  // Следующую картинку подгружаем заранее: на медленной сети иначе после
  // «Дальше» секунду висит пустая карточка.
  useEffect(() => {
    const nextQ = questions[idx + 1]
    if (nextQ) new Image().src = BASE + nextQ.image
  }, [idx, questions])

  const check = () => {
    if (verdict !== null || !value) return
    if (q.format === 'spr' && !parseNumber(value)) {
      setError(t('sat.notNumber'))
      return
    }
    const ok = checkAnswer(q, value)
    setVerdict(ok)
    setResults((r) => [...r, ok])
  }

  const next = () => {
    if (verdict === null) return
    if (last) {
      onFinish(results.filter(Boolean).length)
      setFinished(true)
      return
    }
    setIdx(idx + 1)
    setValue('')
    setError('')
    setVerdict(null)
    cardRef.current?.scrollIntoView({ block: 'nearest' })
  }

  // Клавиатура как в тренажёрах Практики: A–D выбирают вариант, Enter — проверка
  // и переход. В поле ввода Enter обрабатывает сама форма. preventDefault на
  // Enter обязателен: иначе браузер ещё и «нажмёт» кнопку в фокусе, и после
  // проверки сразу перескочит на следующий вопрос.
  // Подписка без массива зависимостей — обработчику нужны свежие check/next.
  useEffect(() => {
    if (finished) return undefined
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (verdict === null) check()
        else next()
        return
      }
      const letter = e.key.toUpperCase()
      if (q.format === 'mcq' && verdict === null && LETTERS.includes(letter)) setValue(letter)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (finished) {
    const score = results.filter(Boolean).length
    return (
      <section className="sat-result">
        <h2>{t('sat.resultTitle', { n: unit.index })}</h2>
        <div className="sat-result__score">{t('sat.resultScore', { score, total: questions.length })}</div>
        <ol className="sat-result__grid" aria-label={t('sat.resultHint')}>
          {questions.map((qq, i) => (
            <li key={qq.id} className={results[i] ? 'is-ok' : 'is-err'} title={results[i] ? t('sat.correct') : t('sat.wrong')}>
              {qq.number}
            </li>
          ))}
        </ol>
        <p className="sat-result__hint">{t('sat.resultHint')}</p>
        <div className="sat-actions">
          <button type="button" className="sat-btn sat-btn--primary" onClick={onRestart}>
            {t('sat.again')}
          </button>
          <button type="button" className="sat-btn" onClick={onExit}>
            {t('sat.toUnits')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="sat-run">
      <div className="sat-progress">
        <span>{t('sat.progress', { n: idx + 1, total: questions.length })}</span>
        <span className="sat-progress__bar" aria-hidden="true">
          <i style={{ width: `${((idx + (verdict !== null ? 1 : 0)) / questions.length) * 100}%` }} />
        </span>
      </div>

      <div className="sat-card" ref={cardRef}>
        {/* eslint-disable-next-line @next/next/no-img-element -- кадры вопросов пережаты офлайн (WebP) и лежат в public: next/image добавил бы прокси без выигрыша. */}
        <img
          className="sat-card__img"
          src={BASE + q.image}
          width={q.width}
          height={q.height}
          alt={t('sat.questionAlt', { n: q.number })}
        />
      </div>

      {q.format === 'mcq' ? (
        <div className="sat-choices" role="radiogroup" aria-label={t('sat.chooseHint')}>
          {LETTERS.map((l) => {
            let cls = 'sat-choice'
            if (value === l) cls += ' is-picked'
            if (verdict !== null && l === q.answer) cls += ' is-ok'
            if (verdict === false && value === l) cls += ' is-err'
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={value === l}
                className={cls}
                disabled={verdict !== null}
                onClick={() => setValue(l)}
              >
                {l}
              </button>
            )
          })}
        </div>
      ) : (
        <form
          className="sat-input"
          onSubmit={(e) => {
            e.preventDefault()
            if (verdict === null) check()
            else next()
          }}
        >
          <label htmlFor="sat-answer">{t('sat.inputLabel')}</label>
          <input
            id="sat-answer"
            type="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            value={value}
            readOnly={verdict !== null}
            aria-invalid={!!error}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
          />
          <small className={error ? 'is-err' : ''}>{error || t('sat.inputHint')}</small>
        </form>
      )}

      {verdict !== null && (
        <div className={'sat-verdict ' + (verdict ? 'is-ok' : 'is-err')} role="status">
          <b>{verdict ? t('sat.correct') : t('sat.wrong')}</b>
          {!verdict && <span>{t('sat.rightAnswer', { answer: formatAnswer(q, t('sat.or')) })}</span>}
        </div>
      )}

      <div className="sat-actions">
        {verdict === null ? (
          <button type="button" className="sat-btn sat-btn--primary" disabled={!value} onClick={check}>
            {t('sat.check')}
          </button>
        ) : (
          <button type="button" className="sat-btn sat-btn--primary" onClick={next} autoFocus>
            {last ? t('sat.finish') : t('sat.next')}
          </button>
        )}
      </div>
    </section>
  )
}
