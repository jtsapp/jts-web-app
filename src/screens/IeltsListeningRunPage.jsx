import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { checkIeltsAnswer, getIeltsTest, getIeltsTranscript, submitIeltsAttempt } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import QuestionGroup from '../ielts/reading/QuestionGroup.jsx'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import Chip from '../ielts/ui/Chip.jsx'
import AudioPlayerBar from '../ielts/listening/AudioPlayerBar.jsx'
import TranscriptPanel from '../ielts/listening/TranscriptPanel.jsx'
import { useAudioPlayer } from '../ielts/listening/useAudioPlayer.js'
import { EXAM, flatDoc, lineAt, playerRules } from '../ielts/listening/listening.js'
import { mechanicOf } from '../ielts/reading/meta.js'
import {
  answeredCount, createRun, dropDraft, flattenItems, formatClock, isAnswered, loadDraft, moveTo, saveDraft, setAnswer,
  submitBody, toggleFlag,
} from '../ielts/reading/run.js'
import { setIeltsParams } from '../ielts/urlParams.js'
import { CloseIcon, HeadphonesIcon, InfoIcon } from '../ielts/icons.jsx'

/**
 * Прохождение Listening (Figma «8 · Listening — тренировка»): плеер сверху, бланк вопросов части, транскрипт
 * справа, номера и части снизу. Режимы — как в движке прототипа:
 *  - exam: 30 секунд на вопросы, запись один раз (части подряд), 2 минуты на проверку, потом сдача сама;
 *  - practice: пауза, ±5 с, 0.75×, транскрипт по кнопке, ответ проверяется сразу после ввода;
 *  - study: то же, транскрипт всегда открыт и подсвечивает реплику под записью, после ответа — объяснение.
 * Ключей у страницы нет: вердикт приходит с сервера (/check), итог — при сдаче (/attempts).
 */
export default function IeltsListeningRunPage({ token, target, onExit, onReview }) {
  const { t } = useI18n()
  const testId = target?.testId
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [run, setRun] = useState(null)
  const [partIdx, setPartIdx] = useState(0)
  const [transcripts, setTranscripts] = useState(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [phase, setPhase] = useState(null) // экзамен: { name: read|listen|check, endsAt }
  const [now, setNow] = useState(() => Date.now())
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!testId) return
    let alive = true
    getIeltsTest(authToken, testId)
      .then((r) => {
        if (!alive) return
        const doc = r.document
        const mode = target?.mode || 'practice'
        const draft = loadDraft(testId)
        // экзамен Listening не продолжается с середины: запись уже прозвучала — честнее начать заново
        setRun(draft && draft.mode === mode && mode !== 'exam' ? { ...draft, shownAt: Date.now() } : createRun(flatDoc(doc), mode))
        setState({ status: 'ready', doc, test: r.test })
        if (mode === 'exam') setPhase({ name: 'intro' })
        if (mode === 'study') setTranscriptOpen(true)
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, testId, target?.mode])

  useEffect(() => {
    if (!run) return
    setIeltsParams({ ieltsRun: run.testId, ieltsMode: run.mode, ieltsSkill: 'listening' })
    return () => setIeltsParams({ ieltsRun: null, ieltsMode: null, ieltsSkill: null })
  }, [run?.testId, run?.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (run && !submittedRef.current && run.mode !== 'exam') saveDraft(run)
  }, [run])

  const doc = state.doc
  const parts = doc?.parts || []
  const part = parts[partIdx] || null
  const mode = run?.mode
  const rules = useMemo(() => playerRules(mode, doc?.playback), [mode, doc?.playback])
  const flat = useMemo(() => (doc ? flatDoc(doc) : null), [doc])
  const items = useMemo(() => (flat ? flattenItems(flat) : []), [flat])
  const partItems = items.filter((x) => x.group.part === part?.number)

  // транскрипт — только в «Тренировке» и «Разборе», отдельным запросом (в тест без ключей он не входит)
  useEffect(() => {
    if (!doc || mode === 'exam' || transcripts) return
    getIeltsTranscript(authToken, doc.id).then(setTranscripts).catch(() => setTranscripts([]))
  }, [doc, mode, authToken, transcripts])
  const transcript = transcripts?.find((x) => x.number === part?.number)?.transcript || part?.transcript || null

  const submit = useCallback(async () => {
    if (!run || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitIeltsAttempt(authToken, run.testId, submitBody(run, Date.now(), window.innerWidth < 900 ? 'mobile' : 'desktop'))
      dropDraft(run.testId)
      onReview?.(res.attempt.id)
    } catch {
      submittedRef.current = false
      setError(t('ieltsReading.submitFailed'))
    } finally {
      setSubmitting(false)
      setConfirm(false)
    }
  }, [run, authToken, onReview, t])

  // экзамен: части играют подряд; кончилась последняя — 2 минуты на проверку
  const onEnded = useCallback(() => {
    if (mode !== 'exam') return
    if (partIdx < parts.length - 1) setPartIdx((i) => i + 1)
    else setPhase({ name: 'check', endsAt: Date.now() + EXAM.checkSec * 1000 })
  }, [mode, partIdx, parts.length])

  const player = useAudioPlayer({ src: part?.audio?.url || null, transcript: part?.audio?.tts ? part.transcript : null, rules, onEnded })

  // следующая часть экзамена начинается сама — как на экзамене, без кнопки
  const playRef = useRef(player.play)
  playRef.current = player.play
  useEffect(() => {
    if (mode === 'exam' && phase?.name === 'listen' && partIdx > 0) setTimeout(() => playRef.current(), 400)
  }, [partIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // часы фаз экзамена
  useEffect(() => {
    if (!phase?.endsAt) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [phase?.endsAt])
  const phaseLeft = phase?.endsAt ? Math.max(0, Math.ceil((phase.endsAt - now) / 1000)) : null
  useEffect(() => {
    if (phase?.name === 'read' && phaseLeft === 0) {
      setPhase({ name: 'listen' })
      playRef.current()
    }
    if (phase?.name === 'check' && phaseLeft === 0) submit()
  }, [phase?.name, phaseLeft, submit])

  if (!testId || state.status === 'missing' || state.status === 'error') {
    return (
      <div className="ih-run ih-run--empty">
        <EmptyState icon={<HeadphonesIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.(testId)}>{t('ieltsReading.back')}</button>
      </div>
    )
  }
  if (state.status === 'loading' || !run) return <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsReading.loading')}</p></div>

  const { test } = state
  const done = answeredCount(run, items)
  const current = lineAt(transcript, player.time)
  const checkedOf = (id) => run.checked[id]
  const numbers = partItems.flatMap((x) => x.numbers)
  const range = numbers.length ? `${numbers[0]}–${numbers.at(-1)}` : ''

  async function check(id, given = run.answers[id]) {
    if (!isAnswered(given)) return
    try {
      const res = await checkIeltsAnswer(authToken, run.testId, id, given)
      setRun((r) => ({ ...r, checked: { ...r.checked, [id]: res } }))
    } catch {
      setError(t('ieltsReading.checkFailed'))
    }
  }

  const answer = (id, v) => {
    setRun((r) => setAnswer(r, id, v))
    // выбор варианта проверяется в момент клика (пропуск — когда ученик ушёл из поля, см. PaperGroup)
    const entry = items.find((x) => x.id === id)
    const mech = entry && mechanicOf(entry.type)
    if (mode !== 'exam' && mech && mech !== 'gap' && mech !== 'multi' && isAnswered(v)) check(id, v)
    if (mode !== 'exam' && mech === 'multi' && Array.isArray(v) && v.length === entry.numbers.length) check(id, v)
  }

  const groupsFlat = flat.groups
    .map((g, gi) => ({ g, gi }))
    .filter(({ g }) => g.part === part?.number)
    .map(({ g, gi }) => ({ g, entries: items.filter((x) => x.groupIndex === gi) }))

  const examLocked = mode === 'exam' && phase?.name === 'intro'

  return (
    <div className="ih-run ih-lrun" data-mode={mode}>
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => { player.stop(); onExit?.(run.testId) }} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>Listening · Part {part?.number || 1}{parts.length > 1 ? ` ${t('ieltsListening.of')} ${parts.length}` : ''}</b>
          <span>{t(`ieltsReading.mode.${mode}`)} · {test.title}</span>
        </div>
        <span className="ih-run__spacer" />
        {mode === 'exam' && phase && phase.name !== 'intro' && (
          <span className={`ih-run__clock ${phaseLeft != null && phaseLeft <= 30 ? 'is-low' : ''}`} role="timer">
            {t(`ieltsListening.phase.${phase.name}`)}{phaseLeft != null ? ` · ${formatClock(phaseLeft)}` : ''}
          </span>
        )}
        {range && <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsListening.questions', { range })}</Chip>}
        <button type="button" className="ih-btn ih-btn--dark" onClick={() => setConfirm(true)}>
          {mode === 'exam' ? t('ieltsReading.submit') : t('ieltsReading.finish')}
        </button>
      </header>

      <div className="ih-lrun__body">
        <AudioPlayerBar
          player={player}
          rules={rules}
          transcriptOpen={transcriptOpen}
          onTranscript={mode === 'exam' ? null : () => setTranscriptOpen((v) => !v)}
        />
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        <div className={`ih-lrun__main ${transcriptOpen && mode !== 'exam' ? 'has-transcript' : ''}`}>
          <section className="ih-lrun__form ih-card">
            {part?.context && mode !== 'exam' && <p className="ih-lrun__context">{part.context}</p>}
            {groupsFlat.map(({ g, entries }) => (
              <QuestionGroup
                key={g.id}
                group={g}
                entries={entries}
                doc={flat}
                run={run}
                mode={mode}
                paper
                onAnswer={answer}
                onFlag={(id) => setRun((r) => toggleFlag(r, id))}
                onCheck={(id) => check(id)}
                onShowInText={(res) => res?.reveal?.audioStart != null && player.playRange(res.reveal.audioStart, res.reveal.audioEnd)}
                onFocus={(id) => setRun((r) => moveTo(r, id))}
              />
            ))}
            {mode !== 'exam' && (
              <p className="ih-lrun__hint"><InfoIcon size={16} />{t('ieltsListening.hintInstant')}</p>
            )}
          </section>
          {transcriptOpen && mode !== 'exam' && (
            <TranscriptPanel
              transcript={transcript}
              voices={part?.voices}
              current={current}
              onSeek={rules.allowSeek ? (s) => { player.seek(s); if (!player.playing) player.play() } : null}
              onClose={mode === 'practice' ? () => setTranscriptOpen(false) : null}
            />
          )}
        </div>
      </div>

      <nav className="ih-run__nav" aria-label={t('ieltsReading.questionsNav')}>
        <b className="ih-run__navlabel">Part {part?.number || 1}</b>
        <div className="ih-run__nums">
          {partItems.map((x) => {
            const ch = checkedOf(x.id)
            const on = isAnswered(run.answers[x.id])
            return (
              <button
                key={x.id}
                type="button"
                className={`ih-num ${on ? 'is-answered' : ''} ${run.current === x.id ? 'is-current' : ''} ${ch ? (ch.correct ? 'is-ok' : 'is-bad') : ''}`}
                onClick={() => {
                  setRun((r) => moveTo(r, x.id))
                  document.getElementById(`ih-q-${x.id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
                }}
              >
                {x.numbers.length > 1 ? `${x.numbers[0]}–${x.numbers.at(-1)}` : x.numbers[0]}
              </button>
            )
          })}
        </div>
        <span className="ih-run__answered">{t('ieltsReading.answeredOf', { n: String(done), total: String(items.length) })}</span>
        {parts.length > 1 && (
          <span className="ih-lrun__parts" role="tablist">
            {parts.map((p, i) => (
              <button
                key={p.id || i}
                type="button"
                role="tab"
                aria-selected={i === partIdx}
                className={i === partIdx ? 'is-on' : ''}
                disabled={mode === 'exam'}
                onClick={() => { player.stop(); setPartIdx(i) }}
              >
                Part {p.number}
              </button>
            ))}
          </span>
        )}
      </nav>

      {examLocked && (
        <div className="ih-dialog" role="presentation">
          <div className="ih-dialog__box" role="dialog" aria-modal="true" aria-labelledby="ih-exam-title">
            <h2 id="ih-exam-title">{t('ieltsListening.examTitle')}</h2>
            <p>{t('ieltsListening.examText', { read: String(EXAM.readSec), check: String(EXAM.checkSec / 60) })}</p>
            <div className="ih-dialog__actions">
              <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.(run.testId)}>{t('ieltsReading.cancel')}</button>
              {/* жест ученика здесь разрешает браузеру потом включить запись самому, без второго клика */}
              <button type="button" className="ih-btn ih-btn--primary" onClick={() => setPhase({ name: 'read', endsAt: Date.now() + EXAM.readSec * 1000 })}>
                {t('ieltsListening.examStart')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        title={t('ieltsReading.confirmTitle')}
        text={items.length - done ? t('ieltsReading.confirmUnanswered', { n: String(items.length - done) }) : t('ieltsReading.confirmAll')}
        confirmLabel={mode === 'exam' ? t('ieltsReading.submit') : t('ieltsReading.finish')}
        cancelLabel={t('ieltsReading.cancel')}
        busy={submitting}
        onConfirm={() => { player.stop(); submit() }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
