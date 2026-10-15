import { useCallback, useEffect, useRef, useState } from 'react'
import { getSatCourse, startSatSession } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import DesmosDock from '../sat/question/DesmosDock.jsx'
import Whiteboard from '../sat/course/Whiteboard.jsx'
import { markRead, readPart, savePart } from '../sat/course/reading.js'
import { COURSE, clampPart, lessonByCode, neighbours, partTitle, sectionOf, unitOf, withN } from '../sat/model/course.js'
import { pick } from '../sat/model/profile.js'
import { ArrowForwardIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, InfoIcon } from '../ielts/icons.jsx'
import { CalculateIcon, FullscreenExitIcon, FullscreenIcon, PenIcon } from '../sat/icons.jsx'
import { errorText } from '../lib/examQuota.js'

function readCode() {
  try {
    return new URLSearchParams(window.location.search).get('satUnit')
  } catch {
    return null
  }
}

function setParams(patch) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    }
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — параметры не пишем */
  }
}

/**
 * Письменный урок по частям, как его ведут в классе: вступление, ряд пронумерованных шагов, часть на экране и
 * «назад / дальше»; последняя часть ведёт к практике. Стрелки ← → листают части — для преподавателя у доски. Место
 * в уроке помнит устройство. Текст — курс школы (public/sat/course/<код>.json из выгрузки прототипа), доверенная
 * разметка, а не ввод пользователя; тест course.test.js проверяет, что в ней нет скриптов и обработчиков.
 */
function Parts({ code, doc, onPractice }) {
  const { t } = useI18n()
  const parts = doc.parts || []
  const [at, setAt] = useState(() => clampPart(readPart(code), parts.length))
  const top = useRef(null)

  const show = useCallback((i, scroll) => {
    const n = clampPart(i, parts.length)
    setAt(n)
    savePart(code, n)
    if (n === parts.length - 1) markRead(code)
    if (scroll) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [code, parts.length])

  useEffect(() => {
    if (at === parts.length - 1) markRead(code)
  }, [at, code, parts.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
      if (e.target?.closest?.('input, textarea, select, [contenteditable], .st-wb, .st-desmos, .ih-dialog')) return
      e.preventDefault()
      show(at + (e.key === 'ArrowRight' ? 1 : -1), true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [at, show])

  if (!parts.length) return null
  const p = parts[at]
  return (
    <div className="st-unit__parts" ref={top}>
      {doc.lead && <div className="st-lw st-unit__lead" dangerouslySetInnerHTML={{ __html: doc.lead }} />}
      <ol className="st-unit__steps" aria-label={t('sat.unit.parts')}>
        {parts.map((x, k) => (
          <li key={k}>
            <button type="button" className={`st-unit__step ${k === at ? 'is-on' : k < at ? 'is-done' : ''}`} aria-current={k === at ? 'step' : undefined} onClick={() => show(k, true)}>
              <span className="st-unit__stepN">{k < at ? <CheckCircleIcon size={16} /> : k + 1}</span>
              <span className="st-unit__stepT">{partTitle(x.title)}</span>
            </button>
          </li>
        ))}
      </ol>
      <section key={at} className="st-unit__part ih-enter" aria-live="polite">
        <div className="st-unit__partHead">
          <span>{t('sat.unit.partOf', { n: String(at + 1), total: String(parts.length) })}</span>
          <h3>{partTitle(p.title)}</h3>
          {p.mins && <small>{p.mins.replace(/^about /, '≈ ')}</small>}
        </div>
        <div className="st-lw" dangerouslySetInnerHTML={{ __html: p.html }} />
        <div className="st-unit__partNav">
          {at > 0 ? (
            <button type="button" className="ih-btn ih-btn--outline" onClick={() => show(at - 1, true)}><ChevronLeftIcon size={16} />{partTitle(parts[at - 1].title)}</button>
          ) : <span />}
          {at < parts.length - 1 ? (
            <button type="button" className="ih-cta" onClick={() => show(at + 1, true)}>{t('sat.unit.next', { title: partTitle(parts[at + 1].title) })}<ArrowForwardIcon size={18} /></button>
          ) : (
            <button type="button" className="ih-cta" onClick={onPractice}>{t('sat.unit.toPractice')}<ArrowForwardIcon size={18} /></button>
          )}
        </div>
      </section>
    </div>
  )
}

/**
 * Юнит курса «36 юнитов» — `?screen=sat-unit&satUnit=U1` (Нет в Figma: адаптация прототипа lesson.js). Юнит — то, что
 * преподаватель выводит на экран в классе, поэтому он во всё окно, без меню: письменный урок по частям, затем набор
 * практики юнита (обычная учебная сессия — разборы, тип ошибки, журнал). Справа — инструменты, которые берут посреди
 * объяснения: доска юнита и Desmos (в Math) — окнами поверх урока, и полный экран для проектора.
 */
export default function SatUnitPage({ token, onNav }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [code, setCode] = useState(() => readCode())
  const lesson = code ? lessonByCode(code) : null
  const [doc, setDoc] = useState(null)
  const [docError, setDocError] = useState(false)
  const [progress, setProgress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [board, setBoard] = useState(false)
  const [calc, setCalc] = useState(false)
  const [calcBig, setCalcBig] = useState(false)
  const [full, setFull] = useState(false)
  const practiceRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!lesson) return undefined
    let alive = true
    if (COURSE.teach[lesson.code]) {
      fetch(`/sat/course/${encodeURIComponent(lesson.code)}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => alive && setDoc(d))
        .catch(() => alive && setDocError(true))
    }
    getSatCourse(authToken).then((r) => alive && setProgress(r?.units?.[lesson.code] || {})).catch(() => alive && setProgress({}))
    return () => {
      alive = false
    }
  }, [lesson, authToken])

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => {
      document.removeEventListener('fullscreenchange', on)
      // уходя с юнита, выходим и из полного экрана: он был нужен юниту, а не приложению
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {})
    }
  }, [])

  const toHub = () => {
    setParams({ satUnit: null, satTab: 'materials' })
    onNav?.('sat')
  }
  // соседний юнит — та же страница с другим кодом: урок, прогресс и доска берутся заново
  const open = (c) => {
    setParams({ satUnit: c })
    setDoc(null)
    setDocError(false)
    setProgress(null)
    setBoard(false)
    setCode(c)
  }
  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = await startSatSession(authToken, { unitCode: lesson.code })
      setParams({ satSession: s.id, satUnit: lesson.code })
      onNav?.('sat-study')
    } catch (e) {
      setError(errorText(e, t))
      setBusy(false)
    }
  }
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const shell = (body, side) => (
    <div className="ih st st-unit">
      <header className="st-ob__top st-unit__top">
        <button type="button" className="ih-round" onClick={toHub} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <b className="st-ob__logo">just to study</b>
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t('sat.unit.chip')}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={toHub}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <div className="st-unit__body">
        <main className="st-unit__main">{body}</main>
        {side}
      </div>
    </div>
  )

  if (!lesson) {
    return shell(
      <div className="ih-empty st-study__err">
        <h2>{t('sat.unit.unknown')}</h2>
        <button type="button" className="ih-cta" onClick={toHub}>{t('sat.unit.toMaterials')}</button>
      </div>,
    )
  }

  const unit = unitOf(lesson)
  const section = sectionOf(lesson)
  const math = section === 'math'
  const week = Math.ceil(lesson.n / COURSE.schedule.perWeek)
  const { prev, next } = neighbours(lesson.code)
  const count = progress?.questions || 0
  const answered = progress?.answered || 0

  let practiceAction = null
  if (count) {
    const label = progress?.openSessionId
      ? t('sat.unit.continue', { n: String(answered), total: String(count) })
      : progress?.finished ? t('sat.unit.again') : t('sat.unit.start')
    practiceAction = (
      <button type="button" className="ih-cta st-unit__start" disabled={busy} onClick={start}>{label}<ArrowForwardIcon size={20} /></button>
    )
  }
  const side = (
    // инструменты под рукой, где бы ни была прокручена страница
    <aside className="st-unit__side" aria-label={t('sat.unit.tools')}>
      <button type="button" className="st-unit__tool" aria-pressed={board} title={t(board ? 'sat.unit.boardClose' : 'sat.unit.board')} aria-label={t(board ? 'sat.unit.boardClose' : 'sat.unit.board')} onClick={() => setBoard((v) => !v)}>
        <PenIcon size={22} />
      </button>
      {math && (
        <button type="button" className="st-unit__tool" aria-pressed={calc} title={t(calc ? 'sat.unit.desmosClose' : 'sat.unit.desmos')} aria-label={t(calc ? 'sat.unit.desmosClose' : 'sat.unit.desmos')} onClick={() => setCalc((v) => !v)}>
          <CalculateIcon size={22} />
        </button>
      )}
      <button type="button" className="st-unit__tool" title={t(full ? 'sat.unit.exitFull' : 'sat.unit.full')} aria-label={t(full ? 'sat.unit.exitFull' : 'sat.unit.full')} onClick={toggleFull}>
        {full ? <FullscreenExitIcon size={22} /> : <FullscreenIcon size={22} />}
      </button>
    </aside>
  )

  return (
    <>
      {shell(
        <>
          <section className="st-card st-unit__head">
            <div className="st-unit__chips">
              <span className={`st-mat__code is-${section}`}>{lesson.code}</span>
              <span className="ih-chip ih-chip--sm"><span>{t('sat.unit.no', { n: String(lesson.n) })}</span></span>
              <span className="ih-chip ih-chip--sm"><span>{t('sat.unit.week', { n: String(week) })}</span></span>
              <span className="ih-chip ih-chip--sm"><span>{section === 'math' ? 'Math' : section === 'rw' ? 'Reading and Writing' : pick(unit?.name, lang)}</span></span>
              {unit?.kind !== 'hard' && <span className="ih-chip ih-chip--sm"><span>{pick(unit?.name, lang)}</span></span>}
              {lesson.hard && <span className="ih-chip ih-chip--sm st-unit__hard"><span>{t('sat.unit.hard')}</span></span>}
            </div>
            <h1>{pick(lesson.t, lang)}</h1>
            <div className="st-unit__must">
              <small>{t('sat.unit.mustDo')}</small>
              <p>{pick(lesson.skills, lang)}</p>
            </div>
          </section>

          <section className="st-card st-unit__teach">
            <div className="st-unit__eyebrow">
              <span>{t('sat.unit.lesson')}</span>
              {doc && lang !== 'en' && <span className="ih-chip ih-chip--sm"><span>{t('sat.unit.englishOnly')}</span></span>}
            </div>
            {COURSE.teach[lesson.code] ? (
              doc ? <Parts key={lesson.code} code={lesson.code} doc={doc} onPractice={() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
                : docError ? <p className="st-error">{t('sat.unit.textError')}</p> : <p className="st-muted">{t('sat.unit.loading')}</p>
            ) : lesson.hard ? (
              <>
                <p>{pick(unit?.lead, lang)}</p>
                <p className="st-unit__note"><InfoIcon size={18} />{t('sat.unit.challengeNote')}</p>
              </>
            ) : (
              <p className="st-unit__note"><InfoIcon size={18} />{t('sat.unit.textSoon')}</p>
            )}
          </section>

          <section className="st-card st-unit__practice" ref={practiceRef}>
            <div className="st-unit__eyebrow">
              <span>{t('sat.unit.practice')}</span>
              {answered > 0 && <span className="ih-chip ih-chip--sm"><span>{t('sat.unit.record', { done: String(answered), total: String(count), right: String(progress.right || 0) })}</span></span>}
            </div>
            {progress == null ? <p className="st-muted">{t('sat.unit.loading')}</p> : count ? (
              <>
                {answered > 0 && <div className="st-mat__bar"><i style={{ width: `${Math.round((answered / count) * 100)}%` }} /></div>}
                <p>{t('sat.unit.easyToHard', { q: plural(t, lang, 'sat.q', count) })}</p>
                <p className="st-muted">{t('sat.unit.ownQuestions')}</p>
                {error && <p className="st-error" role="alert">{error}</p>}
                {practiceAction}
              </>
            ) : (
              <p className="st-unit__note"><InfoIcon size={18} />{t(lesson.hard ? 'sat.unit.challengeSet' : 'sat.unit.setSoon')}</p>
            )}
          </section>

          {!lesson.hard && (
            <section className="st-card st-unit__home">
              <div className="st-unit__eyebrow"><span>{t('sat.unit.after')}</span></div>
              <ol>
                {COURSE.homework.map((h) => (
                  <li key={h.id}>
                    <b>{withN(pick(h.name, lang), lesson.n)}</b>
                    <span>{pick(h.body, lang)}</span>
                    <small>{t('sat.unit.mins', { m: h.mins })}</small>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <nav className="st-unit__nav" aria-label={t('sat.unit.nav')}>
            {prev ? <button type="button" className="ih-btn ih-btn--outline" onClick={() => open(prev.code)}><ChevronLeftIcon size={16} />{prev.code} · {pick(prev.t, lang)}</button> : <span />}
            {next ? <button type="button" className="ih-btn ih-btn--outline" onClick={() => open(next.code)}>{next.code} · {pick(next.t, lang)}<ChevronRightIcon size={16} /></button> : <span />}
          </nav>
        </>,
        side,
      )}
      {board && <Whiteboard boardKey={lesson.code} onClose={() => setBoard(false)} />}
      {math && (
        <div className={`st-unit__calc ${calcBig ? 'is-big' : ''}`} hidden={!calc}>
          <DesmosDock open={calc} visible={calc} expanded={calcBig} onClose={() => setCalc(false)} onExpand={setCalcBig} note={false} />
        </div>
      )}
    </>
  )
}
