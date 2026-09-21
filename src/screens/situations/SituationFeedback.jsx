'use client'

import { useI18n } from '../../i18n.jsx'
import { AXES, scoreLabelKey } from '../../lib/situations/score.js'

// Карточка разбора устного ответа: итог, пять осей, что услышали, ошибки и
// советы.
//
// Ось без значения показывается как «—», а не как ноль: ноль студент читает
// как приговор, хотя означает он «Azure не ответил». Итог при этом считается
// по остальным осям (см. composeScore).
export default function SituationFeedback({ result }) {
  const { t } = useI18n()
  const { overall, axes, transcript, errors, recommendations, summary } = result

  return (
    <div className="sit-fb">
      <div className="sit-fb__top">
        <div className="sit-fb__ring" style={{ '--p': overall ?? 0 }}>
          <span>{overall ?? '—'}</span>
        </div>
        <div>
          <h5>{t(scoreLabelKey(overall))}</h5>
          <p>{t('situations.feedback.overall')}</p>
        </div>
      </div>

      <div className="sit-fb__axes">
        {AXES.map((axis) => {
          const value = axes[axis]
          return (
            <div className="sit-fb__axis" key={axis}>
              <span className="sit-fb__axis-name">{t(`situations.axis.${axis}`)}</span>
              <span className={`sit-fb__axis-bar${value != null && value < 70 ? ' is-warn' : ''}`}>
                <i style={{ width: `${value ?? 0}%` }} />
              </span>
              <span className="sit-fb__axis-val">{value ?? '—'}</span>
            </div>
          )
        })}
      </div>

      {transcript && (
        <div className="sit-fb__block">
          <h6>{t('situations.feedback.heard')}</h6>
          <p className="sit-fb__transcript">«{transcript}»</p>
        </div>
      )}

      <div className="sit-fb__block">
        <h6>{t('situations.feedback.errors')}</h6>
        {errors.length ? (
          errors.map((e, i) => (
            <p className="sit-fb__issue" key={i}>
              <span className="sit-fb__bad">{e.bad}</span>
              {e.good && (
                <>
                  <span className="sit-fb__arrow">→</span>
                  <span className="sit-fb__good">{e.good}</span>
                </>
              )}
              {e.note && <span className="sit-fb__note">{e.note}</span>}
            </p>
          ))
        ) : (
          <p className="sit-fb__issue">
            <span className="sit-fb__good">{t('situations.feedback.noErrors')}</span>
          </p>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="sit-fb__block">
          <h6>{t('situations.feedback.next')}</h6>
          <ul className="sit-fb__recs">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {summary && <p className="sit-fb__summary">{summary}</p>}

      <p className="sit-fb__note-small">{t('situations.feedback.disclaimer')}</p>
    </div>
  )
}
