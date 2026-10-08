import { useCallback, useEffect, useRef, useState } from 'react'
import { assessIeltsSpeaking, getIeltsTest, getIeltsWritingModel } from '../api.js'
import { loadToken } from '../lib/session.js'
import { speakTts, stopTts, unlockSpeech } from '../lib/speech.js'
import { VOICE } from '../lib/ttsShared.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import MockRunHeader from '../ielts/mock/MockRunHeader.jsx'
import { CueCard } from '../ielts/speaking/SpeakingTaskView.jsx'
import { useRecorder } from '../ielts/speaking/useRecorder.js'
import { TIMING, formatSec, speakingQuestions } from '../ielts/speaking/speaking.js'
import { useLiveAcoustics } from '../ielts/speaking/liveAcoustics.js'
import { CheckIcon, CloseIcon, EditIcon, MicIcon, Replay5Icon } from '../ielts/icons.jsx'

// «Прошлый ответ» в строке метрик (Figma 11) — длина предыдущего ответа той же части, и между заходами тоже
const lastKey = (kind) => `jts_ielts_sp_last_${kind}`
function readLast(kind) {
  try {
    const v = Number(localStorage.getItem(lastKey(kind)))
    return v > 0 ? v : null
  } catch {
    return null
  }
}
function writeLast(kind, sec) {
  try {
    localStorage.setItem(lastKey(kind), String(sec))
  } catch {
    /* без хранилища метрика просто начнётся с прочерка */
  }
}

// Волна под кольцом: последние кадры громкости; кадры с голосом — зелёные, тишина — бледная (Figma 11)
function Wave({ levels }) {
  const bars = levels.length ? levels : Array.from({ length: 22 }, () => ({ level: 0, voiced: false }))
  return (
    <div className="ih-swave" aria-hidden="true">
      {bars.map((b, i) => (
        <i key={i} className={b.voiced ? 'is-voiced' : ''} style={{ height: `${Math.max(10, Math.round(b.level * 48))}px` }} />
      ))}
    </div>
  )
}

// Кольцо записи: сколько прошло из потолка ответа (Figma 11 — «1:24 из 2:00»).
function Ring({ value, max, children, live }) {
  const r = 70
  const c = 2 * Math.PI * r
  const share = Math.min(1, max ? value / max : 0)
  return (
    <div className={`ih-sring ${live ? 'is-live' : ''}`}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r={r} className="ih-sring__track" />
        <circle cx="80" cy="80" r={r} className="ih-sring__bar" strokeDasharray={c} strokeDashoffset={c * (1 - share)} transform="rotate(-90 80 80)" />
      </svg>
      <div className="ih-sring__body">{children}</div>
    </div>
  )
}

/**
 * Прохождение Speaking (Figma 11): экзаменатор читает вопрос (Soniox), ответ пишется с потолком времени, в Part 2 —
 * минута подготовки с заметками, монолог до двух минут и вопрос экзаменатора. «Экзамен» идёт сам: вопрос → запись →
 * следующий; «Тренировка» даёт переписать ответ и переслушать себя. В конце — свои записи, модельные ответы и
 * «Оценить ИИ»: записи уходят только в наш роут оценки и нигде не хранятся.
 * mock — часть Speaking полного mock: только «Экзамен», без модельных ответов и «Ещё раз»; записанные ответы сразу
 * уходят в mock.onRecorded — оценка идёт в фоне, пока ученик отвечает на следующую часть.
 */
export default function IeltsSpeakingRunPage({ token, target, onExit, onDone, mock = null }) {
  const { t, lang } = useI18n()
  const testId = target?.testId
  const mode = target?.mode === 'practice' && !mock ? 'practice' : 'exam'
  const authToken = token || loadToken()
  const rec = useRecorder()
  const [state, setState] = useState({ status: 'loading' })
  const [phase, setPhase] = useState('intro') // intro | ask | prep | answer | review | followup | done
  const [idx, setIdx] = useState(0)
  const [takes, setTakes] = useState({}) // itemId → { wav, url, durationSec }
  // живая акустика идёт только во время записи — тем же микрофоном (rec.stream)
  const live = useLiveAcoustics(rec.stream, rec.state === 'recording')
  const [notes, setNotes] = useState([]) // заметки Part 2 — фишками, как в Figma: ключевые слова, не предложения
  const [noteDraft, setNoteDraft] = useState('')
  const [prevDur, setPrevDur] = useState(null)
  const [prepLeft, setPrepLeft] = useState(0)
  const [models, setModels] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (!testId) return undefined
    getIeltsTest(authToken, testId)
      .then((r) => alive.current && setState({ status: 'ready', doc: r.document, test: r.test }))
      .catch((e) => alive.current && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive.current = false
      stopTts()
    }
  }, [authToken, testId])

  useEffect(() => {
    if (!testId || mock) return undefined
    setIeltsParams({ ieltsRun: testId, ieltsMode: mode, ieltsSkill: 'speaking' })
    return () => setIeltsParams({ ieltsRun: null, ieltsMode: null, ieltsSkill: null })
  }, [testId, mode])

  const doc = state.doc
  const qs = speakingQuestions(doc)
  const q = qs[idx]
  const timing = doc ? TIMING[doc.kind] : null
  const part2 = doc?.kind === 'part2'

  const kind = doc?.kind
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- значение из localStorage, только на клиенте после загрузки теста
    if (kind) setPrevDur(readLast(kind))
  }, [kind])

  const record = useCallback(
    (itemId, maxSec, next) => {
      rec.start({
        maxSec,
        onDone: (take) => {
          if (!alive.current) return
          if (take) {
            setTakes((m) => {
              // переписанный ответ: запись прежнего дубля освобождается сразу
              rec.drop(m[itemId]?.url)
              return { ...m, [itemId]: take }
            })
            setPrevDur(take.durationSec)
            if (kind) writeLast(kind, take.durationSec)
          }
          next?.(take)
        },
      })
    },
    [rec, kind],
  )

  const goNext = useCallback(() => {
    if (part2 && q?.followUp && phase !== 'followup') {
      setPhase('followup')
      speakTts(q.followUp, { voice: VOICE.gb }).then(() => alive.current && record(`${q.id}-fu`, TIMING.part2.followUpSec, () => setPhase('done')))
      return
    }
    if (idx + 1 < qs.length) {
      setIdx(idx + 1)
      setPhase('ask')
    } else setPhase('done')
  }, [idx, qs.length, part2, q, phase, record])

  // Вопрос: экзаменатор читает, затем запись (в «Экзамене» — сама, в «Тренировке» — по кнопке)
  useEffect(() => {
    if (phase !== 'ask' || !q || part2) return
    let cancelled = false
    speakTts(q.question, { voice: VOICE.gb }).then(() => {
      if (cancelled || !alive.current) return
      if (mode === 'exam') {
        setPhase('answer')
        record(q.id, timing.answerSec, () => alive.current && goNextRef.current())
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx])

  const goNextRef = useRef(goNext)
  goNextRef.current = goNext

  // Part 2: минута подготовки, потом монолог сам
  useEffect(() => {
    if (phase !== 'prep') return undefined
    const t0 = Date.now()
    const id = setInterval(() => {
      const left = TIMING.part2.prepSec - Math.floor((Date.now() - t0) / 1000)
      setPrepLeft(left)
      if (left <= 0) {
        clearInterval(id)
        startMonologue()
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const startMonologue = () => {
    setPhase('answer')
    record(q.id, TIMING.part2.answerSec, () => alive.current && (mode === 'exam' ? goNextRef.current() : setPhase('review')))
  }

  const begin = () => {
    unlockSpeech()
    setTakes({})
    setIdx(0)
    if (part2) {
      setPrepLeft(TIMING.part2.prepSec)
      setPhase('prep')
    } else setPhase('ask')
  }

  const answerNow = () => {
    stopTts()
    setPhase('answer')
    record(q.id, timing.answerSec, () => alive.current && (mode === 'exam' ? goNextRef.current() : setPhase('review')))
  }

  // mock: часть записана — ответы уходят наружу один раз, экран mock переходит дальше сам
  const handedOver = useRef(false)
  useEffect(() => {
    if (!mock || phase !== 'done' || handedOver.current) return
    handedOver.current = true
    mock.onRecorded(qs.filter((x) => takes[x.id]).map((x) => ({ itemId: x.id, durationSec: takes[x.id].durationSec, wav: takes[x.id].wav })))
  }, [mock, phase, qs, takes])

  useEffect(() => {
    if (mock || phase !== 'done' || models || !testId) return
    getIeltsWritingModel(authToken, testId).then((m) => alive.current && setModels(m)).catch(() => alive.current && setModels({}))
  }, [phase, models, authToken, testId])

  const grade = async () => {
    setBusy(true)
    setError(null)
    try {
      const answers = qs.filter((x) => takes[x.id]).map((x) => ({ itemId: x.id, durationSec: takes[x.id].durationSec, wav: takes[x.id].wav }))
      const view = await assessIeltsSpeaking(authToken, { testId, mode, uiLang: lang, answers })
      onDone?.(view.attempt.id)
    } catch (e) {
      setError(t(`ieltsSpeaking.gradeError.${['quota', 'grading_unavailable', 'no_speech', 'too_large'].includes(e?.code) ? e.code : 'other'}`))
      setBusy(false)
    }
  }

  if (!testId || state.status === 'missing' || state.status === 'error')
    return (
      <div className="ih-run ih-run--empty">
        <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.(testId)}>{t('ieltsReading.back')}</button>
      </div>
    )
  if (state.status === 'loading') return <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsReading.loading')}</p></div>

  const recording = rec.state === 'recording'
  const addNote = () => {
    const v = noteDraft.trim()
    if (v) setNotes((n) => [...n, v])
    setNoteDraft('')
  }
  const steps = part2 ? ['prep', 'answer', 'followup'] : null
  // до старта ни один этап не начат и не пройден
  const stepIndex = part2 ? (phase === 'intro' ? -1 : phase === 'prep' ? 0 : phase === 'followup' || phase === 'done' ? 2 : 1) : null
  const answered = qs.filter((x) => takes[x.id]).length
  const maxSec = phase === 'followup' ? TIMING.part2.followUpSec : timing.answerSec

  return (
    <div className="ih-run ih-srun" data-mode={mode}>
      {mock ? (
        <MockRunHeader mock={mock} section="Speaking" part={`Part ${doc.kind.slice(4)}`} onExit={() => { rec.stop(); stopTts(); mock.onExit() }}>
          {phase !== 'intro' && phase !== 'done' && !steps && <span className="ih-run__clock">{t('ieltsSpeaking.qOf', { n: String(idx + 1), total: String(qs.length) })}</span>}
        </MockRunHeader>
      ) : (
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => { rec.stop(); stopTts(); onExit?.(testId) }} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>Speaking · Part {doc.kind.slice(4)}</b>
          <span>{t(`ieltsSpeaking.mode.${mode}`)} · {state.test.title}</span>
        </div>
        <span className="ih-run__spacer" />
        {steps ? (
          <ol className="ih-sstep" aria-label={t('ieltsSpeaking.stepsLabel')}>
            {steps.map((s, i) => (
              <li key={s} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-on' : ''}>
                {i < stepIndex ? <CheckIcon size={14} /> : <span>{i + 1}</span>}
                {/* у подготовки — остаток минуты, а пройденной — её длина (Figma: «✓ Подготовка · 1:00») */}
                {t(`ieltsSpeaking.step.${s}`)}{s === 'prep' ? ` · ${formatSec(phase === 'prep' ? prepLeft : TIMING.part2.prepSec)}` : ''}
              </li>
            ))}
          </ol>
        ) : (
          phase !== 'intro' && phase !== 'done' && <span className="ih-run__clock">{t('ieltsSpeaking.qOf', { n: String(idx + 1), total: String(qs.length) })}</span>
        )}
        <span className="ih-run__spacer" />
        {phase !== 'intro' && phase !== 'done' && (
          <button type="button" className="ih-btn ih-btn--outline" onClick={() => { rec.stop(); stopTts(); if (!recording) goNext() }}>
            {t('ieltsSpeaking.skip')}
          </button>
        )}
      </header>
      )}

      {phase === 'intro' && (
        <main className="ih-srun__intro">
          <section className="ih-card">
            <h2>{t(`ieltsSpeaking.introTitle.${doc.kind}`)}</h2>
            <p>{t(`ieltsSpeaking.intro.${doc.kind}`, { n: String(qs.length) })}</p>
            <p className="ih-muted">{t('ieltsSpeaking.privacy')}</p>
            {rec.error && <p className="ih-run__error" role="alert">{t(`ieltsSpeaking.micError.${rec.error}`)}</p>}
            <button type="button" className="ih-cta" onClick={begin}><MicIcon size={20} />{t('ieltsSpeaking.begin')}</button>
          </section>
        </main>
      )}

      {phase !== 'intro' && phase !== 'done' && (
        <main className="ih-srun__body">
          <div className="ih-srun__left">
            {part2 ? (
              <section className="ih-card"><CueCard doc={doc} /></section>
            ) : (
              <section className="ih-card ih-srun__q" lang="en">
                <span className="ih-chip ih-chip--green ih-chip--md"><span>{t('ieltsSpeaking.examiner')}</span></span>
                <h3>{q?.question}</h3>
                <button type="button" className="ih-btn ih-btn--soft-violet" onClick={() => speakTts(q.question, { voice: VOICE.gb })}><Replay5Icon size={16} />{t('ieltsSpeaking.repeatQ')}</button>
              </section>
            )}
            {phase === 'followup' && (
              <section className="ih-card ih-srun__q" lang="en">
                <span className="ih-chip ih-chip--green ih-chip--md"><span>{t('ieltsSpeaking.step.followup')}</span></span>
                <h3>{q.followUp}</h3>
              </section>
            )}
            {part2 && (
              <section className="ih-snotes">
                <header>
                  <b><EditIcon size={18} />{t('ieltsSpeaking.notes')}</b>
                  <span>{t('ieltsSpeaking.notesMadeIn')}</span>
                </header>
                <ul className="ih-snotes__chips" lang="en">
                  {notes.map((n, i) => (
                    <li key={`${n}-${i}`}>
                      {n}
                      {phase === 'prep' && (
                        <button type="button" aria-label={t('ieltsSpeaking.removeNote')} onClick={() => setNotes((all) => all.filter((_, j) => j !== i))}>×</button>
                      )}
                    </li>
                  ))}
                  {phase === 'prep' ? (
                    <li className="ih-snotes__input">
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            addNote()
                          }
                        }}
                        onBlur={addNote}
                        placeholder={t('ieltsSpeaking.notesAdd')}
                        lang="en"
                        aria-label={t('ieltsSpeaking.notes')}
                      />
                    </li>
                  ) : (
                    !notes.length && <li className="ih-snotes__empty">{t('ieltsSpeaking.notesEmpty')}</li>
                  )}
                </ul>
                <p>{t('ieltsSpeaking.notesFooter')}</p>
              </section>
            )}
          </div>

          <section className="ih-card ih-srec">
            {phase === 'prep' ? (
              <>
                <p className="ih-srec__status">{t('ieltsSpeaking.prepNow')}</p>
                <Ring value={TIMING.part2.prepSec - prepLeft} max={TIMING.part2.prepSec}>
                  <b>{formatSec(prepLeft)}</b>
                  <span>{t('ieltsSpeaking.ofTime', { time: formatSec(TIMING.part2.prepSec) })}</span>
                </Ring>
                <button type="button" className="ih-btn ih-btn--dark ih-srec__main" onClick={startMonologue}>{t('ieltsSpeaking.speakNow')}</button>
              </>
            ) : (
              <>
                <p className={`ih-srec__status ${recording ? 'is-rec' : ''}`}>
                  {recording ? t('ieltsSpeaking.recording') : rec.state === 'processing' ? t('ieltsSpeaking.processing') : phase === 'ask' ? t('ieltsSpeaking.listen') : t('ieltsSpeaking.ready')}
                </p>
                <Ring value={recording ? rec.elapsed : 0} max={maxSec} live={recording}>
                  <b>{formatSec(recording ? rec.elapsed : 0)}</b>
                  <span>{t('ieltsSpeaking.ofTime', { time: formatSec(maxSec) })}</span>
                </Ring>
                {recording && (
                  <>
                    <Wave levels={live.levels} />
                    <span className={`ih-shear ${live.hearing ? 'is-on' : ''}`}>
                      <MicIcon size={18} />
                      {live.hearing ? (live.device ? t('ieltsSpeaking.hearing', { device: live.device.replace(/\s*\(.*\)$/, '') }) : t('ieltsSpeaking.hearingShort')) : t('ieltsSpeaking.notHearing')}
                    </span>
                  </>
                )}
                {recording ? (
                  <button type="button" className="ih-btn ih-btn--dark ih-srec__main ih-srec__stop" onClick={rec.stop}><span className="ih-srec__pause" aria-hidden="true"><i /><i /></span>{t('ieltsSpeaking.stop')}</button>
                ) : phase === 'review' ? (
                  <div className="ih-srec__review">
                    {takes[q.id] && <audio controls src={takes[q.id].url} />}
                    <div className="ih-srec__row">
                      <button type="button" className="ih-btn ih-btn--outline" onClick={answerNow}>{t('ieltsSpeaking.retake')}</button>
                      <button type="button" className="ih-btn ih-btn--primary" onClick={goNext}>{t('ieltsSpeaking.next')}</button>
                    </div>
                  </div>
                ) : (
                  mode === 'practice' && phase === 'ask' && <button type="button" className="ih-btn ih-btn--dark ih-srec__main" onClick={answerNow}><MicIcon size={18} />{t('ieltsSpeaking.answer')}</button>
                )}
                <p className="ih-muted">{t(part2 && phase === 'answer' ? 'ieltsSpeaking.autoStopP2' : 'ieltsSpeaking.autoStop', { time: formatSec(maxSec) })}</p>
                {rec.error && <p className="ih-run__error" role="alert">{t(`ieltsSpeaking.micError.${rec.error}`)}</p>}
              </>
            )}
            {/* метрики Figma 11: прошлый ответ, доля речи, паузы дольше 2 с, слова в минуту — считаются на устройстве */}
            <div className="ih-srec__stats">
              <div><b>{prevDur ? formatSec(prevDur) : '—'}</b><span>{t('ieltsSpeaking.metric.prev')}</span></div>
              <div><b>{live.speechShare != null ? `${live.speechShare} %` : '—'}</b><span>{t('ieltsSpeaking.metric.share')}</span></div>
              <div><b>{live.speechShare != null ? live.longPauses : '—'}</b><span>{t('ieltsSpeaking.metric.pauses')}</span></div>
              <div><b>{live.wpm ?? '—'}</b><span>{t('ieltsSpeaking.metric.wpm')}</span></div>
            </div>
          </section>
        </main>
      )}

      {phase === 'done' && mock && <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsMock.partSaved')}</p></div>}

      {phase === 'done' && !mock && (
        <main className="ih-srun__done">
          <section className="ih-card">
            <h2>{t('ieltsSpeaking.doneTitle')}</h2>
            <p className="ih-muted">{t('ieltsSpeaking.doneText')}</p>
            {qs.map((x) => {
              const model = part2 ? models : models?.questions?.[x.id]
              return (
                <div key={x.id} className="ih-sdone__item">
                  <b lang="en">{x.question}</b>
                  {takes[x.id] ? <audio controls src={takes[x.id].url} /> : <p className="ih-muted">{t('ieltsSpeaking.noTake')}</p>}
                  {model?.text && (
                    <details>
                      <summary>{t('ieltsSpeaking.modelAnswer')} · band {model.band}</summary>
                      {model.text.map((p, i) => <p key={i} lang="en">{p}</p>)}
                    </details>
                  )}
                </div>
              )
            })}
            {error && <p className="ih-run__error" role="alert">{error}</p>}
            <div className="ih-srec__row">
              <button type="button" className="ih-btn ih-btn--outline" onClick={begin} disabled={busy}>{t('ieltsSpeaking.again')}</button>
              <button type="button" className="ih-btn ih-btn--primary" onClick={grade} disabled={busy || !answered}>{busy ? t('ieltsSpeaking.grading') : t('ieltsWriting.gradeNow')}</button>
            </div>
            <p className="ih-muted">{t('ieltsSpeaking.privacy')}</p>
          </section>
        </main>
      )}
    </div>
  )
}
