import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSatDiagnostic, getSatProfile, getSatRoadmap, startSatDiagnostic, submitSatDiagnostic } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { timeOn } from '../sat/question/session.js'
import DiagnosticIntro from '../sat/diagnostic/DiagnosticIntro.jsx'
import DiagnosticReport from '../sat/diagnostic/DiagnosticReport.jsx'
import RoadmapView from '../sat/plan/RoadmapView.jsx'
import { SatModal } from '../sat/question/ToolDialogs.jsx'
import { phaseKeyOf } from '../sat/model/roadmap.js'
import { domainName } from '../sat/names.js'
import { ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { errorText, isQuotaError } from '../lib/examQuota.js'

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
 * Диагностика SAT: старт (Figma 7) → 24 вопроса (Figma 8) → карта (Figma 9) → план. Шага «время на занятия» больше нет
 * (ТЗ 21.10, задача 3.1): даты занятий ставит школа, язык разборов — в «Настройках» профиля. Шаг держится в
 * ?satDiag=intro|report: перезагрузка не выбрасывает в начало, а идущая диагностика продолжается с того же места.
 */
export default function SatDiagnosticPage({ token, onNav }) {
  const { t } = useI18n()
  const authToken = token || loadToken()
  const [diag, setDiag] = useState(null)
  const [profile, setProfile] = useState(null)
  const [step, setStep] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [roadmap, setRoadmap] = useState(false)
  // фазы плана с сервера (ТЗ 21.10): тот же роудмап, что у вкладки «План»
  const [road, setRoad] = useState(null)

  const load = useCallback(async () => {
    const [d, , pr] = await Promise.all([
      getSatDiagnostic(authToken).catch(() => ({ status: 'none' })),
      getSatRoadmap(authToken).then(setRoad).catch(() => null),
      getSatProfile(authToken).catch(() => ({ exists: false })),
    ])
    setDiag(d)
    setProfile(pr)
    // сдавший видит отчёт даже по ?satDiag=intro: пересдача — только после сброса куратором
    if (d.status === 'active') setStep('run')
    else if (d.status === 'finished') setStep('report')
    else setStep('intro')
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

  // phase — фаза роудмапа, которую «План» откроет первой (satPhase читает PlanTab и сразу убирает из адреса)
  const toPlan = (phase) => {
    writeStep(null)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satTab', 'plan')
      url.searchParams.delete('satPlanView')
      if (phase) url.searchParams.set('satPhase', String(phase))
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
      // сервер отказал, потому что диагностика уже сдана (другая вкладка) — показываем отчёт
      if (e?.status === 400) load()
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
  // первая фаза с занятиями — её называет отчёт («начнём с … в фазе …»)
  const startKey = road ? phaseKeyOf(road.roadmap, road.roadmap.phases.find((p) => p.kind === 'lessons')?.n) : 'foundations1'
  const chip = t('sat.dx.chip')
  const back = exit

  let body = null
  if (step === 'intro' && diag.status !== 'finished') {
    body = (
      <DiagnosticIntro
        examDate={examDate}
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
        startKey={startKey}
        timing={road?.timing}
        onManager={() => onNav?.('sat-pricing')}
        nextTest={road?.roadmap?.phases?.find((p) => p.n === 1)?.bluebookTest ?? 6}
        // роудмап не загрузился — «Посмотреть план» ведёт во вкладку, а не в пустое окно
        onRoadmap={road ? () => setRoadmap(true) : () => toPlan()}
        onNext={() => toPlan(1)}
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
      {roadmap && road && (
        <SatModal wide title={t('sat.plan.view.roadmap')} onClose={() => setRoadmap(false)}>
          <RoadmapView data={road} />
        </SatModal>
      )}
    </div>
  )
}
