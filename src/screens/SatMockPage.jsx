import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { abandonSatMock, getSatMock, getSatProfile, startSatMockModule, startSatSession, submitSatMockModule } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { elapsedMs, remainingMs, syncWallClock, timeOn } from '../sat/question/session.js'
import Handoff from '../sat/mock/Handoff.jsx'
import BreakView from '../sat/mock/BreakView.jsx'
import MockResult from '../sat/mock/MockResult.jsx'
import { MOCK_MIN_WIDTH, moduleNo } from '../sat/model/mock.js'
import { ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'
import { LaptopIcon } from '../sat/icons.jsx'
import { errorText } from '../lib/examQuota.js'
import { useSatTheme } from '../sat/theme.js'
import { SatBrand } from '../sat/ui/SatNav.jsx'
import { enterFullWindow, leaveFullWindow } from '../sat/fullWindow.js'

function readId() {
  try {
    return new URLSearchParams(window.location.search).get('satMock')
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

/** Ширина окна для ворот ≥ 1024 px: поворот планшета или сужение окна меняют ответ на лету (как у прототипа). */
function useWide() {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= MOCK_MIN_WIDTH)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return wide
}

/**
 * Модуль пробника — общий экран вопроса (Figma SAT 29, 30) в экзаменном режиме: помощи нет в разметке вовсе, часы — по
 * стене (остаток даёт сервер), «Скрыть таймер», на нуле модуль сдаётся сам. Без таймера часы мягкие и есть пауза.
 * Черновик — на устройстве по id прохождения и модуля: перезагрузка возвращает ответы, отметки и место.
 */
function ModuleRun({ run, onExit, onSubmitted }) {
  const { t } = useI18n()
  const [error, setError] = useState(null)
  const sending = useRef(false)
  const cur = run.current
  const spec = useMemo(
    () => ({
      key: `mock-${run.id}-${cur.key}`,
      mode: 'exam',
      questions: cur.questions.map((q) => ({ id: q.id, section: q.section })),
      // остаток 0 — модуль уже должен закрыться: секунда, чтобы часы были обратным отсчётом, а не секундомером
      timing: run.timed ? { durationSec: Math.max(1, cur.leftSec ?? cur.minutes * 60), wallClock: true } : { durationSec: cur.minutes * 60, soft: true },
    }),
    [run.id, run.timed, cur],
  )
  const { session, update, clear } = useSatSession(spec)
  const docs = useMemo(() => Object.fromEntries(cur.questions.map((q) => [q.id, q])), [cur])
  // черновик с устройства мог унести свой конец модуля (другое устройство, сдвиг часов) — конец задаёт сервер
  const ready = !!session
  useEffect(() => {
    if (ready && run.timed && cur.leftSec != null) update((s) => syncWallClock(s, Date.now() + cur.leftSec * 1000))
  }, [ready, run.timed, cur.leftSec, update])
  if (!session) return <div className="ih st st-run" />
  const section = cur.section === 'math' ? 'Math' : 'Reading and Writing'
  const name = run.paperTitle || t('sat.mock.simName')

  const finish = async () => {
    if (sending.current) return
    sending.current = true
    setError(null)
    const answers = {}
    const times = {}
    const marked = []
    for (const { id } of session.questions) {
      const a = session.answers[id]
      if (a?.value != null && String(a.value).trim() !== '') answers[id] = a.value
      const ms = timeOn(session, id) // открытый вопрос копит время с показа, а не в timeMs
      if (ms) times[id] = Math.round(ms / 1000)
      if (a?.marked) marked.push(id)
    }
    const elapsedSec = run.timed ? Math.round(cur.minutes * 60 - (remainingMs(session) ?? 0) / 1000) : Math.round(elapsedMs(session) / 1000)
    try {
      const res = await submitSatMockModule(loadToken(), run.id, { key: cur.key, answers, times, marked, elapsedSec })
      clear()
      onSubmitted(res)
    } catch (e) {
      setError(errorText(e, t))
      sending.current = false
    }
  }

  return (
    <>
      <QuestionScreen
        session={session}
        onChange={update}
        docs={docs}
        title={t('sat.mock.runTitle', { name, section, n: String(moduleNo(cur.key)) })}
        subtitle={run.timed ? t('sat.mock.runSub') : t('sat.mock.runSubUntimed')}
        setLabel={`${section} · ${t('sat.mock.moduleN', { n: String(moduleNo(cur.key)) })}`}
        onExit={onExit}
        onFinish={finish}
      />
      {error && <p className="st-error st-run__toast" role="alert">{error}</p>}
    </>
  )
}

/**
 * Пробник SAT — `?screen=sat-mock&satMock=<id>` (фаза 7, Figma SAT 29–33): модуль → экран между модулями (31) →
 * перерыв между секциями (32) → итог (33). Прохождение и его фаза — на сервере, экран только показывает текущую.
 * Модули идут на экране от 1024 px; итог виден на любом.
 */
export default function SatMockPage({ token, onNav }) {
  const { t } = useI18n()
  useSatTheme()
  const authToken = token || loadToken()
  const wide = useWide()
  const [run, setRun] = useState(null)
  const [target, setTarget] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let alive = true
    const id = readId()
    if (!id) {
      setError(t('sat.mock.notFound'))
      return undefined
    }
    getSatMock(authToken, id)
      .then((r) => alive && setRun(r))
      .catch((e) => alive && setError(errorText(e, t)))
    getSatProfile(authToken).then((p) => alive && setTarget(p?.targetTotal ?? null)).catch(() => {})
    window.scrollTo(0, 0)
    return () => {
      alive = false
    }
  }, [authToken, t])

  // симуляция и past paper идут во весь экран (B7); уходя с экрана — из полного экрана тоже
  useEffect(() => () => leaveFullWindow(), [])
  const finished = run?.status === 'finished'
  useEffect(() => {
    // итог смотрят уже не на экзамене: полный экран снимаем (прототип 12325245)
    if (finished) leaveFullWindow()
  }, [finished])

  // past paper возвращается на свою страницу, симуляция — во вкладку «Пробники»
  const paper = !!run?.paperId
  const toHub = useCallback((tab = 'mocks') => {
    setParams({ satTab: tab, satMock: null })
    onNav?.(paper && tab === 'mocks' ? 'sat-papers' : 'sat')
  }, [onNav, paper])

  const act = useCallback(async (fn) => {
    setBusy(true)
    setError(null)
    try {
      setRun(await fn())
      window.scrollTo(0, 0)
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }, [t])

  const runId = run?.id
  const start = useCallback(() => {
    // браузер пускает в полный экран только из клика — просим здесь, до запроса
    enterFullWindow()
    return act(() => startSatMockModule(authToken, runId))
  }, [act, authToken, runId])
  const abandon = () => {
    setConfirm(false)
    act(() => abandonSatMock(authToken, run.id)).then(() => toHub())
  }
  const practice = async (skillIds) => {
    setBusy(true)
    try {
      const s = await startSatSession(authToken, { mode: 'skills', skillIds, count: 10 })
      setParams({ satSession: s.id, satLesson: null, satMock: null })
      onNav?.('sat-study')
    } catch (e) {
      setError(errorText(e, t))
      setBusy(false)
    }
  }
  const review = () => {
    setParams({ satMock: run.id })
    onNav?.('sat-mock-review')
  }

  const shell = (body) => (
    <div className="ih st st-ob">
      <header className="st-ob__top">
        <button type="button" className="ih-round" onClick={() => toHub()} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
        <SatBrand />
        <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(paper ? 'sat.papers.title' : 'sat.mock.chip')}</span></span>
        <span className="st-spacer" />
        <button type="button" className="st-ob__exit" onClick={() => toHub()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
      </header>
      {error && <p className="st-error st-mock__err" role="alert">{error}</p>}
      <div className="ih-enter" key={`${run?.phase}-${run?.index}`}>{body}</div>
      <ConfirmDialog
        open={confirm}
        title={t('sat.mock.abandonTitle')}
        text={t('sat.mock.abandonText')}
        confirmLabel={t('sat.mock.abandonConfirm')}
        cancelLabel={t('sat.mock.abandonCancel')}
        onConfirm={abandon}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </div>
  )

  if (!run) return error ? shell(<div className="ih-empty st-study__err"><h2>{t('sat.mock.cantOpen')}</h2><p>{error}</p></div>) : <div className="ih st st-run" />
  if (run.status === 'finished') return shell(<MockResult run={run} target={target} busy={busy} onReview={review} onPractice={practice} onBack={() => toHub()} />)
  if (run.status !== 'active') return shell(<div className="ih-empty st-study__err"><h2>{t('sat.mock.abandoned')}</h2></div>)
  if (!wide) {
    return shell(
      <div className="ih-empty st-mock__narrow">
        <LaptopIcon size={32} />
        <h2>{t('sat.mock.desktopOnly')}</h2>
        <p>{t('sat.mock.desktopOnlyText')}</p>
      </div>,
    )
  }
  if (run.phase === 'module' && run.current) return <ModuleRun key={run.current.key} run={run} onExit={() => toHub()} onSubmitted={setRun} />
  if (run.phase === 'break') return shell(<BreakView run={run} busy={busy} onStart={start} />)
  return shell(<Handoff run={run} busy={busy} onStart={start} onAbandon={() => setConfirm(true)} />)
}
