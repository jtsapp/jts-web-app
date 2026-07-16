import { useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { ArrowLeftIcon, LoaderIcon, SparklesIcon } from '../components/ieltsIcons.jsx'

// IELTS Writing flow. Learner reads the prompt (Task 1 also shows a chart),
// writes, submits → real Sonnet band-scoring via /api/ielts/assess-writing.
// Task 1 is graded multimodally: the server sends the same chart to the model.
// Prompts are placeholders until the admin panel streams tasks into ielts_task.
const TASK2_PROMPT =
  'Some people believe that unpaid community service should be a compulsory part of high school programmes (for example, working for a charity, improving the neighbourhood or teaching sports to younger children).\n\nTo what extent do you agree or disagree?'

const TASK1_PROMPT =
  'The chart below shows the percentage of households with internet access in four countries in 2005 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.'

const TASK1_IMAGE = '/ielts/demo-task1-chart.png'

// Minimum word counts per task (IELTS official).
const MIN_WORDS = { task1: 150, task2: 250 }

const CRITERIA_LABELS = {
  taskResponse: 'Task Response',
  coherenceCohesion: 'Coherence & Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRange: 'Grammar Range & Accuracy',
}

// Band → colour, IELTS-ish traffic light.
function bandColor(band) {
  if (band >= 7.5) return '#00a876'
  if (band >= 6.5) return '#2b8fe8'
  if (band >= 5.5) return '#e8892b'
  return '#e0364b'
}

function countWords(text) {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export default function IeltsWritingPage({ userLevel = 'A1', userName, token, onNav, onGo }) {
  const [task, setTask] = useState('task2')
  const [essay, setEssay] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const prompt = task === 'task1' ? TASK1_PROMPT : TASK2_PROMPT
  const minWords = MIN_WORDS[task]
  const words = useMemo(() => countWords(essay), [essay])
  const underLength = words > 0 && words < minWords

  // Switching task resets the draft + any previous result to avoid mixing them.
  function switchTask(next) {
    if (next === task) return
    setTask(next)
    setEssay('')
    setResult(null)
    setError(null)
  }

  async function submit() {
    if (loading) return
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ielts/assess-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          essay,
          task,
          promptShown: prompt,
          uiLang: 'ru',
          deviceId: getDeviceId(),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Не удалось оценить эссе.')
        return
      }
      setResult(data)
    } catch {
      setError('Сеть недоступна. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" onNav={onNav} onProfile={() => {}}>
      <div className="ie">
        <button type="button" className="ie-back ie-back--icon" onClick={() => onGo?.('ielts')}>
          <ArrowLeftIcon size={16} strokeWidth={2.5} />К секциям IELTS
        </button>

        <div className="ie-tabs">
          {['task1', 'task2'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTask(t)}
              className={`ie-tab ${task === t ? 'ie-tab--on' : ''}`}
            >
              {t === 'task1' ? 'Task 1' : 'Task 2'}
            </button>
          ))}
        </div>

        <h1 className="ie__title">Writing · {task === 'task1' ? 'Task 1' : 'Task 2'}</h1>
        <p className="ie__sub">
          {task === 'task1'
            ? `Описание графика, минимум ${minWords} слов. ИИ сверяет текст с диаграммой.`
            : `Аргументативное эссе, минимум ${minWords} слов. Оценка ИИ по 4 официальным критериям.`}
        </p>

        <div className="ie-wr">
          <div className="ie-wr__left">
            <div className="ie-prompt">
              <span className="ie-prompt__label">Задание</span>
              <p className="ie-prompt__text">{prompt}</p>
              {task === 'task1' && (
                <div className="ie-prompt__img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TASK1_IMAGE} alt="Диаграмма для описания" />
                </div>
              )}
            </div>

            <div className="ie-card ie-editor">
              <textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Начни писать эссе здесь…"
                rows={14}
              />
              <div className="ie-editor__foot">
                <span className={`ie-editor__count ${underLength ? 'ie-editor__count--low' : ''}`}>
                  {words} слов{underLength ? ` · меньше ${minWords}` : ''}
                </span>
                <button
                  type="button"
                  className="ie-btn ie-btn--sm"
                  onClick={submit}
                  disabled={loading || words === 0}
                >
                  {loading ? (
                    <>
                      <LoaderIcon size={16} /> Оцениваю…
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={16} /> Оценить эссе
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && <div className="ie-err">{error}</div>}
          </div>

          <div className="ie-wr__right">
            {result ? (
              <ResultCard assessment={result.assessment} mode={result.mode} />
            ) : (
              <div className="ie-empty">Результат оценки появится здесь после отправки.</div>
            )}
          </div>
        </div>

        {result && <ResultDetail assessment={result.assessment} />}

        {result && (
          <div className="ie-cta">
            <button
              type="button"
              className="ie-btn ie-btn--ghost"
              onClick={() => onGo?.('ielts-progress')}
            >
              Смотреть прогресс
            </button>
            <span className={`ie-saved ${result.saved ? 'ie-saved--ok' : ''}`}>
              {result.saved ? 'Попытка сохранена' : 'Попытка не сохранена'}
            </span>
          </div>
        )}
      </div>
    </LearningLayout>
  )
}

function ResultCard({ assessment, mode }) {
  const { criteria, overallBand, feedback } = assessment
  const rows = [
    ['taskResponse', criteria.taskResponse],
    ['coherenceCohesion', criteria.coherenceCohesion],
    ['lexicalResource', criteria.lexicalResource],
    ['grammaticalRange', criteria.grammaticalRange],
  ]

  return (
    <div className="ie-card ie-band">
      <div className="ie-band__head">
        <span className="ie-band__label">Overall Band</span>
        {mode === 'mock' && <span className="ie-badge ie-badge--wip">демо</span>}
      </div>
      <div className="ie-band__value" style={{ color: bandColor(overallBand) }}>
        {overallBand.toFixed(1)}
      </div>

      <div className="ie-band__rows">
        {rows.map(([key, band]) => (
          <div key={key}>
            <div className="ie-band__row">
              <span>{CRITERIA_LABELS[key]}</span>
              <b style={{ color: bandColor(band) }}>{band.toFixed(1)}</b>
            </div>
            <div className="ie-bar">
              <div
                className="ie-bar__fill"
                style={{ width: `${(band / 9) * 100}%`, background: bandColor(band) }}
              />
            </div>
          </div>
        ))}
      </div>

      {feedback && <p className="ie-band__fb">{feedback}</p>}
    </div>
  )
}

function ResultDetail({ assessment }) {
  const { errors, rewrites } = assessment
  if (errors.length === 0 && rewrites.length === 0) return null

  return (
    <div className="ie-detail">
      {errors.length > 0 && (
        <div className="ie-card">
          <h3 className="ie-detail__h">Ошибки ({errors.length})</h3>
          <div className="ie-detail__list">
            {errors.map((e, i) => (
              <div key={i} className="ie-error">
                <p>
                  <s>{e.quote}</s>
                  {' → '}
                  <b>{e.correction}</b>
                </p>
                <p className="ie-error__why">
                  {e.issue} · {CRITERIA_LABELS[e.criterion]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {rewrites.length > 0 && (
        <div className="ie-card">
          <h3 className="ie-detail__h">Как усилить</h3>
          <div className="ie-detail__list ie-detail__list--gap">
            {rewrites.map((r, i) => (
              <div key={i} className="ie-rw">
                <p className="ie-rw__from">{r.original}</p>
                <p className="ie-rw__to">{r.improved}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
