import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { IELTS_LISTENING_TASK } from '../data/ielts-tasks.js'
import { gradeSection } from '../lib/ielts/key-grading.js'
import { speakListeningAudio, cancelSpeech } from '../lib/ielts-audio.js'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { GapInput, McqOptions, SectionResults } from './IeltsSectionShared.jsx'
import { HeadphonesIcon, PlayIcon, VolumeIcon } from '../components/ieltsIcons.jsx'

const MAX_PLAYS = 2

// IELTS Listening — two parts, each with its own audio (TTS from the bundled
// script, never displayed) and questions. Max 2 plays per part, like the exam
// plus one review. Answers stay editable while audio plays.
export default function IeltsListeningPage({ userLevel = 'A1', userName, token, onNav, onGo }) {
  const task = IELTS_LISTENING_TASK
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(null)
  // Per-part playback: state + plays used + error flag.
  const [play, setPlay] = useState(() =>
    Object.fromEntries(task.parts.map((p) => [p.id, { state: 'idle', used: 0, error: false }])),
  )

  // Stop any in-flight audio when leaving the screen or submitting.
  useEffect(() => () => cancelSpeech(), [])

  const allQuestions = useMemo(() => task.parts.flatMap((p) => p.questions), [task])
  const labels = useMemo(() => {
    const m = {}
    for (const q of allQuestions) {
      m[q.id] = q.kind === 'gap' ? q.prompt.replace('___', '…') : q.prompt
    }
    return m
  }, [allQuestions])
  // Continuous question numbering across parts, precomputed.
  const numbering = useMemo(
    () => Object.fromEntries(allQuestions.map((q, i) => [q.id, i + 1])),
    [allQuestions],
  )

  const setAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))
  const answeredAll = allQuestions.every((q) => (answers[q.id] ?? '').trim())

  const startPlayback = async (partId, script) => {
    const cur = play[partId]
    if (cur.state === 'loading' || cur.state === 'playing' || cur.used >= MAX_PLAYS) return
    setPlay((p) => ({ ...p, [partId]: { ...p[partId], state: 'loading', error: false } }))
    const how = await speakListeningAudio(script, {
      volume: 0.9,
      onEnd: () => setPlay((p) => ({ ...p, [partId]: { ...p[partId], state: 'done' } })),
    })
    if (how === 'none') {
      // TTS failed on every path — surface an error; retry does NOT consume a play.
      setPlay((p) => ({ ...p, [partId]: { ...p[partId], state: 'idle', error: true } }))
      return
    }
    setPlay((p) => ({
      ...p,
      [partId]: { state: 'playing', used: p[partId].used + 1, error: false },
    }))
  }

  const submit = () => {
    cancelSpeech()
    setResult(gradeSection(allQuestions, answers))
    setSaved(null)
    void fetch('/api/ielts/record-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({
        section: 'listening',
        taskId: task.id,
        answers,
        deviceId: getDeviceId(),
      }),
    })
      .then(async (res) => setSaved(res.ok ? (await res.json()).saved : false))
      .catch(() => setSaved(false))
  }

  const retry = () => {
    setAnswers({})
    setResult(null)
    setSaved(null)
    setPlay(
      Object.fromEntries(task.parts.map((p) => [p.id, { state: 'idle', used: 0, error: false }])),
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={() => {}}>
      <div className="ie ie--narrow">
        <button
          type="button"
          className="ie-back"
          onClick={() => {
            cancelSpeech()
            onGo?.('ielts')
          }}
        >
          ← К секциям IELTS
        </button>
        <h1 className="ie__title">Listening</h1>
        <p className="ie__sub">
          Каждую запись можно прослушать не больше двух раз. Отвечать можно прямо во время
          прослушивания.
        </p>

        <div className="ie-parts">
          {task.parts.map((part) => {
            const ps = play[part.id]
            const playsLeft = MAX_PLAYS - ps.used
            return (
              <div key={part.id} className="ie-card">
                <div className="ie-part__head">
                  <span className="ie-part__ic">
                    <HeadphonesIcon size={20} />
                  </span>
                  <div>
                    <div className="ie-part__title">{part.title}</div>
                    <div className="ie-part__ctx">{part.context}</div>
                  </div>
                </div>

                <div className="ie-part__play">
                  <button
                    type="button"
                    className="ie-btn ie-btn--sm"
                    disabled={
                      !!result || ps.state === 'loading' || ps.state === 'playing' || playsLeft <= 0
                    }
                    onClick={() => startPlayback(part.id, part.script)}
                  >
                    {ps.state === 'playing' ? (
                      <>
                        <VolumeIcon size={16} /> Играет…
                      </>
                    ) : ps.state === 'loading' ? (
                      'Загружаю…'
                    ) : (
                      <>
                        <PlayIcon size={16} />
                        {ps.used === 0 ? 'Прослушать запись' : 'Прослушать ещё раз'}
                      </>
                    )}
                  </button>
                  <span className="ie-part__left">Осталось прослушиваний: {playsLeft}</span>
                  {ps.error && (
                    <span className="ie-part__err">
                      Аудио недоступно — проверь соединение и попробуй ещё раз.
                    </span>
                  )}
                </div>

                <div className="ie-instr">{part.instructions}</div>
                <div className="ie-part__qs">
                  {part.questions.map((q) =>
                    q.kind === 'gap' ? (
                      <GapInput
                        key={q.id}
                        q={q}
                        index={numbering[q.id]}
                        value={answers[q.id] ?? ''}
                        onChange={(v) => setAnswer(q.id, v)}
                        disabled={!!result}
                      />
                    ) : (
                      <McqOptions
                        key={q.id}
                        q={q}
                        index={numbering[q.id]}
                        value={answers[q.id] ?? ''}
                        onChange={(v) => setAnswer(q.id, v)}
                        disabled={!!result}
                      />
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!result && (
          <button type="button" className="ie-btn ie-btn--mt" disabled={!answeredAll} onClick={submit}>
            Проверить ответы
          </button>
        )}

        {result && (
          <SectionResults
            result={result}
            saved={saved}
            questionLabel={(id) => labels[id] ?? id}
            onRetry={retry}
            onGo={onGo}
          />
        )}
      </div>
    </LearningLayout>
  )
}
