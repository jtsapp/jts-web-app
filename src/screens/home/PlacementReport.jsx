import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { fetchLatestAttempt } from '../../placement/api.js'
import { reportView } from '../../placement/reportModel.js'

/**
 * Отчёт последнего теста уровня v16 на «Главной» (указание руководителя 14.10.2026: «после теста все данные — очень
 * детальные отчёты — в этом разделе»): общий уровень, навыки, цель, на что сделать упор и задания «Практики».
 * Причины и пояснения пишет сам тест на языке прохождения — показываем их как есть.
 *
 * version — счётчик сохранённых итогов из App: тест сохранил новый итог — отчёт перечитывается.
 */
export default function PlacementReport({ token, version = 0, onNav, onRetake }) {
  const { t, lang } = useI18n()
  const [env, setEnv] = useState(null)

  useEffect(() => {
    if (!token) return undefined
    let alive = true
    fetchLatestAttempt(token).then((e) => {
      if (alive) setEnv(e)
    })
    return () => {
      alive = false
    }
  }, [token, version])

  const view = useMemo(() => reportView(env, lang), [env, lang])
  if (!view || !view.overall) return null

  const date = view.completedAt ? new Date(view.completedAt) : null
  const when = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' })
    : null

  return (
    <section className="hm-card pl-report" aria-labelledby="pl-report-title">
      <div className="pl-report__head">
        <h2 id="pl-report-title" className="hm-card__title">
          {t('placement.report.title')}
        </h2>
        {when && <span className="pl-report__date">{when}</span>}
      </div>

      <div className="pl-report__overall">
        <span className="pl-report__label">{t('placement.report.overall')}</span>
        <b className="pl-report__level">{view.overall}</b>
        <span className="pl-report__name">{t(`cefr.${view.overall}`)}</span>
        {view.partial && <span className="pl-report__tag">{t('placement.report.partial')}</span>}
      </div>

      <ul className="pl-report__skills">
        {view.skills.map((s) => (
          <li className="pl-report__skill" key={s.id}>
            <span className="pl-report__skillName">{t(`placement.skill.${s.id}`)}</span>
            <span className={`pl-report__chip${s.assessed ? '' : ' is-empty'}`}>{s.level || '—'}</span>
            <span className="pl-report__bar" aria-hidden="true">
              {s.percent != null && <i style={{ width: `${s.percent}%` }} />}
            </span>
            <span className="pl-report__note">
              {!s.assessed
                ? t(s.id === 'S' ? 'placement.report.notAssessedS' : 'placement.report.notAssessed')
                : s.total != null
                  ? t('placement.report.correct', { correct: String(s.correct ?? 0), total: String(s.total) })
                  : ''}
              {s.confirmed === false && <em> · {t('placement.report.unconfirmed')}</em>}
            </span>
          </li>
        ))}
      </ul>

      {(view.goal || view.target) && (
        <div className="pl-report__goal">
          {view.goal && (
            <p>
              <span className="pl-report__label">{t('placement.report.goal')}</span> {view.goal}
            </p>
          )}
          {view.target && (
            <p>
              <span className="pl-report__label">{t('placement.report.target')}</span>{' '}
              <b>{view.target}</b>
              {view.targetAlreadyMet && <> · {t('placement.report.targetMet')}</>}
            </p>
          )}
          {view.targetExplanation && <p className="pl-report__muted">{view.targetExplanation}</p>}
        </div>
      )}

      {view.priorities.length > 0 && (
        <div className="pl-report__block">
          <h3 className="pl-report__h">{t('placement.report.priorities')}</h3>
          <ul className="pl-report__list">
            {view.priorities.map((p) => (
              <li key={p.id || p.title}>
                <b>{p.title}</b>
                {p.reason && <> — {p.reason}</>}
                {p.note && <span className="pl-report__muted"> {p.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.activities.length > 0 && (
        <div className="pl-report__block">
          <h3 className="pl-report__h">{t('placement.report.activities')}</h3>
          <div className="pl-report__acts">
            {view.activities.map((a) => (
              <button
                type="button"
                className="pl-report__act"
                key={a.id || a.title}
                onClick={() => onNav?.(a.nav.key, a.nav.payload)}
              >
                <span className="pl-report__actTitle">{a.title}</span>
                <span className="pl-report__actMeta">
                  {[a.level, a.minutes ? t('placement.report.minutes', { n: String(a.minutes) }) : null].filter(Boolean).join(' · ')}
                </span>
                {a.reason && <span className="pl-report__actWhy">{a.reason}</span>}
                {a.path.length > 0 && <span className="pl-report__actPath">{a.path.join(' → ')}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {onRetake && (
        <button type="button" className="pl-report__retake" onClick={onRetake}>
          {t('placement.report.retake')}
        </button>
      )}
    </section>
  )
}
