import { useEffect, useMemo, useRef, useState } from 'react'
import LangSelector from '../components/LangSelector.jsx'
import { useI18n } from '../i18n.jsx'
import { answeredCount, examQuestions, optionOrder, scoreExam, sectionQuestions } from './levelExam.js'
import { clearExamDraft, readExamDraft, saveExamDraft } from './levelExamDraft.js'

// Финальный экзамен уровня — порт data/jtsexam-<level>.html (данные и подсчёт —
// levelExam.js). Рисуется внутри KingdomInteriorPage на месте плеера урока и
// берёт у него полосу сверху (.cp-bar), поэтому корень — «cp ex».
//
// Почему не шаги плеера урока: плеер сразу показывает «верно/неверно» (на
// экзамене это подсказка), считает задание одним баллом (диалог на восемь
// пропусков стал бы одним вопросом из пятидесяти) и не умеет разбивку по
// навыкам. Здесь — как у методиста: одна страница по разделам, до конца ничего
// не подсвечивается, итог по каждому навыку и разбор ответов после.
//
// Говорения и письма нет: в оригинале их проверяет преподаватель вживую, а
// балл и там считается только по пятидесяти вопросам.

// Монеты за верный ответ — как в уроке (CourseStepPlayer, REWARD). Бэкенд
// начисляет их один раз, за первую сдачу.
const REWARD = 10

const scrollTop = () => {
  try {
    window.scrollTo({ top: 0 })
  } catch {
    /* jsdom и старые браузеры — не критично */
  }
}

export default function LevelExam({ exam, level, token, restricted = false, onExit, onPassed }) {
  const { t, lang } = useI18n()
  const lvl = String(level || exam.level).toLowerCase()
  const LEVEL = lvl.toUpperCase()

  // Черновик читаем один раз: он же решает, показывать ли «ответы сохранены».
  const [draft] = useState(() => readExamDraft(token, lvl, exam.version))
  const [answers, setAnswers] = useState(() => draft || {})
  const [restored, setRestored] = useState(() => !!draft)
  const [phase, setPhase] = useState('test') // test | result | review
  const [score, setScore] = useState(null)

  // Страница прокручивается окном, и экзамен открывался там, где стояла тропа
  // (к узлу экзамена листают до самого низа) — на тридцатом вопросе.
  useEffect(() => {
    scrollTop()
  }, [])

  const questions = useMemo(() => examQuestions(exam), [exam])
  const numById = useMemo(() => new Map(questions.map((q) => [q.id, q.num])), [questions])
  const answered = answeredCount(exam, answers)
  const complete = answered >= exam.total
  const review = phase === 'review'

  // Пишем на каждый ответ: час работы не должен зависеть от того, успел ли
  // ученик нажать «Завершить» до перезагрузки вкладки.
  useEffect(() => {
    if (phase !== 'test' || !Object.keys(answers).length) return
    saveExamDraft(token, lvl, exam.version, answers)
  }, [answers, phase, token, lvl, exam.version])

  const pick = (id, idx) => {
    if (phase !== 'test') return
    setAnswers((a) => ({ ...a, [id]: idx }))
  }

  const finish = () => {
    if (!complete) return
    const s = scoreExam(exam, answers)
    setScore(s)
    setPhase('result')
    setRestored(false)
    clearExamDraft(token, lvl)
    if (s.passed) onPassed?.(s.correct * REWARD)
    scrollTop()
  }

  const retake = () => {
    setAnswers({})
    setScore(null)
    setRestored(false)
    setPhase('test')
    clearExamDraft(token, lvl)
    scrollTop()
  }

  const showPhase = (next) => {
    setPhase(next)
    scrollTop()
  }

  // Выход без единого ответа или после итогов переспрашивать не о чем.
  const exit = () => onExit?.(phase !== 'test' || answered === 0)

  return (
    <div className="cp ex">
      <div className="cp-bar">
        <button type="button" className="cp-bar__exit" onClick={exit} aria-label={t('lesson.exitLesson')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="m9 9 6 6m0-6-6 6" stroke="#9047ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="cp-bar__label">{t('lesson.exitLesson')}</span>
        </button>
        <div className="cp-bar__place">
          <b>{t('lesson.examUnit')}</b>
          <span>{t('exam.sub', { level: LEVEL, n: exam.total })}</span>
        </div>
        <LangSelector flagOnly />
      </div>

      {phase === 'result' && score ? (
        <ExamResult
          exam={exam}
          score={score}
          level={LEVEL}
          lang={lang}
          restricted={restricted}
          t={t}
          onReview={() => showPhase('review')}
          onRetake={retake}
          onExit={() => onExit?.(true)}
        />
      ) : (
        <>
          <ExamHud exam={exam} answers={answers} score={review ? score : null} answered={answered} t={t} />
          <div className="ex-page">
            {!review && (
              <header className="ex-intro">
                <h2 className="ex-intro__title">{t('exam.introTitle', { level: LEVEL })}</h2>
                <p className="ex-intro__lead">
                  {t('exam.introLead', { total: exam.total, pass: exam.pass, pct: Math.round((exam.pass / exam.total) * 100) })}
                </p>
                {restored && (
                  <p className="ex-intro__restored" role="status">
                    {t('exam.restored')}
                  </p>
                )}
              </header>
            )}

            {exam.sections.map((section) => (
              <section key={section.key} id={`ex-${section.key}`} className="ex-sec">
                <h3 className="ex-sec__title">
                  {t(`exam.section.${section.key}`)}
                  <span>{sectionQuestions(section).length}</span>
                </h3>
                {section.dialogue && (
                  <ExamDialogue
                    dialogue={section.dialogue}
                    firstNum={numById.get(section.dialogue.gaps[0].id)}
                    level={lvl}
                    answers={answers}
                    review={review}
                    onPick={pick}
                    t={t}
                  />
                )}
                {(section.questions || []).map((q) => (
                  <ExamQuestion key={q.id} q={q} num={numById.get(q.id)} level={lvl} value={answers[q.id]} review={review} onPick={pick} />
                ))}
                {(section.passages || []).map((p) => (
                  <div key={p.id} className="ex-block">
                    {p.text && (
                      <div className="ex-card ex-text">
                        {p.title && <p className="ex-text__title">{p.title}</p>}
                        {p.text.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                    {p.audio && (
                      <div className="ex-card ex-audio">
                        <ExamAudio src={`/exam/${lvl}/audio/${p.audio}`} t={t} />
                        {/* Стенограмма — только в разборе: до сдачи она превращала бы
                            аудирование в чтение (у методиста она висела на экране
                            лишь потому, что записей не было). */}
                        {review && (
                          <div className="ex-transcript">
                            <p className="ex-transcript__title">{t('exam.transcript')}</p>
                            {p.lines.map((l, i) => (
                              <p key={i} className="ex-line">
                                <b className="ex-line__sp">{l.sp}</b>
                                {l.t}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {p.questions.map((q) => (
                      <ExamQuestion key={q.id} q={q} num={numById.get(q.id)} level={lvl} value={answers[q.id]} review={review} onPick={pick} />
                    ))}
                  </div>
                ))}
              </section>
            ))}

            <div className="ex-submit">
              {review ? (
                <>
                  <button type="button" className="ex-btn ex-btn--ghost" onClick={() => showPhase('result')}>
                    {t('exam.review.toResult')}
                  </button>
                  <button type="button" className="ex-btn" onClick={retake}>
                    {t('exam.result.retake')}
                  </button>
                </>
              ) : (
                // Как у методиста: закончить можно, только ответив на всё, — иначе
                // пропущенный по невнимательности вопрос молча стоил бы балла.
                <button type="button" className="ex-finish" disabled={!complete} onClick={finish}>
                  {complete ? t('exam.finish') : t('exam.finishLeft', { n: exam.total - answered })}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Липкая плашка под полосой: сколько отвечено и переход к разделу. */
function ExamHud({ exam, answers, score, answered, t }) {
  const pct = score ? score.pct : Math.round((answered / exam.total) * 100)
  const jump = (key) => document.getElementById(`ex-${key}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  return (
    <div className="ex-hud">
      <div className="ex-hud__inner">
        <div className="ex-hud__row">
          <span className="ex-hud__count">
            {score ? t('exam.review.score', { n: score.correct, total: score.total }) : t('exam.answered', { n: answered, total: exam.total })}
          </span>
          <div className="ex-hud__track">
            <div className="ex-hud__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <nav className="ex-chips">
          {exam.sections.map((s) => {
            const qs = sectionQuestions(s)
            // В разборе счётчик раздела — верные ответы, до сдачи — данные.
            const n = score
              ? qs.filter((q) => answers[q.id] === q.answer).length
              : qs.filter((q) => Number.isInteger(answers[q.id])).length
            return (
              <button key={s.key} type="button" className={`ex-chip${n === qs.length ? ' is-done' : ''}`} onClick={() => jump(s.key)}>
                {t(`exam.section.${s.key}`)}
                <span>
                  {n}/{qs.length}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function ExamQuestion({ q, num, level, value, review, onPick }) {
  const order = optionOrder(level, q)
  const verdict = review ? (value === q.answer ? ' is-right' : ' is-wrong') : ''
  return (
    <div className={`ex-q${verdict}`} data-qid={q.id}>
      <div className="ex-q__head">
        <span className="ex-q__num">{num}</span>
        <p className="ex-q__prompt">{q.prompt}</p>
      </div>
      <div className={`ex-opts${q.tf ? ' is-tf' : ''}`} role="radiogroup" aria-label={q.prompt}>
        {order.map((i) => {
          let optCls = 'ex-opt'
          if (review) {
            if (i === q.answer) optCls += ' is-right'
            else if (i === value) optCls += ' is-wrong'
          } else if (i === value) optCls += ' is-sel'
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === i}
              className={optCls}
              data-opt={i}
              disabled={review}
              onClick={() => onPick(q.id, i)}
            >
              {q.options[i]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Диалог с пропусками: номер пропуска — сквозной номер вопроса экзамена. */
function ExamDialogue({ dialogue, firstNum, level, answers, review, onPick, t }) {
  return (
    <div className="ex-card ex-dialogue">
      <p className="ex-card__intro">{dialogue.intro}</p>
      {dialogue.lines.map((line, li) => (
        <p key={li} className="ex-line">
          <b className="ex-line__sp">{line.sp}</b>
          {line.parts.map((part, pi) =>
            typeof part === 'string' ? (
              <span key={pi}>{part}</span>
            ) : (
              <ExamGap
                key={pi}
                q={dialogue.gaps[part.gap]}
                num={firstNum + part.gap}
                level={level}
                value={answers[dialogue.gaps[part.gap].id]}
                review={review}
                onPick={onPick}
                t={t}
              />
            ),
          )}
        </p>
      ))}
    </div>
  )
}

function ExamGap({ q, num, level, value, review, onPick, t }) {
  const order = optionOrder(level, q)
  const filled = Number.isInteger(value)
  let selCls = 'ex-gap__sel'
  if (review) selCls += value === q.answer ? ' is-right' : ' is-wrong'
  else if (filled) selCls += ' is-filled'
  return (
    <span className="ex-gap">
      <span className="ex-gap__num">{num}</span>
      <select
        className={selCls}
        data-qid={q.id}
        value={filled ? String(value) : ''}
        disabled={review}
        aria-label={t('exam.gap', { n: num })}
        onChange={(e) => {
          if (e.target.value !== '') onPick(q.id, Number(e.target.value))
        }}
      >
        <option value="" disabled>
          {t('exam.choose')}
        </option>
        {order.map((i) => (
          <option key={i} value={i}>
            {q.options[i]}
          </option>
        ))}
      </select>
      {/* В разборе выпадающий список показывает выбранное — верный ответ
          рядом, иначе ошибку видно, а исправление нет. */}
      {review && value !== q.answer && <span className="ex-gap__key">{q.options[q.answer]}</span>}
    </span>
  )
}

// Запись, которая играет сейчас: одновременно две записи слушать нельзя, и
// нажатая новая останавливает прежнюю.
let current = null

const fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Плеер записи аудирования. Только файл — синтеза нет: запись не загрузилась,
 * значит «Повторить», а не робот вместо диктора (как в «Слушай и выбирай»).
 */
function ExamAudio({ src, t }) {
  const ref = useRef(null)
  const [state, setState] = useState('idle') // idle | loading | playing | paused | error
  const [time, setTime] = useState({ cur: 0, dur: 0 })

  useEffect(() => {
    if (typeof Audio === 'undefined') return undefined
    const a = new Audio()
    a.preload = 'metadata'
    a.src = src
    ref.current = a
    const tick = () => setTime({ cur: a.currentTime || 0, dur: Number.isFinite(a.duration) ? a.duration : 0 })
    const onPlaying = () => setState('playing')
    const onPause = () => setState((s) => (s === 'playing' || s === 'loading' ? 'paused' : s))
    const onEnded = () => {
      setState('idle')
      tick()
    }
    const onError = () => setState('error')
    const events = [
      ['timeupdate', tick],
      ['loadedmetadata', tick],
      ['playing', onPlaying],
      ['pause', onPause],
      ['ended', onEnded],
      ['error', onError],
    ]
    for (const [name, fn] of events) a.addEventListener(name, fn)
    return () => {
      for (const [name, fn] of events) a.removeEventListener(name, fn)
      if (!a.paused) a.pause()
      if (current === a) current = null
      ref.current = null
    }
  }, [src])

  const play = () => {
    const a = ref.current
    if (!a) return
    if (current && current !== a && !current.paused) current.pause()
    current = a
    if (state === 'error') a.load()
    setState('loading')
    let started
    try {
      started = a.play()
    } catch {
      setState('error')
      return
    }
    // Отказ автоплея и обрыв загрузки паузой — не поломка файла: красить кнопку
    // «не загрузилось» на них нельзя.
    started?.catch?.((e) => setState(e?.name === 'NotAllowedError' || e?.name === 'AbortError' ? 'paused' : 'error'))
  }
  const pause = () => ref.current?.pause()
  const restart = () => {
    const a = ref.current
    if (!a) return
    a.currentTime = 0
    play()
  }

  if (state === 'error') {
    return (
      <div className="ex-player">
        <span className="ex-player__err" role="alert">
          {t('exam.listen.error')}
        </span>
        <button type="button" className="ex-player__btn" onClick={play}>
          {t('exam.listen.retry')}
        </button>
      </div>
    )
  }

  const playingNow = state === 'playing'
  const pct = time.dur ? Math.min(100, (time.cur / time.dur) * 100) : 0
  return (
    <>
      <div className="ex-player">
        <button type="button" className="ex-player__btn" onClick={playingNow ? pause : play} aria-pressed={playingNow}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            {playingNow ? (
              <path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor" />
            ) : (
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" fill="currentColor" />
            )}
          </svg>
          {playingNow ? t('exam.listen.pause') : state === 'loading' ? t('exam.listen.loading') : t('exam.listen.play')}
        </button>
        <button type="button" className="ex-player__btn ex-player__btn--ghost" onClick={restart}>
          {t('exam.listen.restart')}
        </button>
        <div className="ex-player__track" aria-hidden="true">
          <div className="ex-player__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ex-player__time">
          {fmt(time.cur)} / {fmt(time.dur)}
        </span>
      </div>
      <p className="ex-player__hint">{t('exam.listen.hint')}</p>
    </>
  )
}

const tipOf = (tip, lang) => (tip ? tip[lang] || tip.ru || tip.en : '')

function ExamResult({ exam, score, level, lang, restricted, t, onReview, onRetake, onExit }) {
  const weak = score.skills.filter((s) => s.weak)
  const passPct = Math.round((exam.pass / exam.total) * 100)
  return (
    <div className="ex-page">
      <div className="ex-res">
        <span className={`ex-res__pill ${score.passed ? 'is-pass' : 'is-fail'}`}>
          {t(score.passed ? 'exam.result.pass' : 'exam.result.fail')}
        </span>
        <h2 className="ex-res__title">{t(score.passed ? 'exam.result.passTitle' : 'exam.result.failTitle')}</h2>
        <p className="ex-res__lead">
          {t(score.passed ? 'exam.result.passLead' : 'exam.result.failLead', { level, pass: exam.pass, total: exam.total })}
        </p>
        <div className="ex-res__score">
          <b>{score.correct}</b>
          <span>/ {score.total}</span>
          <em>{score.pct}%</em>
        </div>
        <p className="ex-res__mark">{t('exam.result.passMark', { pass: exam.pass, total: exam.total, pct: passPct })}</p>

        <div className="ex-skills">
          {score.skills.map((s) => (
            <div key={s.key} className="ex-skill">
              <div className="ex-skill__top">
                <span>{t(`exam.section.${s.key}`)}</span>
                <span>
                  {s.correct}/{s.total}
                </span>
              </div>
              <div className="ex-skill__track">
                <div className={`ex-skill__fill ${s.weak ? 'is-low' : 'is-ok'}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {weak.length ? (
          <div className="ex-tips">
            <h3>{t('exam.result.tipsTitle')}</h3>
            <ul>
              {weak.map((s) => (
                <li key={s.key}>
                  <b>{t(`exam.section.${s.key}`)}:</b> {tipOf(exam.tips?.[s.key], lang)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="ex-tips is-good">
            <h3>{t('exam.result.allGoodTitle')}</h3>
            <p>{t('exam.result.allGoodText')}</p>
          </div>
        )}

        {/* Сдал, но бэкенд не засчитал (админ закрыл модуль / квота): узел
            останется незакрытым, и молчать об этом нельзя. */}
        {score.passed && restricted && (
          <div className="le-restricted" role="status">
            🔒 {t('learn.quotaReached')}
          </div>
        )}

        <div className="ex-res__acts">
          <button type="button" className="ex-btn ex-btn--ghost" onClick={onReview}>
            {t('exam.result.review')}
          </button>
          <button type="button" className="ex-btn" onClick={onRetake}>
            {t('exam.result.retake')}
          </button>
          <button type="button" className="ex-btn ex-btn--ghost" onClick={onExit}>
            {t('exam.result.toTrail')}
          </button>
        </div>
      </div>
    </div>
  )
}
