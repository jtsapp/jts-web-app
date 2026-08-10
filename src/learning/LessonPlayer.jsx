import { useState, useRef, useEffect, useMemo } from 'react'
import { useI18n } from '../i18n.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { recordSkill } from '../practice/skillStats.js'

// Нативный плеер урока «Обучения» (Kingdom lessons) — порт hosted-Speakout-урока
// (window.TASKS + движок show/render/grade) на React. Заменяет iframe в
// KingdomInteriorPage. Данные — из public/learning/<level>.json (экстрактор
// scripts/extract-kingdom-lessons.js).
//
// Оцениваются choice/gap/chips (верно → монеты, неверно → минус сердце);
// check/listen/info/watch — информационные (кнопка «Продолжить»). Сердца
// локальные для попытки (3 при входе, 0 → провал) — как в исходном уроке.

const REWARD = 10 // монет за верный ответ (как в /api/hl мосте)
const START_HEARTS = 3
const GRADED = new Set(['choice', 'gap', 'chips', 'order', 'multi'])

// Нормализация текстового ответа (как norm() в ActivityPlayer/движке).
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Секция-кикер "3. Grammar · be" → {num, label}.
function splitSec(sec) {
  const m = /^\s*(\d+)\.\s*(.*)$/.exec(sec || '')
  return m ? { num: m[1], label: m[2] } : { num: '', label: sec || '' }
}

// Навыки, засчитываемые за одно graded-задание урока. type=gap (ввод) считаем и
// за предметный навык по sec, и за Writing. type=listen — Listening.
function skillsForTask(task) {
  const label = splitSec(task?.sec).label.toLowerCase()
  const out = new Set()
  if (task?.type === 'listen' || /listen|numbers/.test(label)) out.add('listening')
  if (/grammar/.test(label)) out.add('grammar')
  if (/vocab/.test(label)) out.add('vocab')
  if (task?.type === 'gap') out.add('writing')
  return [...out]
}

export default function LessonPlayer({ lesson, level, token, onExit, onDone }) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [points, setPoints] = useState(0)
  const [hearts, setHearts] = useState(START_HEARTS)
  const endedRef = useRef(false)

  const tasks = lesson.tasks || []
  const total = tasks.length

  // Завершение (успех/провал) — репортим наверх один раз. Провал: сердца на 0.
  const reportDone = (outcome) => {
    if (endedRef.current) return
    endedRef.current = true
    const answered = correct + wrong
    onDone({
      outcome,
      correct,
      wrong,
      points,
      accuracy: answered ? Math.round((correct / answered) * 100) : 100,
    })
  }

  const advance = () => {
    if (idx + 1 >= total) reportDone('success')
    else setIdx((i) => i + 1)
  }

  const onGraded = (ok) => {
    if (ok) {
      setCorrect((c) => c + 1)
      setPoints((p) => p + REWARD)
    } else {
      setWrong((w) => w + 1)
      setHearts((h) => Math.max(0, h - 1))
    }
  }

  // Провал ловим на переходе сердец к 0 (после фидбэка — плеер даёт увидеть
  // правильный ответ, затем «Продолжить» уводит на экран провала).
  const failPending = hearts <= 0

  const task = tasks[idx]
  if (!task) return null

  const pct = Math.round((idx / Math.max(1, total)) * 100)

  return (
    <div className="kl">
      <div className="kl__hud">
        <button className="kl__back" onClick={onExit} aria-label={t('common.back')}>
          <ChevronLeftIcon size={18} />
        </button>
        <div className="kl__bar">
          <div className="kl__bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="kl__hearts" aria-label={t('lesson.hearts')}>
          <span className="kl__heart">❤</span>
          <b>{hearts}</b>
        </div>
      </div>

      <LessonTask
        key={idx}
        task={task}
        graded={GRADED.has(task.type)}
        onGraded={onGraded}
        onContinue={failPending ? () => reportDone('fail') : advance}
        t={t}
      />
    </div>
  )
}

// Оболочка задания: кикер, заголовок, тело по типу, фидбэк, футер.
function LessonTask({ task, graded, onGraded, onContinue, t }) {
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null) // {ok, answer?}
  const [canCheck, setCanCheck] = useState(!graded) // инфо-типы сразу активны
  const checkRef = useRef(null)
  const firedRef = useRef(false)
  const sec = splitSec(task.sec)

  const finish = (ok, shownAnswer) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, answer: shownAnswer || '' })
    if (graded) for (const s of skillsForTask(task)) recordSkill(s, ok)
    onGraded(ok)
  }
  const bind = (fn) => (checkRef.current = fn)

  return (
    <div className="kl-task">
      <div className="kl-task__scroll">
        {(sec.label || sec.num) && (
          <div className="kl-kicker">
            {sec.num && <b>{sec.num}</b>}
            {sec.label}
          </div>
        )}
        {task.title && <h2 className="kl-task__title">{task.title}</h2>}
        {task.sub && <p className="kl-task__sub">{task.sub}</p>}

        <div className="kl-task__body">
          <TaskBody task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
        </div>
      </div>

      {feedback && graded && (
        <div className={`kl-fb ${feedback.ok ? 'ok' : 'no'}`}>
          <span className="kl-fb__ic">{feedback.ok ? '✓' : '✕'}</span>
          <div className="kl-fb__text">
            <b>{feedback.ok ? t('lesson.correct') : t('lesson.wrong')}</b>
            {!feedback.ok && feedback.answer && (
              <span className="kl-fb__ans">{t('lesson.answerWas')}: {feedback.answer}</span>
            )}
          </div>
          {feedback.ok && (
            <span className="kl-reward">
              <img className="kl-reward__coin" src="/assets/lesson/coin.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />+{REWARD}
            </span>
          )}
        </div>
      )}

      <div className="kl-task__foot">
        {!graded || answered ? (
          <button className="kl-btn" onClick={onContinue} autoFocus>
            {t('lesson.continue')}
          </button>
        ) : (
          <button className="kl-btn" disabled={!canCheck} onClick={() => checkRef.current && checkRef.current()}>
            {t('lesson.check')}
          </button>
        )}
      </div>
    </div>
  )
}

function TaskBody({ task, answered, finish, setCanCheck, bind, t }) {
  switch (task.type) {
    case 'choice':
      return <Choice task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} />
    case 'chips':
      return <Chips task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
    case 'gap':
      return <Gap task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
    case 'order':
      return <Order task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
    case 'multi':
      return <Multi task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} />
    case 'check':
      return <Check task={task} />
    case 'listen':
      return <Listen task={task} />
    case 'watch':
      return <Watch task={task} />
    case 'info':
      return <Info task={task} />
    default:
      return null
  }
}

// ——— choice ———
function Choice({ task, answered, finish, setCanCheck, bind }) {
  const options = useMemo(() => shuffle(task.options || []), [task])
  const [picked, setPicked] = useState(null)
  useEffect(() => setCanCheck(picked !== null && !answered), [picked, answered, setCanCheck])
  bind(() => {
    if (answered || picked === null) return
    finish(options[picked] === task.answer, task.answer)
  })
  return (
    <>
      {task.visual && <div className="kl-visual">{task.visual}</div>}
      {task.word && <div className="kl-word">{task.word}</div>}
      <div className={`kl-opts ${task.two ? 'kl-opts--two' : ''}`}>
        {options.map((o, i) => {
          let cls = 'kl-opt'
          if (picked === i && !answered) cls += ' sel'
          if (answered) {
            if (o === task.answer) cls += ' correct'
            else if (i === picked) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} disabled={answered} onClick={() => !answered && setPicked(i)}>
              {o}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ——— chips (собрать пропуск из банка слов) ———
function Chips({ task, answered, finish, setCanCheck, bind }) {
  const bank = useMemo(() => shuffle(task.bank || []), [task])
  const [picked, setPicked] = useState(null)
  useEffect(() => setCanCheck(picked !== null && !answered), [picked, answered, setCanCheck])
  bind(() => {
    if (answered || picked === null) return
    finish(bank[picked] === task.answer, task.answer)
  })
  const chosen = picked !== null ? bank[picked] : null
  return (
    <>
      <div className="kl-sentence">
        {task.gapBefore}
        <span className={`kl-gap ${answered ? (chosen === task.answer ? 'ok' : 'no') : chosen ? 'filled' : ''}`}>
          {answered ? task.answer : chosen || '____'}
        </span>
        {task.gapAfter}
      </div>
      <div className="kl-bank">
        {bank.map((w, i) => (
          <button key={i} className={`kl-chip ${picked === i ? 'sel' : ''}`} disabled={answered} onClick={() => !answered && setPicked((p) => (p === i ? null : i))}>
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// ——— gap (вписать пропуск) ———
function Gap({ task, answered, finish, setCanCheck, bind, t }) {
  const [value, setValue] = useState('')
  const [shown, setShown] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => setCanCheck(value.trim() !== '' && !answered), [value, answered, setCanCheck])
  useEffect(() => {
    const el = inputRef.current
    if (el) setTimeout(() => el.focus(), 200)
  }, [])
  const check = () => {
    if (answered || !value.trim()) return
    const good = (task.answers || []).map(norm)
    const ok = good.includes(norm(value))
    if (!ok) setShown(task.answers && task.answers[0])
    finish(ok, task.answers ? task.answers.join(' / ') : '')
  }
  bind(check)
  const cls = answered ? (shown === null ? 'ok' : 'no') : ''
  return (
    <div className="kl-sentence">
      {task.gapBefore}
      <input
        ref={inputRef}
        className={`kl-gap-input ${cls}`}
        value={shown !== null ? shown : value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && check()}
        disabled={answered}
        autoComplete="off"
        spellCheck="false"
        aria-label={t('lesson.yourAnswer')}
        placeholder="…"
      />
      {task.gapAfter}
    </div>
  )
}

// ——— order (собрать предложение из слов) ———
function Order({ task, answered, finish, setCanCheck, bind, t }) {
  const words = task.words || []
  const expected = task.answer || []
  const [picked, setPicked] = useState([]) // индексы слов в порядке нажатия
  // words.length > 0: при пустом банке слов длины (0 === 0) совпадают сразу же,
  // без единого клика — без этого условия задание засчиталось бы бесплатно.
  useEffect(
    () => setCanCheck(words.length > 0 && picked.length === words.length && !answered),
    [picked, words.length, answered, setCanCheck],
  )

  const line = picked.map((i) => words[i])
  // Та же защита от пустого банка — и в обработчике клика, если он всё же
  // будет вызван программно в обход отключённой кнопки.
  bind(() => {
    if (answered || words.length === 0 || picked.length !== words.length) return
    finish(line.every((w, i) => w === expected[i]), expected.join(' '))
  })

  // Верно/неверно считаем и для рамки-подсказки той же формулой, что и в bind() —
  // picked после ответа больше не меняется, поэтому пересчёт на рендере безопасен.
  const isCorrect = line.length === expected.length && line.every((w, i) => w === expected[i])

  return (
    <>
      {task.word && <div className="kl-word">{task.word}</div>}
      <div className={`kl-order__line ${answered ? `done ${isCorrect ? 'ok' : 'no'}` : ''}`}>
        {line.length ? line.join(' ') : <span className="kl-order__ph">{t('lesson.order.hint')}</span>}
      </div>
      <div className="kl-bank">
        {words.map((w, i) => (
          <button
            key={i}
            className={`kl-chip ${picked.includes(i) ? 'sel' : ''}`}
            disabled={answered}
            onClick={() => !answered && setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// ——— multi (отметить несколько верных) ———
function Multi({ task, answered, finish, setCanCheck, bind, t }) {
  const options = task.options || []
  const [picked, setPicked] = useState([])
  useEffect(() => setCanCheck(picked.length > 0 && !answered), [picked, answered, setCanCheck])

  const expected = task.answer || []
  bind(() => {
    if (answered || !picked.length) return
    const mine = [...picked].sort((a, b) => a - b)
    const ok = mine.length === expected.length && mine.every((v, i) => v === expected[i])
    finish(ok, expected.map((i) => options[i]).join(', '))
  })

  return (
    <>
      {task.word && <div className="kl-word">{task.word}</div>}
      <div className="kl-multi__hint">{t('lesson.multi.hint')}</div>
      {/* kl-multi (модификатор для kl-opts) убран — не нёс правил в styles.css,
          как и kl-order на банке слов в прошлой находке; вся раскладка уже
          даёт kl-opts, множественность отметки — aria-pressed на кнопках. */}
      <div className="kl-opts">
        {options.map((o, i) => {
          let cls = 'kl-opt'
          if (picked.includes(i) && !answered) cls += ' sel'
          if (answered) {
            if (expected.includes(i)) cls += ' correct'
            else if (picked.includes(i)) cls += ' wrong'
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={answered}
              // aria-pressed — состояние отметки для скринридера: в отличие от choice
              // (один вариант, взаимоисключающий выбор), здесь несколько кнопок могут
              // быть отмечены одновременно, и это нельзя передать только цветом/фоном.
              aria-pressed={picked.includes(i)}
              onClick={() => !answered && setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
            >
              {o}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ——— check (чек-лист самопроверки, не оценивается) ———
function Check({ task }) {
  const [ticked, setTicked] = useState({})
  return (
    <div className="kl-check">
      {(task.items || []).map((it, i) => (
        <button key={i} className={`kl-check__item ${ticked[i] ? 'on' : ''}`} onClick={() => setTicked((s) => ({ ...s, [i]: !s[i] }))}>
          <span className="kl-check__box">{ticked[i] ? '✓' : ''}</span>
          <span>{it}</span>
        </button>
      ))}
    </div>
  )
}

// ——— listen (аудио-плеер) ———
function Listen({ task }) {
  return (
    <div className="kl-listen">
      {(task.tracks || []).map((tr, i) => (
        <div key={i} className="kl-track">
          <div className="kl-track__label">{tr.label}</div>
          <audio className="kl-audio" src={tr.src} controls preload="none" />
        </div>
      ))}
    </div>
  )
}

// ——— watch (видео) ———
function Watch({ task }) {
  if (!task.src) return <div className="kl-note">{task.vtitle || ''}</div>
  return (
    <div className="kl-watch">
      {task.vtitle && <div className="kl-watch__title">{task.vtitle}</div>}
      <video className="kl-video" src={task.src} controls preload="metadata" playsInline />
    </div>
  )
}

// ——— info (rich-контент, классы префиксованы l- экстрактором) ———
function Info({ task }) {
  return <div className="kl-info" dangerouslySetInnerHTML={{ __html: task.html || '' }} />
}
