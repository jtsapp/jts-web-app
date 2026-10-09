import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  abortIeltsMock, assessIeltsSpeaking, assessIeltsWriting, finishIeltsMockSection, getIeltsMockSession, getIeltsMocks, getIeltsProfile,
  saveIeltsMockDraft, startIeltsMock, startIeltsMockSection,
} from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import { MockBetween, MockCheck, MockIntro, MockResult, MockSubmitted, MockTopBar } from '../ielts/mock/MockScreens.jsx'
import { localDeadline, nextSection, sectionOf } from '../ielts/mock/mockSession.js'
import { CloseIcon } from '../ielts/icons.jsx'
import IeltsListeningRunPage from './IeltsListeningRunPage.jsx'
import IeltsReadingRunPage from './IeltsReadingRunPage.jsx'
import IeltsWritingRunPage from './IeltsWritingRunPage.jsx'
import IeltsSpeakingRunPage from './IeltsSpeakingRunPage.jsx'
import MockReview from '../ielts/mock/MockReview.jsx'

// опрос итога, пока ИИ проверяет: раз в 5 с, не дольше 10 минут (дальше — «результат появится в истории»)
const POLL_MS = 5000
const POLL_MAX_MS = 10 * 60 * 1000

/**
 * Полный mock-экзамен (дизайн «IELTS new», раздел 4): описание → проверка оборудования → четыре секции подряд →
 * «Экзамен сдан» → итог. Часы и черновик держит сервер (TEST_FORMAT.md §11), секции рисуют те же экраны прохождения,
 * что и отдельные тесты, с пропом mock. Адрес: ?screen=ielts-mock&ieltsMock=<id> | &ieltsMockSession=<id>.
 *
 * Writing и Speaking — несколько заданий в одной секции: их сданные попытки до закрытия секции живут в черновике
 * сессии ({ idx, done, part }), иначе обновление страницы между Task 1 и Task 2 потеряло бы Task 1.
 */
export default function IeltsMockPage({ token, target, onExit, onHistory, onToday, onPlan, onTrain }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [stage, setStage] = useState('loading')
  // разбор по навыкам — поверх итога, с какой секции открыт (null — закрыт)
  const [review, setReview] = useState(null)
  const [mock, setMock] = useState(null) // карточка каталога: id, title, module
  const [session, setSession] = useState(null)
  const [deadline, setDeadline] = useState(null)
  const [multi, setMulti] = useState({ idx: 0, done: [] }) // Writing / Speaking: какое задание и что уже сдано
  const [uploads, setUploads] = useState(null) // Speaking: оценка частей в фоне
  const [justDone, setJustDone] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [exitAsk, setExitAsk] = useState(false)
  const answersRef = useRef([]) // записи Speaking — для повтора отправки, только в памяти вкладки
  const graded = useRef(new Set())
  const [writingRetry, setWritingRetry] = useState(false) // роут оценки Writing не ответил (нет ключа, лимит, сеть)
  const [pollStopped, setPollStopped] = useState(false)
  const speakingSaved = useRef(0)
  const [profile, setProfile] = useState(null)

  // цель ученика — для «К цели 7.0 осталось 0.5» в итоге
  useEffect(() => {
    if (stage !== 'result') return
    getIeltsProfile(authToken).then(setProfile).catch(() => {})
  }, [stage, authToken])

  // снимок сессии + часы секции в часах устройства
  const take = useCallback((s) => {
    setSession(s)
    setDeadline(localDeadline(s))
    return s
  }, [])

  const stageOf = useCallback((s, view) => {
    if (s.status !== 'in_progress') return view === 'submitted' ? 'submitted' : 'result'
    if (s.section) return 'section'
    return 'between'
  }, [])

  // многозадачная секция продолжает с того задания, где остановились
  const restoreMulti = (s) => {
    const d = s?.draft
    const m = d && Array.isArray(d.done) ? { idx: d.idx || 0, done: d.done } : { idx: 0, done: [] }
    setMulti(m)
    // части Speaking, оценённые до обновления страницы, уже сданы — их попытки берутся из черновика
    setUploads(s?.section === 'speaking' && m.done.length ? m.done.map((id) => ({ status: 'done', attemptId: id })) : null)
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (target?.sessionId) {
          const s = await getIeltsMockSession(authToken, target.sessionId)
          if (!alive) return
          take(s)
          restoreMulti(s)
          setStage(stageOf(s, target?.view))
          return
        }
        const list = await getIeltsMocks(authToken)
        if (!alive) return
        const card = (list.mocks || []).find((m) => m.id === target?.mockId)
        if (!card) return setStage('missing')
        setMock(card)
        // незаконченная попытка этого mock — сразу туда, часы уже идут
        if (list.open && list.open.mockId === card.id) {
          take(list.open)
          restoreMulti(list.open)
          setStage(stageOf(list.open))
        } else setStage('intro')
      } catch {
        if (alive) setStage('missing')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [authToken, target?.sessionId, target?.mockId, target?.view, take, stageOf])

  // адрес держит то, что на экране: F5 на описании открывает тот же mock, в экзамене — ту же попытку. Пишется
  // эффектом от данных, а не только при загрузке: dev-режим React монтирует экран дважды и снял бы параметр
  useEffect(() => {
    if (session?.id) setIeltsParams({ ieltsMockSession: session.id, ieltsMock: null })
    else if (mock?.id) setIeltsParams({ ieltsMock: mock.id, ieltsMockSession: null })
  }, [session?.id, mock?.id])
  useEffect(() => () => setIeltsParams({ ieltsMockSession: null, ieltsMock: null }), [])

  // Writing ИИ оценивает наш роут; вызываем его сами для каждой ждущей работы — один раз на заход на экран, чтобы
  // закрытая вкладка не оставила работу в очереди навсегда (claim забирает и зависшую)
  const gradeWriting = useCallback((ids, force = false) => {
    for (const id of ids) {
      if (!id || (graded.current.has(id) && !force)) continue
      graded.current.add(id)
      if (force) setWritingRetry(false)
      // отказ роута (503 без ключа, 429 лимит) работу failed не помечает — она так и ждёт; без кнопки «Повторить»
      // ученик видел бы «в очереди» бесконечно
      assessIeltsWriting(authToken, id, lang).catch(() => setWritingRetry(true))
    }
  }, [authToken, lang])

  useEffect(() => {
    if (!session || (stage !== 'submitted' && stage !== 'result')) return
    const w = sectionOf(session, 'writing')
    gradeWriting((w?.parts || []).filter((p) => p.status === 'pending_ai').map((p) => p.attemptId))
  }, [session, stage, gradeWriting])

  // Пока ИИ проверяет — сессия перечитывается, и итог появляется без F5. Только видимая вкладка, один запрос за раз
  // и не дольше POLL_MAX_MS: работа, которую роут так и не забрал, иначе держала бы опрос до закрытия вкладки. Пока
  // идёт отправка Speaking, сессия не меняется вовсе — её закрывает finish, опрашивать нечего.
  const checking = !!session?.sections?.some((s) => s.state === 'checking')
  useEffect(() => {
    if (!session?.id || (stage !== 'submitted' && stage !== 'result') || !checking) return undefined
    const t0 = Date.now()
    let busy = false
    const tick = () => {
      if (busy || document.hidden) return
      if (Date.now() - t0 > POLL_MAX_MS) {
        clearInterval(id)
        setPollStopped(true)
        return
      }
      busy = true
      getIeltsMockSession(authToken, session.id).then(take).catch(() => {}).finally(() => { busy = false })
    }
    const id = setInterval(tick, POLL_MS)
    // вернулся на вкладку — сразу свежий снимок, а не через 5 секунд
    const onVisible = () => !document.hidden && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [authToken, session?.id, stage, checking, take])

  // ------------------------------------------------------------------ действия

  const begin = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = take(await startIeltsMock(authToken, mock.id))
      // первая секция начинается сразу: согласие с правилами уже дано на проверке
      const started = take(await startIeltsMockSection(authToken, s.id, nextSection(s)))
      restoreMulti(started)
      setStage('section')
    } catch (e) {
      setError(e?.status === 409 ? t('ieltsMock.err.otherOpen') : t('ieltsMock.err.start'))
    } finally {
      setBusy(false)
    }
  }

  const startNext = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = take(await startIeltsMockSection(authToken, session.id, nextSection(session)))
      restoreMulti(s)
      setUploads(null)
      setStage('section')
    } catch {
      setError(t('ieltsMock.err.start'))
    } finally {
      setBusy(false)
    }
  }

  const sessionId = session?.id
  const finish = useCallback(async (section, ids) => {
    setError(null)
    try {
      const s = take(await finishIeltsMockSection(authToken, sessionId, section, ids))
      setJustDone(section)
      setMulti({ idx: 0, done: [] })
      setStage(s.status === 'in_progress' ? 'between' : 'submitted')
    } catch {
      setError(t('ieltsMock.err.finish'))
    }
  }, [authToken, sessionId, take, t])

  const saveDraft = useCallback((d, opts) => saveIeltsMockDraft(authToken, session?.id, session?.section, d, opts), [authToken, session?.id, session?.section])

  // Speaking: часть записана — оценка уходит в фон, ученик сразу отвечает на следующую
  const sendPart = useCallback((i, testId, answers) => {
    // часть без единого ответа: отправлять нечего — секция закроется с пометкой «нет ответа»
    if (!answers?.length) {
      setUploads((u) => {
        const next = [...(u || [])]
        next[i] = { status: 'done', testId, attemptId: null }
        return next
      })
      return Promise.resolve(null)
    }
    setUploads((u) => {
      const next = [...(u || [])]
      next[i] = { status: 'uploading', testId }
      return next
    })

    return assessIeltsSpeaking(authToken, { testId, mode: 'exam', uiLang: lang, answers })
      .then((v) => v.attempt.id)
      .catch((e) => {
        if (e?.attemptId) return e.attemptId // попытка создана, но проверка не удалась — секция всё равно закрывается
        throw e
      })
      .then((id) => {
        // запись ушла и оценена — WAV больше не нужен (минута речи — ~2 МБ в памяти вкладки)
        answersRef.current[i] = null
        setUploads((u) => u.map((x, j) => (j === i ? { status: 'done', testId, attemptId: id } : x)))
        return id
      }, () => {
        setUploads((u) => u.map((x, j) => (j === i ? { status: 'error', testId } : x)))
        return null
      })
  }, [authToken, lang])

  // все части Speaking оценены (или помечены неудачей) — секция закрывается их попытками
  const speakingParts = sectionOf(session, 'speaking')?.testIds?.length || 0
  useEffect(() => {
    if (stage !== 'submitted' || !uploads || session?.status !== 'in_progress' || session?.section !== 'speaking') return
    if (uploads.length < speakingParts || uploads.some((u) => u?.status !== 'done')) return
    finish('speaking', uploads.map((u) => u.attemptId))
  }, [stage, uploads, session?.status, session?.section, speakingParts, finish])

  // в черновик — только части с готовой попыткой и подряд: после F5 ученик продолжит с первой несданной
  useEffect(() => {
    if (session?.section !== 'speaking' || !uploads) return
    const done = []
    for (const u of uploads) {
      if (u?.status !== 'done') break
      done.push(u.attemptId)
    }
    // пишем, только когда сданных частей стало больше; последнюю не пишем — секцию тут же закрывает finish
    if (done.length <= speakingSaved.current || done.length >= speakingParts) return
    speakingSaved.current = done.length
    saveIeltsMockDraft(authToken, session.id, 'speaking', { idx: done.length, done, part: null }).catch(() => {})
  }, [uploads, session?.section, session?.id, authToken, speakingParts])

  const retryUploads = () => {
    uploads.forEach((u, i) => u.status === 'error' && sendPart(i, u.testId, answersRef.current[i]))
  }

  const leave = async () => {
    setExitAsk(false)
    if (session?.status === 'in_progress') await abortIeltsMock(authToken, session.id).catch(() => {})
    onExit?.()
  }

  // ------------------------------------------------------------------ секция

  const section = session?.section
  const sec = sectionOf(session, section)
  const ids = sec?.testIds || []
  const mockProp = useMemo(() => {
    if (!session || !section) return null
    const base = { title: session.title, deadline, onExit: () => setExitAsk(true), onSave: saveDraft }
    if (section === 'listening' || section === 'reading') {
      return { ...base, draft: session.draft, onSubmitted: (a) => finish(section, a) }
    }
    const { idx, done } = multi
    const draftPart = session.draft?.idx === idx ? session.draft.part : null
    // в черновик многозадачной секции — что сдано и где ученик; текущий текст — под part
    const onSave = (part, opts) => saveDraft({ idx, done, part }, opts)
    if (section === 'writing') {
      return {
        ...base,
        draft: draftPart,
        onSave,
        onSubmitted: ([id]) => {
          gradeWriting([id])
          const all = [...done, id]
          if (all.length >= ids.length) finish('writing', all)
          else {
            setMulti({ idx: idx + 1, done: all })
            saveDraft({ idx: idx + 1, done: all, part: null }).catch(() => {})
          }
        },
      }
    }
    return {
      ...base,
      onSave,
      onRecorded: (answers) => {
        answersRef.current[idx] = answers
        sendPart(idx, ids[idx], answers)
        if (idx + 1 < ids.length) setMulti({ idx: idx + 1, done })
        else setStage('submitted')
      },
    }
  }, [session, section, deadline, multi, ids, saveDraft, finish, gradeWriting, sendPart])

  // ------------------------------------------------------------------ экран

  const title = session?.title || mock?.title || 'Mock'
  const trackName = (session?.module || mock?.module) === 'general' ? 'General Training' : 'Academic'
  const closeBtn = (label, fn) => (
    // на телефоне подпись прячется (шапка в одну строку), кнопке остаётся aria-label
    <button type="button" className="ih-btn ih-btn--outline ih-mockbar__exit" onClick={fn} aria-label={label}><CloseIcon size={16} /> <span>{label}</span></button>
  )

  if (stage === 'loading') return <div className="ih-mock"><p className="ih-muted ih-mock__loading">{t('ieltsReading.loading')}</p></div>
  if (stage === 'missing') {
    return (
      <div className="ih-mock">
        <MockTopBar right={closeBtn(t('ieltsMock.toList'), onExit)} />
        <main className="ih-mock__main ih-mock__main--narrow"><h1 className="ih-mock__h1">{t('ieltsMock.err.missing')}</h1></main>
      </div>
    )
  }

  if (stage === 'section' && mockProp) {
    const key = `${section}-${multi.idx}`
    const tgt = { testId: ids[section === 'writing' || section === 'speaking' ? multi.idx : 0], mode: 'exam' }
    const page = {
      listening: <IeltsListeningRunPage key={key} token={authToken} target={tgt} mock={mockProp} />,
      reading: <IeltsReadingRunPage key={key} token={authToken} target={tgt} mock={mockProp} />,
      writing: <IeltsWritingRunPage key={key} token={authToken} target={tgt} mock={mockProp} />,
      speaking: <IeltsSpeakingRunPage key={key} token={authToken} target={tgt} mock={mockProp} />,
    }[section]
    return (
      <div className="ih-mock ih-mock--run">
        {page}
        {error && <p className="ih-run__error ih-mock__float" role="alert">{error}</p>}
        <ConfirmDialog open={exitAsk} title={t('ieltsMock.exitTitle')} text={t('ieltsMock.exitText')} confirmLabel={t('ieltsMock.exit')} cancelLabel={t('ieltsMock.stay')} onConfirm={leave} onCancel={() => setExitAsk(false)} />
      </div>
    )
  }

  const chip = `${title} · ${trackName}`
  const finished = stage === 'submitted' || stage === 'result'
  const right = finished ? closeBtn(t('ieltsMock.close'), onHistory) : stage === 'between' ? closeBtn(t('ieltsMock.exit'), () => setExitAsk(true)) : closeBtn(t('ieltsMock.toList'), onExit)

  let body = null
  if (stage === 'intro') body = <MockIntro title={title} module={mock?.module} onNext={() => setStage('check')} onBack={onExit} />
  if (stage === 'check') body = <MockCheck onStart={begin} onBack={() => setStage('intro')} starting={busy} error={error} />
  if (stage === 'between') body = <MockBetween done={justDone} next={nextSection(session)} onStart={startNext} busy={busy} error={error} />
  if (stage === 'submitted') {
    body = (
      <MockSubmitted
        session={session}
        uploads={uploads}
        onRetryUpload={retryUploads}
        writingRetry={writingRetry}
        pollStopped={pollStopped}
        onRetryGrade={() => gradeWriting((sectionOf(session, 'writing')?.parts || []).filter((p) => p.status !== 'done').map((p) => p.attemptId), true)}
        onHistory={onHistory}
        onIelts={onToday}
      />
    )
  }
  if (stage === 'result') {
    const date = session.finishedAt || session.startedAt
    body = (
      <MockResult
        session={session}
        targetBand={Number(profile?.targetBand) || null}
        dateLabel={date ? new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' }) : ''}
        onReview={(s) => setReview(s?.name || 'listening')}
        onTrain={onTrain}
        onPlan={onPlan}
      />
    )
  }

  if (stage === 'result' && review && session) {
    return <MockReview session={session} token={authToken} initial={review} onClose={() => setReview(null)} />
  }

  return (
    <div className="ih-mock">
      <MockTopBar chip={chip} right={right} />
      {body}
      <ConfirmDialog open={exitAsk} title={t('ieltsMock.exitTitle')} text={t('ieltsMock.exitText')} confirmLabel={t('ieltsMock.exit')} cancelLabel={t('ieltsMock.stay')} onConfirm={leave} onCancel={() => setExitAsk(false)} />
    </div>
  )
}
