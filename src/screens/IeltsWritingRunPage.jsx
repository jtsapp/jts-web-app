import { useEffect, useMemo, useRef, useState } from 'react'
import { getIeltsTest, submitIeltsWriting } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import WritingTaskBody from '../ielts/writing/WritingTaskBody.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import { formatClock } from '../ielts/reading/run.js'
import { countWords, dropWritingDraft, kindKey, loadWritingDraft, minWords, saveWritingDraft, timeLimitSec } from '../ielts/writing/writing.js'
import { useMockAutosave } from '../ielts/mock/mockSession.js'
import MockRunHeader from '../ielts/mock/MockRunHeader.jsx'
import { SparkleIcon, CheckCircleIcon, CheckIcon, CloseIcon, EditIcon, InfoIcon, TimerIcon } from '../ielts/icons.jsx'

const PLAN_STEPS = { t1ac: 4, t1gt: 5, t2: 4 }

/**
 * Редактор Writing (макет «IELTS new»): карточка с заданием и полем, справа «Подсказки» — план ответа по абзацам. Как на экзамене:
 * вставка отключена (счётчик попыток уходит в работу — антифрод §14.3), с таймером время идёт вниз, а после нуля
 * можно дописать: перерасход пишется в работу, а не обрывает текст. Черновик — на устройстве, каждую секунду правки.
 * mock — задание секции полного mock: часы общие на оба задания и идут по серверу (mock.deadline), черновик — на
 * сервере (mock.draft: { text, pasteBlocked } этого задания). Пустую работу сервер не примет, поэтому и в mock время не
 * обрывает текст: перерасход уходит в работу, как вне mock.
 */
export default function IeltsWritingRunPage({ token, target, onExit, onDone, mock = null }) {
  const { t } = useI18n()
  const testId = target?.testId
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [text, setText] = useState('')
  const [mode, setMode] = useState(target?.mode === 'practice' && !mock ? 'practice' : 'exam')
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [savedAt, setSavedAt] = useState(null)
  const [pasteBlocked, setPasteBlocked] = useState(0)
  const [pasteNote, setPasteNote] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const carried = useRef(0)

  useEffect(() => {
    if (!testId) return
    let alive = true
    getIeltsTest(authToken, testId)
      .then((r) => {
        if (!alive) return
        const d = mock ? mock.draft || null : loadWritingDraft(testId)
        if (d) {
          setText(d.text)
          if (d.mode) setMode(d.mode)
          setPasteBlocked(d.pasteBlocked || 0)
          carried.current = d.elapsedSec || 0
        }
        setStartedAt(d?.startedAt || new Date().toISOString())
        setState({ status: 'ready', doc: r.document, test: r.test })
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, testId]) // eslint-disable-line react-hooks/exhaustive-deps -- mock читается один раз при загрузке

  useEffect(() => {
    if (!testId || mock) return undefined
    setIeltsParams({ ieltsRun: testId, ieltsMode: mode, ieltsSkill: 'writing' })
    return () => setIeltsParams({ ieltsRun: null, ieltsMode: null, ieltsSkill: null })
  }, [testId, mode])

  // часы: время в редакторе, а не с первого открытия — закрытая вкладка экзаменационное время не тратит
  useEffect(() => {
    if (state.status !== 'ready') return undefined
    const t0 = Date.now()
    const id = setInterval(() => {
      setElapsed(carried.current + Math.floor((Date.now() - t0) / 1000))
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [state.status])

  const saveState = useMockAutosave(mock, mock && state.status === 'ready' && !busy ? { text, pasteBlocked } : null)
  const words = useMemo(() => countWords(text), [text])
  const paragraphs = useMemo(() => text.split(/\n\s*\n+/).filter((p) => p.trim()).length, [text])

  // черновик — через секунду тишины, чтобы не писать на каждое нажатие
  useEffect(() => {
    if (state.status !== 'ready' || mock) return undefined
    const id = setTimeout(() => {
      if (saveWritingDraft(testId, { text, mode, words, startedAt, pasteBlocked, elapsedSec: elapsed })) setSavedAt(new Date())
    }, 1000)
    return () => clearTimeout(id)
    // elapsed намеренно не в зависимостях: тикающие часы не повод переписывать черновик
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, mode, pasteBlocked, state.status])

  if (!testId || state.status === 'missing' || state.status === 'error')
    return (
      <div className="ih-run ih-run--empty">
        <EmptyState icon={<EditIcon size={28} />} title={t(state.status === 'missing' ? 'ieltsReading.missingTitle' : 'ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.(testId)}>{t('ieltsReading.back')}</button>
      </div>
    )
  if (state.status === 'loading') return <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsReading.loading')}</p></div>

  const { doc } = state
  const limit = timeLimitSec(doc)
  const min = minWords(doc)
  const left = mock?.deadline ? Math.round((mock.deadline - now) / 1000) : limit - elapsed
  const kind = kindKey(doc)
  const stepsDone = Math.min(PLAN_STEPS[kind], paragraphs)

  // «Сохранить черновик» — сразу, не дожидаясь секунды тишины автосохранения
  const saveNow = () => {
    if (saveWritingDraft(testId, { text, mode, words, startedAt, pasteBlocked, elapsedSec: elapsed })) setSavedAt(new Date())
  }

  const onPaste = (e) => {
    e.preventDefault()
    setPasteBlocked((n) => n + 1)
    setPasteNote(true)
    setTimeout(() => setPasteNote(false), 2500)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const view = await submitIeltsWriting(authToken, testId, {
        text,
        mode,
        timeSec: elapsed,
        startedAt,
        device: typeof window !== 'undefined' && window.innerWidth < 760 ? 'mobile' : 'desktop',
        pasteBlocked,
      })
      dropWritingDraft(testId)
      if (mock) mock.onSubmitted([view.attempt.id])
      else onDone?.(view.attempt.id, testId)
    } catch (e) {
      setError(e?.message || t('ieltsReading.submitError'))
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <div className="ih-run ih-wrun" data-mode={mode}>
      {mock ? (
        <MockRunHeader mock={mock} section="Writing" part={doc.kind === 'task2' ? 'Task 2' : 'Task 1'} left={Math.max(0, left)} saveState={saveState} onExit={mock.onExit}>
          <button type="button" className="ih-btn ih-btn--primary" onClick={() => setConfirm(true)} disabled={!text.trim()}>
            {doc.kind === 'task2' ? t('ieltsMock.submitSection') : t('ieltsMock.toTask2')}
          </button>
        </MockRunHeader>
      ) : (
      <header className="ih-wrun__top">
        <span className="ih-wrun__logo">just to study</span>
        <span className="ih-wrun__pill">Writing {doc.kind === 'task2' ? 'Task 2' : 'Task 1'} · {state.test.title}</span>
        <span className="ih-run__spacer" />
        <span className={`ih-run__clock ${mode === 'exam' && left <= 300 ? 'is-low' : ''}`} role="timer" aria-live="off">
          <TimerIcon size={18} />
          {mode === 'exam' ? (left >= 0 ? formatClock(left) : `+${formatClock(-left)}`) : formatClock(elapsed)}
          <small>{t('ieltsWriting.ofMin', { n: String(Math.round(limit / 60)) })}</small>
        </span>
        {savedAt && <span className="ih-wrun__saved"><CheckCircleIcon size={18} />{t('ieltsWriting.savedAt', { time: savedAt.toTimeString().slice(0, 5) })}</span>}
        <button type="button" className="ih-wrun__back" onClick={() => onExit?.(testId)}>
          <CloseIcon size={18} /> {t('ieltsWriting.w2.back')}
        </button>
      </header>
      )}

      {mode === 'exam' && left < 0 && <p className="ih-wrun__overtime" role="status">{t('ieltsWriting.overtime')}</p>}
      {error && <p className="ih-run__error" role="alert">{error}</p>}

      {/* Редактор по макету «IELTS new» (Writing Task 2): карточка с заданием и полем по центру, «Подсказки» справа.
          Задание — целиком (WritingTaskBody: у Task 1 там график), а не одной строкой вопроса, и часы остаются в шапке:
          без них экзаменационный режим терял смысл. */}
      <div className="ih-wrun__body">
        {/* слева — задание и под ним подсказки, справа — поле ответа (правка владельца в Figma «IELTS new»: задание
            видно всё время, пока пишешь, как на компьютерном IELTS) */}
        <aside className="ih-wrun__left">
          <section className="ih-wrun__prompt">
            <span className="ih-wrun__meta">{t('ieltsWriting.w2.meta', { task: doc.kind === 'task2' ? 'Task 2' : 'Task 1', n: String(min), m: String(Math.round(limit / 60)) })}</span>
            <WritingTaskBody task={doc} />
          </section>
          <section className="ih-wrun__hints">
            <h2>{t('ieltsWriting.w2.hints')}</h2>
            <ol className="ih-wrun__steps">
              {Array.from({ length: PLAN_STEPS[kind] }, (_, i) => (
                <li key={i} className={i < stepsDone ? 'is-done' : ''}>
                  <span className="ih-wrun__stepn" aria-hidden="true">{i < stepsDone ? <CheckIcon size={16} /> : i + 1}</span>
                  <span>{t(`ieltsWriting.p.plan.${kind}.s${i + 1}`)}</span>
                </li>
              ))}
            </ol>
            <p className="ih-wrun__tip"><InfoIcon size={16} />{t(`ieltsWriting.p.plan.${kind}.note`)}</p>
            {!mock && <p className="ih-wrun__ai"><SparkleIcon size={18} />{t('ieltsWriting.w2.aiNote')}</p>}
          </section>
        </aside>

        <main className="ih-wrun__card">
          <textarea
            className="ih-wrun__text"
            lang="en"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="sentences"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            onDrop={(e) => e.preventDefault()}
            placeholder={t('ieltsWriting.placeholder')}
            aria-label={t('ieltsWriting.placeholder')}
          />
          <div className="ih-wrun__bar">
            <b className={words < min ? 'is-short' : 'is-ok'}>
              {words < min ? t('ieltsWriting.w2.words', { n: String(words), min: String(min) }) : t('ieltsWriting.w2.wordsOk', { n: String(words) })}
            </b>
            <span className="ih-muted">· {t('ieltsWriting.p.work.paragraphs', { n: String(paragraphs) })}</span>
            <span className={`ih-muted ih-wrun__paste ${pasteNote ? 'is-flash' : ''}`} role={pasteNote ? 'status' : undefined}>· {t('ieltsWriting.pasteOff')}</span>
            <span className="ih-run__spacer" />
            {(savedAt || (mock && saveState === 'saved')) && <span className="ih-wrun__draft"><CheckCircleIcon size={16} />{t('ieltsWriting.w2.draftSaved')}</span>}
          </div>
          {!mock && (
            <div className="ih-wrun__actions">
              <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => setConfirm(true)} disabled={!text.trim()}>
                {t('ieltsWriting.w2.submitAi')}
              </button>
              <button type="button" className="ih-btn2 ih-btn2--outline" onClick={saveNow} disabled={!text.trim()}>
                {t('ieltsWriting.w2.saveDraft')}
              </button>
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={confirm}
        title={t('ieltsWriting.confirmTitle')}
        text={words < min ? t('ieltsWriting.confirmShort', { n: String(words), min: String(min) }) : t('ieltsWriting.confirmText', { n: String(words) })}
        confirmLabel={t('ieltsWriting.submit')}
        cancelLabel={t('ieltsReading.cancel')}
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
