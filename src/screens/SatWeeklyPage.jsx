import { useEffect, useMemo, useState } from 'react'
import { getSatProfile, getSatWeekly, startSatSession, submitSatWeekly } from '../api.js'
import { loadToken } from '../lib/session.js'
import { errorText, isQuotaError } from '../lib/examQuota.js'
import { useI18n } from '../i18n.jsx'
import { QuotaNotice } from '../components/ExamDemoBanner.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import AnswerChoices from '../sat/question/AnswerChoices.jsx'
import useSatSession, { hasDraft } from '../sat/question/useSatSession.js'
import { elapsedMs, timeOn } from '../sat/question/session.js'
import { pick } from '../sat/model/profile.js'
import { domainName, skillName } from '../sat/names.js'
import { answersPayload, submitBody, domainRows, draftKey, minutesOf, missedSkills, resultRows, sectionCounts } from '../sat/model/weekly.js'
import { hoursMinutes } from '../sat/model/mock.js'
import { useSatTheme } from '../sat/theme.js'
import { SatBrand } from '../sat/ui/SatNav.jsx'
import { weekLabel } from '../sat/weekly/WeeklyCard.jsx'
import { ArrowForwardIcon, ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { ExpandLessIcon, StopwatchIcon } from '../sat/icons.jsx'

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

/** Прохождение: общий экран вопроса в режиме exam (без помощи), мягкие часы-ориентир — тест не закрывается сам. */
function WeeklyRun({ data, onExit, onDone }) {
  const { t, lang } = useI18n()
  const [error, setError] = useState(null)
  const spec = useMemo(
    () => ({
      key: draftKey(data.weekStart),
      mode: 'exam',
      questions: data.questions.map((q) => ({ id: q.id, section: q.section })),
      timing: { durationSec: minutesOf(data) * 60, soft: true },
    }),
    [data],
  )
  const { session, update, clear } = useSatSession(spec)
  const docs = useMemo(() => Object.fromEntries(data.questions.map((q) => [q.id, q])), [data])
  if (!session) return <div className="ih st st-run" />
  const q = docs[session.questions[session.index].id]
  const finish = async () => {
    try {
      const res = await submitSatWeekly(loadToken(), submitBody(data.weekStart, answersPayload(session, (id) => timeOn(session, id)), elapsedMs(session) / 1000))
      clear()
      onDone(res)
    } catch (e) {
      setError(errorText(e, t))
    }
  }
  return (
    <>
      <QuestionScreen
        session={session}
        onChange={update}
        docs={docs}
        title={t('sat.wk.title')}
        subtitle={q ? `${q.section === 'math' ? 'Math' : 'Reading and Writing'} · ${domainName(q.domain, lang)}` : ''}
        setLabel={t('sat.wk.title')}
        reviewLabels={{ title: t('sat.dx.reviewTitle'), finish: t('sat.wk.submit'), warn: t('sat.dx.reviewWarn') }}
        onExit={onExit}
        onFinish={finish}
      />
      {error && <p className="st-error st-run__toast" role="alert">{error}</p>}
    </>
  )
}

/** Экран перед стартом: неделя, правило, секции, ориентир по времени. */
function WeeklyIntro({ data, onStart, loc }) {
  const { t } = useI18n()
  const c = sectionCounts(data.questions)
  const min = minutesOf(data)
  return (
    <main className="st-wkp">
      <section className="st-card st-wkp__intro">
        <span className="st-head__eyebrow">{weekLabel(data.weekStart, loc)}</span>
        <h1>{t('sat.wk.title')}</h1>
        <p className="st-muted">{t('sat.wk.lead', { n: String(data.questions.length), min: String(min) })}</p>
        <div className="st-wkp__chips">
          <span className="st-wk__chip">R&amp;W · {c.rw}</span>
          <span className="st-wk__chip">Math · {c.math}</span>
          <span className="st-wk__chip"><StopwatchIcon size={14} />{t('sat.wk.about', { n: String(min) })}</span>
        </div>
        <p className="st-wkp__rules">{t('sat.wk.rules')}</p>
        <button type="button" className="ih-cta st-wkp__start" onClick={onStart}>{t('sat.wk.start')}<ArrowForwardIcon size={20} /></button>
      </section>
    </main>
  )
}

/** Одна строка результата: заголовок (навык, верно/неверно) и раскрытие — вопрос, ответы, разбор. */
function ResultRow({ i, row, explainLang, open, onToggle }) {
  const { t, lang } = useI18n()
  const { q, item, status } = row
  const skill = item.skillId || q?.skillId
  const given = item.answer == null || String(item.answer).trim() === '' ? null : String(item.answer)
  const right = Array.isArray(item.correctAnswer) ? item.correctAnswer.join(' · ') : item.correctAnswer
  return (
    <li className={`st-card st-wkr__row is-${status} ${open ? 'is-open' : ''}`}>
      <button type="button" className="st-wkr__head" aria-expanded={open} onClick={onToggle}>
        <b className="st-wkr__n">{i + 1}</b>
        <span className="st-wkr__name">
          <b>{skill ? skillName(skill, lang) : t('sat.wk.question')}</b>
          <small className="st-muted">{(item.section || q?.section) === 'math' ? 'Math' : 'Reading and Writing'}{item.domain || q?.domain ? ` · ${domainName(item.domain || q?.domain, lang)}` : ''}</small>
        </span>
        <span className="st-spacer" />
        <span className={`st-wkr__verdict is-${status}`}>{t(`sat.wk.row.${status}`)}</span>
        <span className="st-wkr__caret" aria-hidden="true"><ExpandLessIcon size={18} /></span>
      </button>
      {open && (
        <div className="st-wkr__body">
          {q?.passage && <div className="st-wkr__passage" dangerouslySetInnerHTML={{ __html: q.passage }} />}
          {q?.stem && <div className="st-wkr__stem" dangerouslySetInnerHTML={{ __html: q.stem }} />}
          {q?.type === 'mcq' && Array.isArray(q.options) && q.options.length > 0 ? (
            <AnswerChoices options={q.options} value={given} verdict={{ answer: right, chosen: given }} disabled />
          ) : (
            <p className="st-wkr__ans">
              {given ? t('sat.daily.yours', { g: given }) : t('sat.daily.skipped')} · {t('sat.daily.right', { a: String(right ?? '—') })}
            </p>
          )}
          {item.explanation && <div className="st-wkr__xp" dangerouslySetInnerHTML={{ __html: pick(item.explanation, explainLang) }} />}
        </div>
      )}
    </li>
  )
}

/** Результат недели: счёт, время, домены, все пятнадцать с ответами и разбором; «Потренировать» по промахам. */
function WeeklyResult({ data, explainLang, loc, onPractice, onHub, busy }) {
  const { t, lang } = useI18n()
  const r = data.result || { correct: 0, total: data.questions.length, items: [] }
  const rows = resultRows(r, data.questions)
  const domains = domainRows(r)
  const missed = missedSkills(r)
  const [open, setOpen] = useState(() => new Set())
  const toggle = (k) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    return n
  })
  return (
    <main className="st-wkp">
      <section className="st-card st-wkp__score">
        <span className="st-head__eyebrow">{t('sat.wk.title')} · {weekLabel(data.weekStart, loc)}</span>
        <h1>{t('sat.wk.score', { c: String(r.correct), n: String(r.total) })}</h1>
        <p className="st-muted">
          {r.durationSeconds != null && <>{t('sat.wk.took', { time: hoursMinutes(t, r.durationSeconds / 60) })} · </>}
          {t('sat.wk.resultLead')}
        </p>
        {domains.length > 0 && (
          <div className="st-wkp__domains">
            {domains.map((d) => (
              <div key={`${d.section}-${d.domain}`} className={`st-acc__row is-${d.section === 'math' ? 'math' : 'rw'}`}>
                <b>{domainName(d.domain, lang)}</b>
                <span className="st-muted">{d.correct}/{d.total}</span>
                <strong>{d.pct}%</strong>
                <span className="st-rep__bar"><i style={{ width: `${d.pct}%` }} /></span>
              </div>
            ))}
          </div>
        )}
        <div className="st-wkp__acts">
          {missed.length > 0 && (
            <button type="button" className="ih-cta" disabled={busy} onClick={() => onPractice(missed.slice(0, 3))}>{t('sat.wk.practiceMissed', { n: String(Math.min(3, missed.length)) })}<ArrowForwardIcon size={18} /></button>
          )}
          <button type="button" className="ih-btn ih-btn--outline" onClick={onHub}>{t('sat.wk.toToday')}</button>
        </div>
      </section>
      <ol className="st-wkr">
        {rows.map((row, i) => {
          const k = row.item.questionId
          return <ResultRow key={k} i={i} row={row} explainLang={explainLang} open={open.has(k)} onToggle={() => toggle(k)} />
        })}
      </ol>
    </main>
  )
}

/**
 * Недельный тест SAT — `?screen=sat-weekly` (B1, прототип weekly-test.js). Пятнадцать вопросов раз в неделю вместо
 * ежедневной проверки: перед стартом — правило, прохождение в режиме exam с ориентиром 20 минут, после сдачи —
 * результат с ответами и разбором. Набор недели держит сервер (GET /mobile/sat/weekly), черновик — устройство.
 */
export default function SatWeeklyPage({ token, onNav }) {
  const { t, lang } = useI18n()
  useSatTheme()
  const authToken = token || loadToken()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [quota, setQuota] = useState(false)
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [explainLang, setExplainLang] = useState('ru')

  useEffect(() => {
    let alive = true
    getSatProfile(authToken).then((p) => alive && p?.explainLang && setExplainLang(p.explainLang)).catch(() => {})
    getSatWeekly(authToken)
      .then((d) => {
        if (!alive) return
        setData(d)
        // начатый черновик этой недели — сразу в прохождение, как «Продолжить» на карточке
        if (d?.status !== 'DONE' && d?.questions?.length && hasDraft(draftKey(d.weekStart))) setRunning(true)
      })
      .catch((e) => {
        if (!alive) return
        setQuota(isQuotaError(e))
        setError(errorText(e, t))
      })
    window.scrollTo(0, 0)
    return () => {
      alive = false
    }
  }, [authToken, t])

  const toHub = (tab) => {
    setParams({ satTab: tab || null })
    onNav?.('sat')
  }
  const practice = async (skillIds) => {
    setBusy(true)
    try {
      const s = await startSatSession(authToken, { mode: 'skills', skillIds, count: 10 })
      setParams({ satSession: s.id, satLesson: null })
      onNav?.('sat-study')
    } catch (e) {
      setError(errorText(e, t))
      setBusy(false)
    }
  }

  const shell = (body) => (
    <div className="ih st st-ob">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={() => toHub()} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <SatBrand />
        <span className="ih-chip ih-chip--sm"><span>{t('sat.wk.title')}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={() => toHub()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <div className="ih-enter">{body}</div>
    </div>
  )

  if (quota) return shell(<QuotaNotice text={error} onBack={() => toHub()} onPricing={() => onNav?.('sat-pricing')} />)
  if (error && !data) return shell(<div className="ih-empty st-study__err"><h2>{t('sat.wk.cantStart')}</h2><p>{error}</p></div>)
  if (!data) return <div className="ih st st-run" />
  if (data.status === 'DONE' && data.result) {
    return shell(
      <>
        {error && <p className="st-error" role="alert">{error}</p>}
        <WeeklyResult data={data} explainLang={explainLang} loc={loc} busy={busy} onPractice={practice} onHub={() => toHub()} />
      </>,
    )
  }
  if (!data.questions?.length) return shell(<div className="ih-empty st-study__err"><h2>{t('sat.wk.cantStart')}</h2><p>{t('sat.wk.empty')}</p></div>)
  if (!running) return shell(<WeeklyIntro data={data} loc={loc} onStart={() => setRunning(true)} />)
  return (
    <WeeklyRun
      data={data}
      onExit={() => toHub()}
      onDone={(result) => {
        setRunning(false)
        setData((d) => ({ ...d, status: 'DONE', result }))
        window.scrollTo(0, 0)
      }}
    />
  )
}
