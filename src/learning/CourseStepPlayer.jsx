import { useEffect, useMemo, useRef, useState } from 'react'
import AssetImage from '../components/AssetImage.jsx'
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
// В макете крупная фиолетовая строка — всегда сам вопрос, а тёмная поменьше —
// инструкция к нему. У заданий без правильного ответа вопрос стоит первым
// («Pick anything you like» / «I can …»), у проверяемых — под инструкцией.
const PROMPT_FIRST = new Set(['pick', 'write', 'checklist'])

// Ответ на впиши-пропуск сверяем без учёта регистра и знаков — как в старом
// плеере заданий: студент печатает руками, и точка в конце не ошибка.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Предложение шага «впиши пропуск» целиком: в макете оно стоит вопросом, а поле
// ответа — отдельным блоком под ним. Пропуск дорисовываем только если его нет в
// самих данных — у части уроков он уже стоит внутри половинки.
function gapSentence(step) {
  const before = String(step.before || '').trim()
  const after = String(step.after || '').trim()
  const joined = `${before} ${after}`.replace(/\s+/g, ' ').trim()
  if (/_{2,}/.test(joined)) return joined
  return `${before} ___ ${after}`.replace(/\s+/g, ' ').trim()
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

  // Шаг «впиши пропуск» в макете показывает предложение целиком крупной
  // строкой, а поле ответа стоит отдельным блоком под ним — поэтому склеиваем
  // половинки в вопрос, а не режем строку полем посередине.
  const promptFirst = PROMPT_FIRST.has(step.type)
  const big = step.type === 'gap' ? gapSentence(step) : promptFirst ? step.title : step.prompt || step.sub
  const small = promptFirst ? step.sub : step.title

  return (
    <>
      <div className="cp-step">
        {/* Слайд правила несёт заголовок внутри карточки — в макете над ней
            ничего нет. */}
        {step.type !== 'note' &&
          (promptFirst ? (
            <>
              {big && <div className="cp-step__prompt">{big}</div>}
              {small && <h2 className="cp-step__title">{small}</h2>}
            </>
          ) : (
            <>
              {small && <h2 className="cp-step__title">{small}</h2>}
              {big && <div className="cp-step__prompt">{big}</div>}
            </>
          ))}

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
    // Впиши пропущенное: само предложение ушло в вопрос, здесь только поле.
    case 'gap':
      return (
        <input
          className={`cp-field cp-gap__in ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}
          value={checked && !isRight ? step.answers[0] : text}
          onChange={(e) => setText(e.target.value)}
          disabled={checked}
          autoComplete="off"
          spellCheck="false"
          placeholder={t('lesson.typeAnswer')}
        />
      )

    // Порядок слов: банк снизу, собранная фраза сверху — слова остаются
    // плашками и на строке ответа, как в макете.
    case 'order':
      return (
        <div className="cp-order">
          <div className={`cp-order__line ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}>
            {seq.length ? (
              seq.map((i) => (
                <span key={i} className="cp-chip is-set">
                  {step.words[i]}
                </span>
              ))
            ) : (
              <span className="cp-order__ph">…</span>
            )}
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
      return (
        <div className="cp-note">
          {step.title && <h2 className="cp-note__h">{step.title}</h2>}
          <div className="cp-note__body" dangerouslySetInnerHTML={{ __html: step.html || '' }} />
        </div>
      )

    case 'listen':
      return (
        <>
          {/* У курса (A2/B1) дорожка лежит рядом с уроком и известна по имени,
              у A0/A1 в задании сразу абсолютный URL на files-dev. */}
          <AudioButton src={step.src || `/course/${String(level).toLowerCase()}/audio/${step.track}`} t={t} />
          {/* На слух варианты в макете лежат в две колонки: слово короткое,
              и колонкой во всю высоту экрана оно смотрелось бы пусто. */}
          <Choices options={options} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} grid />
        </>
      )

    case 'choice':
      return <Choices options={options} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} />

    case 'write':
      return (
        <>
          <textarea
            className="cp-field cp-write"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={step.placeholder || t('lesson.typeAnswer')}
            rows={1}
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

function Choices({ options, picked, setPicked, checked, answer, grid = false }) {
  return (
    <div className={`cp-choices ${grid ? 'is-grid' : ''}`}>
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
            {w.img ? <AssetImage src={w.img} alt="" loading="lazy" /> : <span className="cp-word__noimg">{w.en}</span>}
          </span>
          {/* Оборот карточки в макете — не одна строка перевода: сверху слово с
              определением, под ним переводы отдельными плашками. */}
          <span className="cp-word__back">
            <span className="cp-word__head">
              <b>{w.en}</b>
              {w.def && <i>{w.def}</i>}
            </span>
            <span className="cp-word__trs">
              <span className="cp-word__tr">{w.ru}</span>
              {w.kk && <span className="cp-word__tr">{w.kk}</span>}
            </span>
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
          <span>{it}</span>
          <span className="cp-check__box" aria-hidden="true">
            {on[i] ? '✓' : ''}
          </span>
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="cp-audio__slow" onClick={() => play(0.6)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17h5a5 5 0 0 1 5-5 5 5 0 0 1 5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M16 12V8m3 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {t('lesson.playSlow')}
      </button>
    </div>
  )
}
