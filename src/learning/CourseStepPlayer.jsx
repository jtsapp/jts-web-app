import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'

// Пошаговый плеер урока (макет Figma «Обучение», секции Warm-up … Wrap).
//
// Урок — очередь экранов: одно задание на экран, сверху прогресс и сердца,
// снизу одна кнопка. Данные готовит scripts/build-course-steps.js из уроков
// перенесённого курса, поэтому здесь нет ни его разметки, ни его движка.
//
// Оценивается только то, у чего есть правильный ответ (choice/listen): верно —
// монеты, неверно — минус сердце. Слова, слайды правила, свободный ответ и
// чек-лист идут без оценки, как и в макете.

const REWARD = 10
const START_HEARTS = 3
const GRADED = new Set(['choice', 'listen', 'gap', 'order'])

// Ответ на впиши-пропуск сверяем без учёта регистра и знаков — как в старом
// плеере заданий: студент печатает руками, и точка в конце не ошибка.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shuffle(arr, seed) {
  // Порядок вариантов фиксирован для шага: без seed React перемешивал бы их на
  // каждый ререндер (например, после выбора ответа).
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CourseStepPlayer({ steps, title, subtitle, level, passRatio = null, onExit, onDone }) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [points, setPoints] = useState(0)
  const [hearts, setHearts] = useState(START_HEARTS)
  const endedRef = useRef(false)

  const total = steps.length
  const step = steps[idx]

  // Юнит-тест сдаётся долей верных ответов (passRatio из данных теста), а не
  // тремя сердцами: два десятка вопросов подряд без права на три ошибки — это
  // лотерея, а не проверка. В тесте сердца не тратятся, исход считается в конце.
  const exam = passRatio != null
  const reportDone = (outcome) => {
    if (endedRef.current) return
    endedRef.current = true
    const answered = correct + wrong
    const acc = answered ? Math.round((correct / answered) * 100) : 100
    onDone?.({
      outcome: exam ? (acc >= passRatio * 100 ? 'success' : 'fail') : outcome,
      correct,
      wrong,
      points,
      accuracy: acc,
    })
  }

  const advance = () => {
    if (!exam && hearts <= 0) reportDone('fail')
    else if (idx + 1 >= total) reportDone('success')
    else setIdx((i) => i + 1)
  }

  if (!step) return null

  return (
    <div className="cp">
      <div className="cp-bar">
        <button className="cp-bar__exit" onClick={onExit}>
          {t('lesson.exitLesson')}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="m9 9 6 6m0-6-6 6" stroke="#9047ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="cp-bar__place">
          <b>{step.stage}</b>
          <span>{title}</span>
        </div>
        <button className="cp-bar__dict" type="button" disabled>
          {t('nav.vocab')}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 7h7M8 11h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="cp-scroll">
        <div className="cp-hud">
          <div className="cp-hud__track">
            <div className="cp-hud__fill" style={{ width: `${Math.round((idx / Math.max(1, total)) * 100)}%` }} />
          </div>
          <div className="cp-hud__hearts" aria-label={t('lesson.hearts')}>
            <span className="cp-hud__heart" aria-hidden="true">
              ❤
            </span>
            <b>{hearts}</b>
          </div>
        </div>

        <Step
          key={idx}
          step={step}
          seed={idx + 1}
          level={level}
          onAdvance={advance}
          onGraded={(ok) => {
            if (ok) {
              setCorrect((c) => c + 1)
              setPoints((p) => p + REWARD)
            } else {
              setWrong((w) => w + 1)
              if (!exam) setHearts((h) => Math.max(0, h - 1))
            }
          }}
          t={t}
        />
      </div>
    </div>
  )
}

// Один экран задания: тело по типу шага, снизу кнопка «Проверить»/«Продолжить»
// и, после проверки, плашка результата.
function Step({ step, seed, level, onAdvance, onGraded, t }) {
  const graded = GRADED.has(step.type)
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)

  const options = useMemo(
    () => (step.options ? shuffle(step.options, seed * 7919) : []),
    [step, seed],
  )
  // Собранная фраза шага «порядок слов».
  const [seq, setSeq] = useState([])

  const verdict = () => {
    if (step.type === 'gap') return (step.answers || []).some((a) => norm(a) === norm(text))
    if (step.type === 'order') return norm(seq.map((i) => step.words[i]).join(' ')) === norm(step.answer)
    return picked !== null && options[picked] === step.answer
  }
  const isRight = checked && verdict()

  // Кнопка: пока не проверено — «Проверить» (голубая), после и у неоценённых
  // шагов — «Продолжить» (фиолетовая), как в макете.
  const canCheck = graded
    ? step.type === 'gap'
      ? text.trim() !== ''
      : step.type === 'order'
        ? seq.length === (step.words || []).length
        : picked !== null
    : step.type === 'write'
      ? text.trim() !== ''
      : true
  const showCheck = graded ? !checked : step.type === 'write' && !revealed && !!step.model

  const act = () => {
    if (showCheck) {
      if (graded) {
        setChecked(true)
        onGraded(verdict())
      } else setRevealed(true)
      return
    }
    onAdvance()
  }

  return (
    <>
      {/* У шагов без правильного ответа вопрос сам по себе крупный и
          фиолетовый, а пояснение под ним — тёмное (в макете «Pick anything you
          like» / «No right or wrong»); у проверяемых наоборот: сверху
          инструкция, под ней крупным — сам вопрос. */}
      <div className="cp-step">
        {step.type === 'pick' ? (
          <>
            <div className="cp-step__prompt">{step.title}</div>
            {step.sub && <h2 className="cp-step__title">{step.sub}</h2>}
          </>
        ) : (
          <>
            {step.title && <h2 className="cp-step__title">{step.title}</h2>}
            {step.prompt && <div className="cp-step__prompt">{step.prompt}</div>}
            {step.sub && !step.prompt && <p className="cp-step__sub">{step.sub}</p>}
          </>
        )}

        <StepBody
          step={step}
          options={options}
          picked={picked}
          setPicked={setPicked}
          checked={checked}
          text={text}
          setText={setText}
          seq={seq}
          setSeq={setSeq}
          isRight={isRight}
          revealed={revealed}
          level={level}
          t={t}
        />
      </div>

      {checked && (
        <div className={`cp-fb ${isRight ? 'is-ok' : 'is-no'}`}>
          <span className="cp-fb__ic" aria-hidden="true">
            {isRight ? '✓' : '✕'}
          </span>
          <b>{isRight ? t('lesson.correct') : t('lesson.wrong')}</b>
          {isRight && <span className="cp-fb__coin">+{REWARD}</span>}
        </div>
      )}

      <div className="cp-foot">
        <button className={`cp-cta ${showCheck ? 'is-check' : 'is-go'}`} disabled={!canCheck} onClick={act}>
          {showCheck ? t('lesson.check') : step.type === 'checklist' ? t('lesson.finish') : t('lesson.continue')}
        </button>
      </div>
    </>
  )
}

function StepBody({ step, options, picked, setPicked, checked, text, setText, seq, setSeq, isRight, revealed, level, t }) {
  switch (step.type) {
    // Впиши пропущенное: предложение с полем посередине.
    case 'gap':
      return (
        <div className="cp-gap">
          <span>{step.before}</span>
          <input
            className={`cp-gap__in ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}
            value={checked && !isRight ? step.answers[0] : text}
            onChange={(e) => setText(e.target.value)}
            disabled={checked}
            autoComplete="off"
            spellCheck="false"
            placeholder="…"
          />
          <span>{step.after}</span>
        </div>
      )

    // Порядок слов: банк снизу, собранная фраза сверху.
    case 'order':
      return (
        <div className="cp-order">
          <div className={`cp-order__line ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}>
            {seq.length ? seq.map((i) => step.words[i]).join(' ') : '…'}
          </div>
          <div className="cp-order__bank">
            {(step.words || []).map((w, i) => (
              <button
                key={i}
                className="cp-chip"
                disabled={checked || seq.includes(i)}
                onClick={() => setSeq((s) => [...s, i])}
              >
                {w}
              </button>
            ))}
          </div>
          {!checked && seq.length > 0 && (
            <button className="cp-order__undo" onClick={() => setSeq((s) => s.slice(0, -1))}>
              ← {t('common.back')}
            </button>
          )}
        </div>
      )

    // Выбор без правильного ответа: отмечаем сколько угодно карточек.
    case 'pick':
      return <PickCards options={step.options} />

    // Слова урока: карточка переворачивается на перевод по клику.
    case 'cards':
      return <WordCards words={step.words} />

    case 'note':
      return <div className="cp-note" dangerouslySetInnerHTML={{ __html: step.html || '' }} />

    case 'listen':
      return (
        <>
          <AudioButton src={`/course/${String(level).toLowerCase()}/audio/${step.track}`} t={t} />
          <Choices options={options} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} />
        </>
      )

    case 'choice':
      return <Choices options={options} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} />

    case 'write':
      return (
        <>
          <textarea
            className="cp-write"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={step.placeholder || '…'}
            rows={3}
          />
          {revealed && step.model && (
            <div className="cp-model">
              <b>{t('lesson.modelAnswer')}</b>
              <span>{step.model}</span>
            </div>
          )}
        </>
      )

    case 'checklist':
      return <Checklist items={step.items} />

    default:
      return null
  }
}

function Choices({ options, picked, setPicked, checked, answer }) {
  return (
    <div className="cp-choices">
      {options.map((o, i) => {
        let cls = 'cp-choice'
        if (checked) {
          if (o === answer) cls += ' is-right'
          else if (i === picked) cls += ' is-wrong'
        } else if (i === picked) cls += ' is-sel'
        return (
          <button key={i} className={cls} disabled={checked} onClick={() => setPicked(i)}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

function PickCards({ options }) {
  const [on, setOn] = useState({})
  return (
    <div className="cp-picks">
      {(options || []).map((o, i) => (
        <button key={i} className={`cp-pick ${on[i] ? 'is-on' : ''}`} onClick={() => setOn((s) => ({ ...s, [i]: !s[i] }))}>
          {o.emoji && <span className="cp-pick__emoji">{o.emoji}</span>}
          <span className="cp-pick__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

function WordCards({ words }) {
  const [open, setOpen] = useState({})
  return (
    <div className="cp-words">
      {(words || []).map((w, i) => (
        <button key={i} className={`cp-word ${open[i] ? 'is-open' : ''}`} onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))}>
          <span className="cp-word__face">
            {w.img ? <img src={w.img} alt="" loading="lazy" /> : <span className="cp-word__noimg">{w.en}</span>}
          </span>
          <span className="cp-word__back">
            <b>{w.ru}</b>
            {w.kk && <span>{w.kk}</span>}
          </span>
          <span className="cp-word__label">{w.en}</span>
        </button>
      ))}
    </div>
  )
}

function Checklist({ items }) {
  const [on, setOn] = useState({})
  return (
    <div className="cp-check">
      {(items || []).map((it, i) => (
        <button key={i} className={`cp-check__row ${on[i] ? 'is-on' : ''}`} onClick={() => setOn((s) => ({ ...s, [i]: !s[i] }))}>
          <span className="cp-check__box" aria-hidden="true">
            {on[i] ? '✓' : ''}
          </span>
          <span>{it}</span>
        </button>
      ))}
    </div>
  )
}

// Аудио стадии слушания: обычная скорость и замедленная — как в макете.
function AudioButton({ src, t }) {
  const ref = useRef(null)
  useEffect(() => () => ref.current?.pause(), [])
  const play = (rate) => {
    const a = ref.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    a.playbackRate = rate
    a.play().catch(() => {})
  }
  return (
    <div className="cp-audio">
      <audio ref={ref} src={src} preload="none" />
      <button className="cp-audio__play" onClick={() => play(1)} aria-label={t('lesson.play')}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="cp-audio__slow" onClick={() => play(0.6)}>
        {t('lesson.playSlow')}
      </button>
    </div>
  )
}
