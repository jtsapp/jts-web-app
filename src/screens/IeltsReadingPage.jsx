import { useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { IELTS_READING_TASK } from '../data/ielts-tasks.js'
import { gradeSection } from '../lib/ielts/key-grading.js'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { GapInput, TfngOptions, SectionResults } from './IeltsSectionShared.jsx'

// IELTS Reading — one passage, TFNG + sentence-completion questions,
// answer-key graded on the client for instant results; the attempt is
// persisted best-effort via POST /api/ielts/record-section (server re-grades).
export default function IeltsReadingPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo }) {
  const task = IELTS_READING_TASK
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(null)

  const setAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))

  const answeredAll = task.questions.every((q) => (answers[q.id] ?? '').trim())

  const labels = useMemo(() => {
    const m = {}
    for (const q of task.questions) {
      m[q.id] = q.kind === 'tfng' ? q.statement : q.prompt.replace('___', '…')
    }
    return m
  }, [task])

  const submit = () => {
    setResult(gradeSection(task.questions, answers))
    setSaved(null)
    // Fire-and-forget persist; server re-grades from raw answers.
    void fetch('/api/ielts/record-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({
        section: 'reading',
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
  }

  const tfng = task.questions.filter((q) => q.kind === 'tfng')
  const gaps = task.questions.filter((q) => q.kind === 'gap')

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" onNav={onNav} onProfile={onProfile}>
      <div className="ie">
        <button type="button" className="ie-back" onClick={() => onGo?.('ielts')}>
          ← К секциям IELTS
        </button>
        <h1 className="ie__title">Reading · {task.title}</h1>
        <p className="ie__sub">Прочитай текст и ответь на вопросы. Времени — сколько нужно.</p>

        <div className="ie-read">
          <div className="ie-card ie-read__passage">
            <div className="ie-kicker">Reading passage</div>
            <p className="ie-read__text">{task.passage}</p>
          </div>

          <div className="ie-read__qs">
            <div className="ie-instr">{task.instructions.tfng}</div>
            {tfng.map((q, i) => (
              <TfngOptions
                key={q.id}
                q={q}
                index={i + 1}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswer(q.id, v)}
                disabled={!!result}
              />
            ))}
            <div className="ie-instr ie-instr--gap">{task.instructions.gap}</div>
            {gaps.map((q, i) => (
              <GapInput
                key={q.id}
                q={q}
                index={tfng.length + i + 1}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswer(q.id, v)}
                disabled={!!result}
              />
            ))}

            {!result && (
              <button type="button" className="ie-btn" disabled={!answeredAll} onClick={submit}>
                Проверить ответы
              </button>
            )}
          </div>
        </div>

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
