import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  checkSatAnswer, finishSatSession, getSatProfile, getSatSession, getSatSessionSummary, logSatError, startSatSession,
} from '../api.js'
import { errorText } from '../lib/examQuota.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { timeOn } from '../sat/question/session.js'
import ExplanationPanel from '../sat/study/ExplanationPanel.jsx'
import ErrorTypeDialog from '../sat/study/ErrorTypeDialog.jsx'
import StudySummary from '../sat/study/StudySummary.jsx'
import PracticeSummary from '../sat/study/PracticeSummary.jsx'
import { pick } from '../sat/model/profile.js'
import { parse } from '../sat/model/plan.js'
import { domainName, skillName } from '../sat/names.js'
import { lessonByCode } from '../sat/model/course.js'
import { BookOpenIcon } from '../sat/icons.jsx'
import { ChevronLeftIcon, CloseIcon } from '../ielts/icons.jsx'

// Один запрос старта на занятие за раз: экран в разработке монтируется дважды (StrictMode), и без этого два POST
// собирали бы два набора. Сервер тоже держит одну открытую сессию на занятие — это вторая линия.
const starting = new Map()
function startOnce(token, lessonId) {
  if (!starting.has(lessonId)) {
    const p = startSatSession(token, { lessonId }).finally(() => setTimeout(() => starting.delete(lessonId), 0))
    starting.set(lessonId, p)
  }
  return starting.get(lessonId)
}

function param(name) {
  try {
    return new URLSearchParams(window.location.search).get(name)
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

/** Итог проверки под вопросом (Figma 23–24): верно / неверно, ключ, тип ошибки и когда вопрос вернётся. */
function VerdictBox({ res, loc }) {
  const { t } = useI18n()
  const answer = Array.isArray(res.answer) ? res.answer.join(' · ') : res.answer
  const due = res.reviewDueAt ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(parse(res.reviewDueAt.slice(0, 10))) : null
  if (res.correct) {
    const helped = res.helpType && res.helpType !== 'none'
    return (
      <div className="st-verdict is-right">
        <b>{t('sat.study.right')}</b>
        <span>{t(helped ? 'sat.study.rightHelped' : 'sat.study.rightOwn')}</span>
      </div>
    )
  }
  return (
    <div className="st-verdict is-wrong">
      <b>{t('sat.study.wrong', { a: String(answer) })}</b>
      <span>
        {res.errorType
          ? t('sat.study.wrongTyped', { type: t(`sat.etype.${res.errorType}`).toLowerCase(), date: due || '' })
          : t('sat.study.wrongPick', { g: String(res.given ?? '—') })}
      </span>
    </div>
  )
}

/**
 * Прохождение учебной сессии по Figma 19–21: общий экран вопроса без таймера, черновика, паузы и инструкции; помощи
 * до ответа нет. Неверный ответ сам открывает «Какая это была ошибка?» (20), после выбора или закрытия справа
 * открывается объяснение (21); «Объяснение» в подвале — только у проверенного вопроса. AI и «Похожее» убраны.
 */
function StudyRun({ data, setData, explainLang, onExit, onFinished }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const spec = useMemo(
    () => ({ key: `study-${data.id}`, mode: 'study', questions: data.questions.map((q) => ({ id: q.id, section: q.section })), timing: {} }),
    // ключ — id сессии: набор вопросов внутри неё не меняется
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.id],
  )
  const { session, update, clear } = useSatSession(spec)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [panel, setPanel] = useState(false) // объяснение справа (Figma 21)
  const [etypeFor, setEtypeFor] = useState(null) // id вопроса, для которого открыто «Какая это была ошибка?»

  const docs = useMemo(() => Object.fromEntries(data.questions.map((q) => [q.id, q])), [data.questions])
  const results = data.results || {}
  const verdicts = useMemo(() => {
    const v = {}
    for (const [qid, r] of Object.entries(results)) if (docs[qid]?.type === 'mcq') v[qid] = { answer: r.answer, chosen: r.given }
    return v
  }, [results, docs])

  const fail = useCallback((e) => {
    setToast(errorText(e, t))
    setTimeout(() => setToast(null), 4000)
  }, [t])

  if (!session) return <div className="ih st st-run" />
  const q = session.questions[session.index]
  const doc = docs[q.id]
  const res = results[q.id]
  const checked = !!res

  const onCheck = async (qid) => {
    const a = session.answers[qid]
    setBusy(true)
    try {
      const r = await checkSatAnswer(token, qid, {
        given: a.value,
        // набор юнита курса — попытки «lesson», как у прототипа (meta.lessonCode); остальное — учебный режим
        mode: data.kind === 'unit' ? 'lesson' : 'study',
        helpType: data.help?.[qid] || 'none',
        timeSec: Math.round(timeOn(session, qid) / 1000),
        sessionId: data.id,
      })
      if (r.formatError) {
        setToast(t(`sat.spr.err.${r.formatError}`))
        setTimeout(() => setToast(null), 4000)
        return
      }
      setData((d) => ({ ...d, results: { ...(d.results || {}), [qid]: r } }))
      // промах: ученик сам называет тип ошибки (Figma 20), после окна — объяснение; верный ответ — объяснение по кнопке
      if (!r.correct && r.errorId) setEtypeFor(qid)
      else setPanel(false)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  // окно типа ошибки закрыто (выбором или «Пропустить») — справа открывается объяснение (Figma 21)
  const closeEtype = () => {
    setEtypeFor(null)
    setPanel(true)
  }
  // тип ошибки уходит в журнал ошибок (заголовок сервер берёт из условия) и в очередь повторения
  const saveEtype = async (qid, errorType) => {
    const r = results[qid]
    setBusy(true)
    try {
      const out = await logSatError(token, r.errorId, { errorType })
      setData((d) => ({
        ...d,
        results: {
          ...d.results,
          [qid]: { ...d.results[qid], logged: true, errorType: out?.errorType ?? errorType, reviewDueAt: out?.reviewDueAt ?? d.results[qid].reviewDueAt },
        },
      }))
      closeEtype()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    setBusy(true)
    try {
      const done = await finishSatSession(token, data.id)
      clear()
      onFinished(done)
    } catch (e) {
      fail(e)
      setBusy(false)
    }
  }

  const footerExtra = checked ? (
    <button type="button" className={`st-tool ${panel ? 'is-on' : ''}`} aria-pressed={panel} onClick={() => setPanel((p) => !p)}>
      <BookOpenIcon size={16} />{t('sat.study.explanation')}
    </button>
  ) : null

  const sidePanel = panel && checked ? (
    <ExplanationPanel onClose={() => setPanel(false)} doc={doc} data={res} chosen={res.given} explainLang={explainLang} />
  ) : null

  const names = data.skillIds.map((s) => skillName(s, lang)).join(' · ')
  return (
    <>
      <QuestionScreen
        session={session}
        onChange={update}
        docs={docs}
        title={data.unitCode ? `${data.unitCode} · ${pick(lessonByCode(data.unitCode)?.t, lang) || names}` : t('sat.study.title', { skills: names })}
        subtitle={t('sat.sample.studySub', { n: String(session.index + 1), total: String(session.questions.length) })}
        setLabel={t('sat.study.setLabel')}
        onExit={onExit}
        onFinish={finish}
        footerExtra={footerExtra}
        sidePanel={sidePanel}
        overlay={etypeFor && <ErrorTypeDialog busy={busy} onSave={(type) => saveEtype(etypeFor, type)} onSkip={closeEtype} />}
        study={{
          onCheck,
          checking: busy,
          verdicts,
          isChecked: (qid) => !!results[qid],
          skillLabel: (d) => [domainName(d.domain, lang), skillName(d.skillId, lang)].filter(Boolean).join(' · '),
          below: (qid) => {
            const r = results[qid]
            return r ? <VerdictBox res={r} loc={loc} /> : null
          },
        }}
      />
      {toast && <p className="st-error st-run__toast" role="alert">{toast}</p>}
    </>
  )
}

/**
 * Учебный режим SAT — фаза 5 плана (Figma 21–25, 28). `?screen=sat-study&satLesson=<занятие плана>` начинает (или
 * продолжает) занятие; дальше адрес держит `satSession=<id>`, и перезагрузка возвращает ту же сессию: проверенное —
 * с сервера, остальное — черновиком на устройстве. Законченная сессия показывает итог.
 */
export default function SatStudyPage({ token, onNav }) {
  const { t } = useI18n()
  const authToken = token || loadToken()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [explainLang, setExplainLang] = useState('ru')
  // итог набора «Практики» (B2): только source = practice; null — грузится, false — не пришёл (общий итог занятия)
  const [psum, setPsum] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getSatProfile(authToken).then((p) => alive && p?.explainLang && setExplainLang(p.explainLang)).catch(() => {})
    const lessonId = param('satLesson')
    const sessionId = param('satSession')
    const load = sessionId ? getSatSession(authToken, sessionId) : lessonId ? startOnce(authToken, lessonId) : Promise.reject(new Error('no session'))
    load
      .then((s) => {
        if (!alive) return
        setParams({ satLesson: null, satSession: s.id })
        setData(s)
      })
      .catch((e) => alive && setError(errorText(e, t)))
    window.scrollTo(0, 0)
    return () => {
      alive = false
    }
  }, [authToken, t])

  const isPractice = data?.kind === 'practice'
  const finished = !!data?.finished
  const sid = data?.id
  useEffect(() => {
    if (!finished || !isPractice || !sid) return undefined
    let alive = true
    getSatSessionSummary(authToken, sid)
      .then((x) => alive && setPsum(x || false))
      .catch(() => alive && setPsum(false))
    return () => {
      alive = false
    }
  }, [authToken, finished, isPractice, sid])

  const toHub = (tab) => {
    setParams({ satSession: null, satLesson: null, satUnit: null, satTab: tab || null })
    onNav?.('sat')
  }
  // «Потренировать слабые»: новый набор по навыкам открывается здесь же
  const again = async (skillIds) => {
    setBusy(true)
    try {
      const s = await startSatSession(authToken, { mode: 'skills', skillIds, count: 10 })
      setParams({ satSession: s.id, satLesson: null })
      setPsum(null)
      setData(await getSatSession(authToken, s.id))
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }
  // набор юнита курса возвращается на свой юнит, набор «Практики» — в «Практику», занятие плана — в «План»
  const back = () => {
    if (isPractice) return toHub('practice')
    if (!data?.unitCode) return toHub('plan')
    setParams({ satSession: null, satUnit: data.unitCode })
    onNav?.('sat-unit')
  }

  if (error) {
    return (
      <div className="ih st st-ob">
        <header className="st-ob__top">
          <button type="button" className="ih-round" onClick={() => toHub('plan')} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
          <b className="st-ob__logo">just to study</b>
        </header>
        <div className="ih-empty st-study__err">
          <h2>{t('sat.study.cantStart')}</h2>
          <p>{error}</p>
          <button type="button" className="ih-cta" onClick={() => toHub('plan')}>{t('sat.sum.toPlan')}</button>
        </div>
      </div>
    )
  }
  if (!data) return <div className="ih st st-run" />
  if (data.finished) {
    return (
      <div className="ih st st-ob">
        <header className="st-ob__top">
          <button type="button" className="ih-round" onClick={back} aria-label={t('sat.ob.back')}><ChevronLeftIcon size={20} /></button>
          <b className="st-ob__logo">just to study</b>
          <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(isPractice ? 'sat.tab.practice' : 'sat.study.chip')}</span></span>
          <span className="st-spacer" />
          <button type="button" className="st-ob__exit" onClick={() => toHub()}>{t('sat.ob.exit')}<CloseIcon size={16} /></button>
        </header>
        <div className="ih-enter">
          {isPractice && psum === null ? null : isPractice && psum ? (
            <PracticeSummary summary={psum} busy={busy} onAgain={() => toHub('practice')} onWeak={again} onDashboard={() => toHub()} onErrors={() => toHub('errors')} />
          ) : (
            <StudySummary
              summary={data.summary}
              skillIds={data.skillIds}
              onPlan={back}
              planLabel={data.unitCode ? t('sat.unit.backToUnit') : isPractice ? t('sat.psum.again') : undefined}
              onErrors={() => toHub('errors')}
            />
          )}
        </div>
      </div>
    )
  }
  return <StudyRun data={data} setData={setData} explainLang={explainLang} onExit={back} onFinished={setData} />
}
