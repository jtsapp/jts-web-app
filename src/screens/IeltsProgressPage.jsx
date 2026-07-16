import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { ArrowLeftIcon, LoaderIcon, TrendingUpIcon } from '../components/ieltsIcons.jsx'

const CRITERIA_LABELS = {
  // Writing
  taskResponse: 'TR',
  coherenceCohesion: 'CC',
  lexicalResource: 'LR',
  grammaticalRange: 'GRA',
  // Speaking
  fluencyCoherence: 'FC',
  pronunciation: 'PR',
}

// Listening/Reading rows store {correct,total} instead of the four writing
// descriptors — render them as a single raw-score chip.
function isObjectiveCriteria(c) {
  return !!c && typeof c === 'object' && typeof c.correct === 'number' && typeof c.total === 'number'
}

function bandColor(band) {
  if (band >= 7.5) return '#00a876'
  if (band >= 6.5) return '#2b8fe8'
  if (band >= 5.5) return '#e8892b'
  return '#e0364b'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IeltsProgressPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scores, setScores] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const qs = `?deviceId=${encodeURIComponent(getDeviceId())}`
        const res = await fetch(`/api/ielts/scores${qs}`, { headers: authHeaders(token) })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || data.error) {
          setError(data.error || 'Не удалось загрузить историю.')
          return
        }
        setScores(data.scores)
      } catch {
        if (!cancelled) setError('Сеть недоступна. Попробуй ещё раз.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  // Newest first from the API. For the trend chart we want oldest → newest.
  const chrono = [...scores].reverse()
  const latest = scores[0]
  const prev = scores[1]
  const delta = latest && prev ? latest.overallBand - prev.overallBand : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" onNav={onNav} onProfile={onProfile}>
      <div className="ie">
        <button type="button" className="ie-back ie-back--icon" onClick={() => onGo?.('ielts')}>
          <ArrowLeftIcon size={16} strokeWidth={2.5} />К секциям IELTS
        </button>
        <h1 className="ie__title">Мой прогресс</h1>
        <p className="ie__sub">Динамика band по завершённым попыткам</p>

        {loading ? (
          <div className="ie-loading">
            <LoaderIcon size={24} />
            <span>Загружаю историю…</span>
          </div>
        ) : error ? (
          <div className="ie-err">{error}</div>
        ) : scores.length === 0 ? (
          <div className="ie-empty ie-empty--pad">
            <p>Пока нет завершённых попыток. Пройди любую секцию — результат появится здесь.</p>
            <button type="button" className="ie-btn ie-btn--mt" onClick={() => onGo?.('ielts-writing')}>
              Начать Writing
            </button>
          </div>
        ) : (
          <>
            <div className="ie-card ie-card--mt ie-latest">
              <div>
                <span className="ie-band__label">Последний Overall</span>
                <div className="ie-latest__v" style={{ color: bandColor(latest.overallBand) }}>
                  {latest.overallBand.toFixed(1)}
                </div>
              </div>
              {delta !== null && (
                <div
                  className="ie-latest__delta"
                  style={{ color: delta >= 0 ? '#00a876' : '#e0364b' }}
                >
                  <span style={{ transform: delta < 0 ? 'scaleY(-1)' : undefined }}>
                    <TrendingUpIcon size={16} />
                  </span>
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(1)} к прошлой
                </div>
              )}
              <span className="ie-latest__count">
                {scores.length} попыт{scores.length === 1 ? 'ка' : 'ок'}
              </span>
            </div>

            {chrono.length > 1 && (
              <div className="ie-card ie-card--mt">
                <span className="ie-band__label">Динамика band (0–9)</span>
                <div className="ie-trend">
                  {chrono.map((s) => (
                    <div key={s.id} className="ie-trend__col">
                      <span className="ie-trend__v" style={{ color: bandColor(s.overallBand) }}>
                        {s.overallBand.toFixed(1)}
                      </span>
                      <div
                        className="ie-trend__bar"
                        style={{
                          height: `${(s.overallBand / 9) * 100}%`,
                          background: bandColor(s.overallBand),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ie-hist">
              {scores.map((s) => (
                <div key={s.id} className="ie-card ie-hist__row">
                  <div className="ie-hist__band" style={{ color: bandColor(s.overallBand) }}>
                    {s.overallBand.toFixed(1)}
                  </div>
                  <div className="ie-hist__body">
                    <div className="ie-hist__top">
                      <span className="ie-hist__sec">{s.section}</span>
                      <span className="ie-hist__date">{formatDate(s.createdAt)}</span>
                    </div>
                    {s.criteria && (
                      <div className="ie-hist__chips">
                        {isObjectiveCriteria(s.criteria) ? (
                          <span className="ie-chip">
                            {s.criteria.correct}/{s.criteria.total} правильных
                          </span>
                        ) : (
                          Object.entries(s.criteria).map(([k, v]) => (
                            <span key={k} className="ie-chip">
                              {CRITERIA_LABELS[k] ?? k} {Number(v).toFixed(1)}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {s.provider === 'mock' && <span className="ie-badge ie-badge--wip">демо</span>}
                  {s.provider === 'answer-key' && (
                    <span className="ie-badge ie-badge--soon">оценочно</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </LearningLayout>
  )
}
