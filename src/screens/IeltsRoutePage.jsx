import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getIeltsProfile, setIeltsRoute } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { bandGap, recommendRoute, routeOptions } from '../ielts/onboarding/onboarding.js'
import { formatDate, formatDuration, formatMonths } from '../ielts/format.js'
import { CheckCircleIcon, CheckIcon, InfoIcon, StarIcon, TrendingUpIcon } from '../ielts/icons.jsx'

// «С запасом» — срок закрывается раньше экзамена хотя бы на три недели (Figma 3, карточка курса)
const SPARE_DAYS = 21
const FEATURES = { platform: 3, mix: 4, teacher: 3 }

/**
 * «Как дойти до цели» (Figma 3): три маршрута — самостоятельно на платформе, микс с уроками, курс с преподавателем —
 * со сроком до цели при выбранном времени в день и пометкой, успевают ли к дате экзамена. Рекомендуемый — по правилам
 * §11.4. Выбор ложится в профиль; заявку на уроки и курс принимает менеджер (ссылка — та же, что у тарифов).
 */
export default function IeltsRoutePage({ token, onChosen, onPricing, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let alive = true
    getIeltsProfile(authToken)
      .then((p) => alive && setState({ status: 'ready', p }))
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [authToken])

  const choose = async (route) => {
    setBusy(route)
    try {
      await setIeltsRoute(authToken, route)
      if (route === 'platform') onChosen?.(route)
      else onPricing?.(route)
    } catch {
      setBusy(null)
    }
  }

  let body
  if (state.status !== 'ready') {
    body = state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<TrendingUpIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
  } else {
    const p = state.p
    const target = Number(p.targetBand) || 7
    const overall = p.bands?.overall
    const gap = bandGap(target, overall)
    const rec = recommendRoute(p)
    const opts = routeOptions(p)
    const dateLabel = p.examDate ? formatDate(`${p.examDate}T00:00:00`, lang) : null
    const daily = formatDuration(p.dailyMinutes || 60, t)
    const daysLeft = p.examDate ? Math.round((new Date(`${p.examDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : null
    const sub =
      overall == null
        ? t('ieltsOb.routeNoDiag')
        : t(dateLabel ? 'ieltsOb.routeSubFull' : 'ieltsOb.routeSubNoDate', { now: Number(overall).toFixed(1), gap: (gap ?? 0).toFixed(1), date: dateLabel, daily })
    // Figma 3: «не успеваете к …» — красный, «успеваете к экзамену» — зелёный, «с запасом» — если остаётся ≥ 3 недель
    const fitChip = (o) => {
      if (o.fits == null) return null
      if (!o.fits) return <span className="ih-route__fit is-bad"><InfoIcon size={14} />{t('ieltsOb.notFitsShort', { date: dateLabel })}</span>
      const spare = daysLeft != null && daysLeft - o.term.weeks * 7 >= SPARE_DAYS
      return <span className="ih-route__fit is-ok"><CheckCircleIcon size={14} />{t(spare ? 'ieltsOb.fitsSpare' : 'ieltsOb.fitsExam')}</span>
    }
    body = (
      <div className="ih-route">
        <header>
          <h1>{t('ieltsOb.routeTitle', { n: target.toFixed(1) })}</h1>
          <p>{sub}</p>
        </header>
        <div className="ih-route__grid">
          {opts.map((o) => {
            const recommended = rec?.route === o.id
            return (
              <section key={o.id} className={`ih-card ih-route__opt ${recommended ? 'is-rec' : ''} ${p.route === o.id ? 'is-chosen' : ''}`}>
                <div className="ih-route__head">
                  <span className="ih-route__kicker">{t(`ieltsOb.routeKicker.${o.id}`)}</span>
                  {recommended && <span className="ih-route__rec"><StarIcon size={14} />{t('ieltsOb.recommended')}</span>}
                </div>
                <h2>{t(`ieltsOb.route.${o.id}`)}</h2>
                <p className="ih-route__termline">
                  <b className={`ih-route__term ${o.term.long ? 'is-long' : ''}`}>{o.term.long ? t('ieltsOb.termLong') : `≈ ${formatMonths(o.term.months, t, lang)}`}</b>
                  {!o.term.long && <span>{t('ieltsOb.toGoal')}</span>}
                </p>
                {fitChip(o)}
                <ul>
                  {Array.from({ length: FEATURES[o.id] }, (_, i) => <li key={i}><CheckIcon size={16} />{t(`ieltsOb.routeFeature.${o.id}.${i + 1}`)}</li>)}
                </ul>
                <button type="button" className={recommended ? 'ih-cta' : 'ih-btn ih-btn--outline'} onClick={() => choose(o.id)} disabled={!!busy}>
                  {t(`ieltsOb.routeCta.${o.id}`)}
                </button>
              </section>
            )
          })}
        </div>
        <p className="ih-route__why"><InfoIcon size={16} /><span>{t('ieltsOb.routeWhy', { daily: String(p.dailyMinutes || 60) })}</span></p>
      </div>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="ielts">
      <div className="ih">{body}</div>
    </LearningLayout>
  )
}
