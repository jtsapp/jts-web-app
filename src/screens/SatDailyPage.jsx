import { useEffect, useMemo, useState } from 'react'
import { getSatProfile, startSatDaily, startSatSession, submitSatDaily } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { timeOn } from '../sat/question/session.js'
import { pick } from '../sat/model/profile.js'
import { domainName, skillName } from '../sat/names.js'
import { ArrowForwardIcon, CheckCircleIcon, ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { NoCircleIcon, TargetIcon } from '../sat/icons.jsx'
import { SatBrand } from '../sat/ui/SatNav.jsx'
import { useSatTheme } from '../sat/theme.js'
import { errorText } from '../lib/examQuota.js'

// Мягкий таймер проверки (MINUTES прототипа): считает, но ничего не закрывает
const DURATION_SEC = 8 * 60

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

// один запрос старта за раз — экран в разработке монтируется дважды (как у учебной сессии)
let starting = null
function startOnce(token) {
  if (!starting) starting = startSatDaily(token).finally(() => setTimeout(() => (starting = null), 0))
  return starting
}

function DailyRun({ data, onExit, onDone }) {
  const { t, lang } = useI18n()
  const [error, setError] = useState(null)
  const spec = useMemo(
    () => ({ key: `daily-${data.id}`, mode: 'diagnostic', questions: data.questions.map((q) => ({ id: q.id, section: q.section })), timing: { durationSec: DURATION_SEC, soft: true } }),
    [data],
  )
  const { session, update, clear } = useSatSession(spec)
  const docs = useMemo(() => Object.fromEntries(data.questions.map((q) => [q.id, q])), [data])
  if (!session) return <div className="ih st st-run" />
  const q = docs[session.questions[session.index].id]
  const finish = async () => {
    const answers = {}
    const times = {}
    for (const { id } of session.questions) {
      const a = session.answers[id]
      if (a?.value != null && String(a.value).trim() !== '') answers[id] = a.value
      const ms = timeOn(session, id) // открытый вопрос копит время с показа, а не в timeMs
      if (ms) times[id] = Math.round(ms / 1000)
    }
    try {
      const res = await submitSatDaily(loadToken(), data.id, { answers, times })
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
        title={t('sat.daily.title')}
        subtitle={q ? `${q.section === 'math' ? 'Math' : 'Reading and Writing'} · ${domainName(q.domain, lang)}` : ''}
        setLabel={t('sat.daily.title')}
        reviewLabels={{ title: t('sat.dx.reviewTitle'), finish: t('sat.daily.submit') , warn: t('sat.dx.reviewWarn') }}
        onExit={onExit}
        onFinish={finish}
      />
      {error && <p className="st-error st-run__toast" role="alert">{error}</p>}
    </>
  )
}

/** Итог проверки: сколько из пяти, по каждому — ваш ответ, верный, короткий разбор и «потренировать навык». */
function DailyResult({ data, explainLang, onPractice, onHub }) {
  const { t, lang } = useI18n()
  const s = data.summary || { correct: 0, total: data.questions.length }
  return (
    <main className="st-daily">
      <span className={`st-sum__icon ${s.correct === s.total ? '' : 'is-amber'}`}><TargetIcon size={28} /></span>
      <h1>{t('sat.daily.resultTitle', { c: String(s.correct), n: String(s.total) })}</h1>
      <p className="st-sum__sub">{t('sat.daily.resultSub')}</p>
      <ol className="st-daily__list">
        {data.questions.map((q, i) => {
          const r = data.results?.[q.id]
          const ok = r?.correct
          const ans = r ? (Array.isArray(r.answer) ? r.answer.join(' · ') : r.answer) : null
          return (
            <li key={q.id} className={`st-card st-daily__item ${ok ? 'is-right' : 'is-wrong'}`}>
              <div className="st-daily__head">
                <b>{i + 1}</b>
                {ok ? <CheckCircleIcon size={20} /> : <NoCircleIcon size={20} />}
                <span>{skillName(q.skillId, lang)}</span>
                <span className="st-spacer" />
                {!ok && <button type="button" className="st-link" onClick={() => onPractice([q.skillId])}>{t('sat.daily.practice')}<ArrowForwardIcon size={14} /></button>}
              </div>
              <div className="st-daily__stem" dangerouslySetInnerHTML={{ __html: q.stem }} />
              <p className="st-daily__ans">
                {r ? t('sat.daily.yours', { g: String(r.given ?? '—') }) : t('sat.daily.skipped')} · {t('sat.daily.right', { a: String(ans ?? '—') })}
              </p>
              {r?.explanation && <div className="st-daily__xp" dangerouslySetInnerHTML={{ __html: pick(r.explanation, explainLang) }} />}
            </li>
          )
        })}
      </ol>
      <div className="st-sum__foot">
        <span className="st-muted">{t('sat.daily.tomorrow')}</span>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-rep__cta" onClick={onHub}>{t('sat.daily.toToday')}<ArrowForwardIcon size={20} /></button>
      </div>
    </main>
  )
}

/**
 * Ежедневная проверка SAT — `?screen=sat-daily`. Нет в Figma: адаптация прототипа daily.js. Пять вопросов в день, один
 * набор на день, сдаётся раз, без помощи (общий экран вопроса в режиме диагностики); итог — с ответами и разбором.
 */
export default function SatDailyPage({ token, onNav }) {
  const { t } = useI18n()
  useSatTheme()
  const authToken = token || loadToken()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [explainLang, setExplainLang] = useState('ru')

  useEffect(() => {
    let alive = true
    getSatProfile(authToken).then((p) => alive && p?.explainLang && setExplainLang(p.explainLang)).catch(() => {})
    startOnce(authToken)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(errorText(e, t)))
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
    const s = await startSatSession(authToken, { mode: 'skills', skillIds, count: 10 })
    setParams({ satSession: s.id, satLesson: null })
    onNav?.('sat-study')
  }

  const shell = (body) => (
    <div className="ih st st-ob">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={() => toHub()} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <SatBrand />
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t('sat.daily.chip')}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={() => toHub()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <div className="ih-enter">{body}</div>
    </div>
  )

  if (error) return shell(<div className="ih-empty st-study__err"><h2>{t('sat.daily.cantStart')}</h2><p>{error}</p></div>)
  if (!data) return <div className="ih st st-run" />
  if (data.finished) return shell(<DailyResult data={data} explainLang={explainLang} onPractice={practice} onHub={() => toHub()} />)
  return <DailyRun data={data} onExit={() => toHub()} onDone={setData} />
}
