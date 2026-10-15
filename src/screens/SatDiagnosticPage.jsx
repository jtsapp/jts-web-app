import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSatDiagnostic, getSatPlan, getSatProfile, rebuildSatPlan, saveSatPlan, saveSatProfile, startSatDiagnostic, submitSatDiagnostic } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { timeOn } from '../sat/question/session.js'
import DiagnosticIntro from '../sat/diagnostic/DiagnosticIntro.jsx'
import DiagnosticReport from '../sat/diagnostic/DiagnosticReport.jsx'
import StudyTime from '../sat/diagnostic/StudyTime.jsx'
import RoadmapView from '../sat/plan/RoadmapView.jsx'
import { SatModal } from '../sat/question/ToolDialogs.jsx'
import { phaseForWeek, horizonWeeks, previewPlan, roadmapSteps } from '../sat/model/plan.js'
import { domainName } from '../sat/names.js'
import { ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { errorText, isQuotaError } from '../lib/examQuota.js'

const STEPS = ['intro', 'report', 'time']

function readStep() {
  try {
    const v = new URLSearchParams(window.location.search).get('satDiag')
    return STEPS.includes(v) ? v : null
  } catch {
    return null
  }
}

function writeStep(step) {
  try {
    const url = new URL(window.location.href)
    if (step) url.searchParams.set('satDiag', step)
    else url.searchParams.delete('satDiag')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — не пишем */
  }
}

/** Прохождение: общий экран вопроса (фаза 3) в режиме диагностики, черновик — на устройстве по id диагностики. */
function DiagnosticRun({ diag, onExit, onDone }) {
  const { t, lang } = useI18n()
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const spec = useMemo(
    () => ({
      key: `diag-${diag.id}`,
      mode: 'diagnostic',
      questions: diag.questions.map((q) => ({ id: q.id, section: q.section })),
      timing: { durationSec: diag.durationSec || 1800, soft: true },
    }),
    [diag],
  )
  const { session, update, clear } = useSatSession(spec)
  const docs = useMemo(() => Object.fromEntries(diag.questions.map((q) => [q.id, q])), [diag])
  if (!session) return <div className="ih st st-run" />
  const q = docs[session.questions[session.index].id]

  const finish = async () => {
    if (sending) return
    setSending(true)
    setError(null)
    const answers = {}
    const times = {}
    for (const { id } of session.questions) {
      const a = session.answers[id]
      if (a?.value != null && String(a.value).trim() !== '') answers[id] = a.value
      const ms = timeOn(session, id) // открытый вопрос копит время с показа, а не в timeMs
      if (ms) times[id] = Math.round(ms / 1000)
    }
    const startedMs = session.clock.startedAt
    try {
      const res = await submitSatDiagnostic(loadToken(), diag.id, { answers, times, elapsedSec: Math.round((Date.now() - startedMs) / 1000) })
      clear()
      onDone(res)
    } catch {
      setError(t('sat.dx.submitError'))
      setSending(false)
    }
  }

  return (
    <>
      <QuestionScreen
        session={session}
        onChange={update}
        docs={docs}
        title={t('sat.dx.runTitle', { section: q?.section === 'math' ? 'Math' : 'Reading and Writing' })}
        subtitle={q ? domainName(q.domain, lang) : ''}
        setLabel={t('sat.phase.diagnostic')}
        reviewLabels={{ title: t('sat.dx.reviewTitle'), finish: t('sat.dx.submit') , warn: t('sat.dx.reviewWarn') }}
        onExit={onExit}
        onFinish={finish}
      />
      {error && <p className="st-error st-run__toast" role="alert">{error}</p>}
    </>
  )
}

/**
 * Диагностика SAT — фаза 4 плана: старт (Figma 7) → 24 вопроса (Figma 8) → карта (Figma 9) → время на занятия
 * (Figma 10) → план. Шаг держится в ?satDiag=intro|report|time: перезагрузка не выбрасывает в начало, а идущая
 * диагностика всегда продолжается с того же места (набор на сервере, ответы — черновиком на устройстве).
 */
export default function SatDiagnosticPage({ token, onNav }) {
  const { t } = useI18n()
  const authToken = token || loadToken()
  const [diag, setDiag] = useState(null)
  const [plan, setPlan] = useState(null)
  const [profile, setProfile] = useState(null)
  const [step, setStep] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [roadmap, setRoadmap] = useState(false)

  const load = useCallback(async () => {
    const [d, p, pr] = await Promise.all([
      getSatDiagnostic(authToken).catch(() => ({ status: 'none' })),
      getSatPlan(authToken).catch(() => ({ exists: false })),
      getSatProfile(authToken).catch(() => ({ exists: false })),
    ])
    setDiag(d)
    setPlan(p)
    setProfile(pr)
    const want = readStep()
    if (d.status === 'active') setStep('run')
    else if (want === 'intro' || d.status === 'none') setStep('intro')
    else setStep(want === 'time' ? 'time' : 'report')
  }, [authToken])

  useEffect(() => {
    load()
    window.scrollTo(0, 0)
  }, [load])

  const goStep = (s) => {
    setError(null)
    setStep(s)
    writeStep(s === 'run' ? null : s)
    window.scrollTo(0, 0)
  }

  const toPlan = () => {
    writeStep(null)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satTab', 'plan')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* вкладку выберет хаб */
    }
    onNav?.('sat')
  }

  const exit = () => {
    writeStep(null)
    onNav?.('sat')
  }

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const d = await startSatDiagnostic(authToken)
      setDiag(d)
      goStep('run')
    } catch (e) {
      // исчерпанная демо-квота диагностики (E2) — понятный текст сервера, а не «не удалось начать»
      setError(isQuotaError(e) ? errorText(e, t) : t('sat.dx.startError'))
    } finally {
      setBusy(false)
    }
  }

  const build = async ({ days, minutes, lang: explainLang }) => {
    setBusy(true)
    setError(null)
    try {
      await saveSatProfile(authToken, { explainLang })
      const p = await saveSatPlan(authToken, { studyDays: days, minutesPerDay: minutes })
      setPlan(p)
      toPlan()
    } catch {
      setError(t('sat.time.buildError'))
    } finally {
      setBusy(false)
    }
  }

  const rebuild = async () => {
    setBusy(true)
    try {
      setPlan(await rebuildSatPlan(authToken))
    } catch {
      setError(t('sat.time.buildError'))
    } finally {
      setBusy(false)
    }
  }

  if (!step || !diag) return <div className="ih st st-ob" />
  if (step === 'run' && diag.status === 'active') {
    return (
      <DiagnosticRun
        diag={diag}
        onExit={exit}
        onDone={(res) => {
          setDiag(res)
          goStep('report')
        }}
      />
    )
  }

  const examDate = profile?.dateUndecided ? null : profile?.examDate || null
  const today = new Date()
  const startPhase = plan?.exists ? plan.plan.weeks[0]?.phase || 2 : phaseForWeek(0, horizonWeeks(today, examDate))
  const chip = step === 'time' ? t('sat.time.chip') : t('sat.dx.chip')
  const back = step === 'time' ? () => goStep('report') : exit

  let body = null
  if (step === 'intro') {
    body = (
      <DiagnosticIntro
        examDate={examDate}
        last={diag.status === 'finished' ? diag.finishedAt : null}
        resuming={diag.status === 'active'}
        busy={busy}
        error={error}
        onStart={start}
      />
    )
  } else if (step === 'report' && diag.status === 'finished') {
    body = (
      <DiagnosticReport
        result={diag.result}
        finishedAt={diag.finishedAt}
        startPhase={startPhase}
        planExists={!!plan?.exists}
        stale={!!plan?.stale}
        busy={busy}
        onRoadmap={() => setRoadmap(true)}
        onNext={() => goStep('time')}
        onRetake={() => goStep('intro')}
        onPlan={toPlan}
        onRebuild={rebuild}
      />
    )
  } else if (step === 'time') {
    body = (
      <StudyTime
        initial={plan?.exists ? { days: plan.studyDays, minutes: plan.minutesPerDay, lang: profile?.explainLang } : { lang: profile?.explainLang }}
        examDate={examDate}
        rebuilding={!!plan?.exists}
        busy={busy}
        error={error}
        onBack={() => goStep('report')}
        onBuild={build}
      />
    )
  }

  return (
    <div className="ih st st-ob">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={back} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <b className="st-ob__logo">just to study</b>
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{chip}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={exit}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      <div key={step} className="ih-enter">{body}</div>
      {roadmap && (
        <SatModal wide title={t('sat.plan.view.roadmap')} onClose={() => setRoadmap(false)}>
          <RoadmapView
            steps={roadmapSteps(previewPlan(today, examDate), diag.finishedAt?.slice(0, 10))}
            current={startPhase}
            examDate={examDate}
          />
        </SatModal>
      )}
    </div>
  )
}
