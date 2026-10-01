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
import { CheckCircleIcon, CloseIcon, EditIcon, ExpandMoreIcon, InfoIcon, TimerIcon } from '../ielts/icons.jsx'

const PLAN_STEPS = { t1ac: 4, t1gt: 5, t2: 4 }

/**
 * Редактор Writing (Figma 9): задание с планом ответа слева, текст справа, снизу — слова и абзацы. Как на экзамене:
 * вставка отключена (счётчик попыток уходит в работу — антифрод §14.3), с таймером время идёт вниз, а после нуля
 * можно дописать: перерасход пишется в работу, а не обрывает текст. Черновик — на устройстве, каждую секунду правки.
 */
export default function IeltsWritingRunPage({ token, target, onExit, onDone }) {
  const { t } = useI18n()
  const testId = target?.testId
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [text, setText] = useState('')
  const [mode, setMode] = useState(target?.mode === 'practice' ? 'practice' : 'exam')
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [savedAt, setSavedAt] = useState(null)
  const [pasteBlocked, setPasteBlocked] = useState(0)
  const [pasteNote, setPasteNote] = useState(false)
  const [planOpen, setPlanOpen] = useState(true)
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
        const d = loadWritingDraft(testId)
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
  }, [authToken, testId])

  useEffect(() => {
    if (!testId) return undefined
    setIeltsParams({ ieltsRun: testId, ieltsMode: mode, ieltsSkill: 'writing' })
    return () => setIeltsParams({ ieltsRun: null, ieltsMode: null, ieltsSkill: null })
  }, [testId, mode])

  // часы: время в редакторе, а не с первого открытия — закрытая вкладка экзаменационное время не тратит
  useEffect(() => {
    if (state.status !== 'ready') return undefined
    const t0 = Date.now()
    const id = setInterval(() => setElapsed(carried.current + Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [state.status])

  const words = useMemo(() => countWords(text), [text])
  const paragraphs = useMemo(() => text.split(/\n\s*\n+/).filter((p) => p.trim()).length, [text])

  // черновик — через секунду тишины, чтобы не писать на каждое нажатие
  useEffect(() => {
    if (state.status !== 'ready') return undefined
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
  const left = limit - elapsed
  const kind = kindKey(doc)
  const stepsDone = Math.min(PLAN_STEPS[kind], paragraphs)

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
      onDone?.(view.attempt.id, testId)
    } catch (e) {
      setError(e?.message || t('ieltsReading.submitError'))
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <div className="ih-run ih-wrun" data-mode={mode}>
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => onExit?.(testId)} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>Writing · {doc.kind === 'task2' ? 'Task 2' : 'Task 1'}</b>
          <span>{state.test.title}</span>
        </div>
        <span className="ih-run__spacer" />
        <span className={`ih-run__clock ${mode === 'exam' && left <= 300 ? 'is-low' : ''}`} role="timer" aria-live="off">
          <TimerIcon size={18} />
          {mode === 'exam' ? (left >= 0 ? formatClock(left) : `+${formatClock(-left)}`) : formatClock(elapsed)}
          <small>{t('ieltsWriting.ofMin', { n: String(Math.round(limit / 60)) })}</small>
        </span>
        <span className="ih-run__spacer" />
        {savedAt && <span className="ih-wrun__saved"><CheckCircleIcon size={16} />{t('ieltsWriting.savedAt', { time: savedAt.toTimeString().slice(0, 5) })}</span>}
        <button type="button" className="ih-btn ih-btn--primary" onClick={() => setConfirm(true)} disabled={!text.trim()}>
          {t('ieltsWriting.submit')}
        </button>
      </header>

      {mode === 'exam' && left < 0 && <p className="ih-wrun__overtime" role="status">{t('ieltsWriting.overtime')}</p>}
      {error && <p className="ih-run__error" role="alert">{error}</p>}

      <div className="ih-wrun__body">
        <aside className="ih-wrun__task">
          <span className="ih-chip ih-chip--violet ih-chip--md"><span>{t('ieltsWriting.taskChip')}</span></span>
          <WritingTaskBody task={doc} />
          <section className={`ih-wplan ${planOpen ? 'is-open' : ''}`}>
            <button type="button" className="ih-wplan__head" onClick={() => setPlanOpen((v) => !v)} aria-expanded={planOpen}>
              <b>{t('ieltsWriting.p.plan.open')}</b>
              <ExpandMoreIcon size={20} />
            </button>
            {planOpen && (
              <>
                <ol>
                  {Array.from({ length: PLAN_STEPS[kind] }, (_, i) => (
                    <li key={i} className={i < stepsDone ? 'is-done' : ''}>
                      <span className="ih-wplan__n">{i < stepsDone ? <CheckCircleIcon size={18} /> : i + 1}</span>
                      {t(`ieltsWriting.p.plan.${kind}.s${i + 1}`)}
                    </li>
                  ))}
                </ol>
                <p className="ih-wplan__note"><InfoIcon size={14} />{t(`ieltsWriting.p.plan.${kind}.note`)}</p>
              </>
            )}
          </section>
        </aside>

        <main className="ih-wrun__editor">
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
            <b>{words}</b>
            <span>{t('ieltsWriting.wordsNeed', { n: String(min) })}</span>
            <span className="ih-wrun__progress" aria-hidden="true"><span style={{ width: `${Math.min(100, (words / min) * 100)}%` }} /></span>
            {words < min ? (
              <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t('ieltsWriting.more', { n: String(min - words) })}</span></span>
            ) : (
              <span className="ih-chip ih-chip--green ih-chip--sm"><span>{t('ieltsWriting.enough')}</span></span>
            )}
            <span className="ih-run__spacer" />
            <span className="ih-muted">{t('ieltsWriting.p.work.paragraphs', { n: String(paragraphs) })}</span>
            <span className={`ih-muted ih-wrun__paste ${pasteNote ? 'is-flash' : ''}`} role={pasteNote ? 'status' : undefined}>{t('ieltsWriting.pasteOff')}</span>
          </div>
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
