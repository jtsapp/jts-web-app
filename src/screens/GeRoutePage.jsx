import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { getGeProfile, getLevelProgress, getMyLessonOccurrences, setGeRoute } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { formatDate } from '../ielts/format.js'
import { CheckCircleIcon, CheckIcon, InfoIcon, StarIcon, TrendingUpIcon } from '../ielts/icons.jsx'
import { currentFormat, formatTerm, recommendRoute, routeOptions } from '../ge/route.js'

const FEATURES = 3

/**
 * «Как дойти до {цель}» (спека 2026-10-12, секция 2; вид — экран маршрута IELTS, Figma 3): три формата со сроком до
 * цели при выбранном времени в день и пометкой, успевают ли они к сроку. Рекомендуемый — по правилам route.js.
 * Выбор ложится в профиль; группа и индивидуально ведут в тарифы, кроме формата, в котором ученик уже занимается.
 */
// onBack/backLabel — «назад» туда, откуда открыли маршрут (App, lib/navStack.js).
export default function GeRoutePage({ token, userName, userLevel, onNav, onProfile, onLoaded, onChosen, onPricing, onEdit, onTest, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [busy, setBusy] = useState(null)
  // Колбэк App не должен перезапускать загрузку на каждом рендере родителя
  const loadedRef = useRef(onLoaded)
  useEffect(() => {
    loadedRef.current = onLoaded
  })

  useEffect(() => {
    let alive = true
    Promise.all([getGeProfile(authToken), getLevelProgress(authToken).catch(() => null), getMyLessonOccurrences(authToken).catch(() => [])]).then(
      ([p, progress, occ]) => {
        if (!alive) return
        if (!p) {
          setState({ status: 'error' })
          return
        }
        loadedRef.current?.(p)
        setState({ status: 'ready', p, format: progress?.track === 'LESSONS' ? currentFormat(occ) : null })
      },
    )
    return () => {
      alive = false
    }
  }, [authToken])

  const choose = async (id, own) => {
    setBusy(id)
    try {
      const p = await setGeRoute(authToken, id)
      if (id === 'self_study' || own) onChosen?.(p)
      else onPricing?.(p)
    } catch {
      setBusy(null)
    }
  }

  let body
  if (state.status === 'loading') {
    body = <p className="ih-muted">{t('geRoute.loading')}</p>
  } else if (state.status === 'error') {
    body = <EmptyState icon={<TrendingUpIcon size={28} />} title={t('geRoute.errorTitle')} text={t('geRoute.errorText')} />
  } else {
    const { p, format } = state
    const level = p.journey?.current?.level || null
    const percent = p.journey?.current?.percent ?? 0
    if (!level) {
      body = (
        <EmptyState
          icon={<TrendingUpIcon size={28} />}
          title={t('geRoute.noLevelTitle')}
          text={t('geRoute.noLevelText')}
          action={
            <button type="button" className="ih-cta" onClick={() => onTest?.()}>
              {t('geRoute.toTest')}
            </button>
          }
        />
      )
    } else if (p.journey?.reached) {
      body = (
        <EmptyState
          icon={<CheckCircleIcon size={28} />}
          title={t('geRoute.reachedTitle', { level: p.targetLevel })}
          text={t('geRoute.reachedText')}
          action={
            <button type="button" className="ih-cta" onClick={() => onEdit?.()}>
              {t('geRoute.newGoal')}
            </button>
          }
        />
      )
    } else {
      const opts = routeOptions({ targetLevel: p.targetLevel, dailyMinutes: p.dailyMinutes, deadlineIso: p.deadline?.date }, { level, percent })
      const rec = recommendRoute(opts, { purpose: p.purpose, level, targetLevel: p.targetLevel })
      const dateLabel = p.deadline?.date ? `${p.deadline.approximate ? '≈ ' : ''}${formatDate(`${p.deadline.date}T00:00:00`, lang)}` : null
      const sub = t(dateLabel ? 'geRoute.sub' : 'geRoute.subNoDate', { level, percent: String(percent), date: dateLabel, daily: t(`geOb.daily.${p.dailyMinutes}`) })
      const fitChip = (o) => {
        if (o.fit == null) return null
        if (o.fit === 'late')
          return (
            <span className="ih-route__fit is-bad">
              <InfoIcon size={14} />
              {t('geRoute.late', { date: dateLabel })}
            </span>
          )
        return (
          <span className="ih-route__fit is-ok">
            <CheckCircleIcon size={14} />
            {t(o.fit === 'spare' ? 'geRoute.spare' : 'geRoute.fits')}
          </span>
        )
      }
      body = (
        <div className="ih-route">
          <header>
            <h1>{t('geRoute.title', { level: p.targetLevel })}</h1>
            <p>{sub}</p>
          </header>
          {rec.late && (
            <p className="ih-ob__note is-warn">
              <InfoIcon size={20} />
              <span>{t('geRoute.allLate')}</span>
            </p>
          )}
          <div className="ih-route__grid">
            {opts.map((o) => {
              const recommended = rec.route === o.id
              const own = format === o.id
              return (
                <section key={o.id} className={`ih-card ih-route__opt ${recommended ? 'is-rec' : ''} ${p.route === o.id ? 'is-chosen' : ''}`}>
                  <div className="ih-route__head">
                    <span className="ih-route__kicker">{own ? t('geRoute.own') : t(`geRoute.kicker.${o.id}`)}</span>
                    {recommended && (
                      <span className="ih-route__rec">
                        <StarIcon size={14} />
                        {t('geOb.recommended')}
                      </span>
                    )}
                  </div>
                  <h2>{t(`geRoute.route.${o.id}`)}</h2>
                  <p className="ih-route__termline">
                    <b className="ih-route__term">{formatTerm(o.units, t, lang)}</b>
                    <span>{t('geRoute.toGoal')}</span>
                  </p>
                  {fitChip(o)}
                  <ul>
                    {Array.from({ length: FEATURES }, (_, i) => (
                      <li key={i}>
                        <CheckIcon size={16} />
                        {t(`geRoute.feature.${o.id}.${i + 1}`)}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className={recommended ? 'ih-cta' : 'ih-btn ih-btn--outline'} onClick={() => choose(o.id, own)} disabled={!!busy}>
                    {own ? t('geRoute.continue') : t(`geRoute.cta.${o.id}`)}
                  </button>
                </section>
              )
            })}
          </div>
          <p className="ih-route__why">
            <InfoIcon size={16} />
            <span>{t('geRoute.why', { lessons: String(opts[0].lessons), level: p.targetLevel })}</span>
          </p>
          <button type="button" className="ih-link ge-route__edit" onClick={() => onEdit?.()}>
            {t('geRoute.editGoal')}
          </button>
        </div>
      )
    }
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="home">
      <div className="ih">
        {onBack && (
          <button type="button" className="ih-back" onClick={onBack}>
            ← {backLabel}
          </button>
        )}
        {body}
      </div>
    </LearningLayout>
  )
}
