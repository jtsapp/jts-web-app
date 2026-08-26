import { useState, useRef, useEffect, useMemo } from 'react'
import { useI18n } from '../i18n.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { recordSkill } from '../practice/skillStats.js'
import { answerMatches, normAnswer } from '../lib/answer-match.js'
import { isTapSelection, isPhraseSelection, isOversizedPhrase } from '../lib/wordTranslate.js'
import { useTapTranslate } from '../screens/workspace/useTapTranslate.js'
import TapText from '../screens/workspace/TapText.jsx'
import TappableHtml from '../screens/workspace/TappableHtml.jsx'
import TranslatePopover from '../screens/workspace/TranslatePopover.jsx'

// Нативный плеер урока «Обучения» (Kingdom lessons) — порт hosted-Speakout-урока
// (window.TASKS + движок show/render/grade) на React. Заменяет iframe в
// KingdomInteriorPage. Данные — из public/learning/<level>.json (экстрактор
// scripts/extract-kingdom-lessons.js).
//
// Оцениваются choice/gap/chips (верно → монеты); check/listen/info/watch —
// информационные (кнопка «Продолжить»).
//
// Сердец нет: ошибка стоит монет и процента в итогах, но урок не обрывает.
// Раньше три промаха выбрасывали студента с середины урока, и всё пройденное
// до этого приходилось проходить заново.

const REWARD = 10 // монет за верный ответ (как в /api/hl мосте)
const GRADED = new Set(['choice', 'gap', 'chips'])

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

export default function LessonPlayer({ lesson, level, token, catalogLessonId, onExit, onDone }) {
  const { t, lang } = useI18n()
  const { pop, openWord, openLimit, close, onSave } = useTapTranslate({ token, lang, source: `course:${level}`, catalogLessonId })
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [points, setPoints] = useState(0)
  const endedRef = useRef(false)

  const tasks = lesson.tasks || []
  const total = tasks.length

  // Завершение — репортим наверх один раз. Провалить урок нечем: сердец нет.
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
    }
  }

  const task = tasks[idx]
  if (!task) return null

  const pct = Math.round((idx / Math.max(1, total)) * 100)

  return (
    <div
      className="kl"
      data-selectable=""
      onClick={() => {
        const raw = window.getSelection()?.toString() || ''
        if (isTapSelection(raw) || isOversizedPhrase(raw)) return
        close()
      }}
      onMouseUp={(e) => {
        const sel = window.getSelection()
        const raw = sel?.toString() || ''
        if (isPhraseSelection(raw) || isOversizedPhrase(raw)) {
          if (!e.currentTarget.contains(sel.anchorNode)) return
          if (!sel.rangeCount) return
          const rect = sel.getRangeAt(0).getBoundingClientRect()
          if (!rect.width && !rect.height) return
          const anchor = { getBoundingClientRect: () => rect }
          if (isOversizedPhrase(raw)) openLimit(raw, anchor)
          else openWord(raw, anchor)
          return
        }
        if (raw.trim()) close()
      }}
    >
      <div className="kl__hud">
        <button className="kl__back" onClick={onExit} aria-label={t('common.back')}>
          <ChevronLeftIcon size={18} />
        </button>
        <div className="kl__bar">
          <div className="kl__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <LessonTask
        key={idx}
        task={task}
        graded={GRADED.has(task.type)}
        onGraded={onGraded}
        onContinue={advance}
        t={t}
        onWord={openWord}
      />
      <TranslatePopover pop={pop} onSave={token ? onSave : undefined} />
    </div>
  )
}

// Оболочка задания: кикер, заголовок, тело по типу, фидбэк, футер.
function LessonTask({ task, graded, onGraded, onContinue, t, onWord }) {
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
        {task.title && <TapText as="h2" className="kl-task__title" text={task.title} onWord={onWord} />}
        {task.sub && <TapText as="p" className="kl-task__sub" text={task.sub} onWord={onWord} />}

        <div className="kl-task__body">
          <TaskBody task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} onWord={onWord} />
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

function TaskBody({ task, answered, finish, setCanCheck, bind, t, onWord }) {
  switch (task.type) {
    case 'choice':
      return <Choice task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} />
    case 'chips':
      return <Chips task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} onWord={onWord} />
    case 'gap':
      return <Gap task={task} answered={answered} finish={finish} setCanCheck={setCanCheck} bind={bind} t={t} onWord={onWord} />
    case 'check':
      return <Check task={task} />
    case 'listen':
      return <Listen task={task} />
    case 'watch':
      return <Watch task={task} />
    case 'info':
      return <Info task={task} onWord={onWord} />
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
function Chips({ task, answered, finish, setCanCheck, bind, onWord }) {
  const bank = useMemo(() => shuffle(task.bank || []), [task])
  const [picked, setPicked] = useState(null)
  useEffect(() => setCanCheck(picked !== null && !answered), [picked, answered, setCanCheck])
  bind(() => {
    if (answered || picked === null) return
    finish(normAnswer(bank[picked]) === normAnswer(task.answer), task.answer)
  })
  const chosen = picked !== null ? bank[picked] : null
  return (
    <>
      <div className="kl-sentence">
        <TapText text={task.gapBefore} onWord={onWord} />
        <span className={`kl-gap ${answered ? (normAnswer(chosen) === normAnswer(task.answer) ? 'ok' : 'no') : chosen ? 'filled' : ''}`}>
          {answered ? task.answer : chosen || '____'}
        </span>
        <TapText text={task.gapAfter} onWord={onWord} />
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
function Gap({ task, answered, finish, setCanCheck, bind, t, onWord }) {
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
    // Текст вокруг пропуска — подсказка для заданий «перепиши предложение»
    // (поле в конце строки, студент печатает весь остаток).
    const ok = answerMatches(value, task.answers, `${task.gapBefore || ''} ${task.gapAfter || ''}`)
    if (!ok) setShown(task.answers && task.answers[0])
    finish(ok, task.answers ? task.answers.join(' / ') : '')
  }
  bind(check)
  const cls = answered ? (shown === null ? 'ok' : 'no') : ''
  return (
    <div className="kl-sentence">
      <TapText text={task.gapBefore} onWord={onWord} />
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
      <TapText text={task.gapAfter} onWord={onWord} />
    </div>
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
function Info({ task, onWord }) {
  return <TappableHtml className="kl-info" html={task.html || ''} onWord={onWord} />
}
