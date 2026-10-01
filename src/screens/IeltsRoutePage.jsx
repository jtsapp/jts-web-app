import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getIeltsProfile, setIeltsRoute } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { bandGap, recommendRoute, routeOptions } from '../ielts/onboarding/onboarding.js'
import { CheckIcon, TrendingUpIcon } from '../ielts/icons.jsx'

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
    const dateLabel = p.examDate ? new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${p.examDate}T00:00:00`)) : null
    body = (
      <div className="ih-route">
        <header>
          <h1>{t('ieltsOb.routeTitle', { n: target.toFixed(1) })}</h1>
          <p>{overall != null ? t('ieltsOb.routeSub', { now: Number(overall).toFixed(1), gap: (gap ?? 0).toFixed(1) }) : t('ieltsOb.routeNoDiag')}</p>
        </header>
        <div className="ih-route__grid">
          {opts.map((o) => {
            const recommended = rec?.route === o.id
            return (
              <section key={o.id} className={`ih-card ih-route__opt ${recommended ? 'is-rec' : ''} ${p.route === o.id ? 'is-chosen' : ''}`}>
                <div className="ih-route__head">
                  <span className="ih-muted">{t(`ieltsOb.routeKicker.${o.id}`)}</span>
                  {recommended && <span className="ih-chip ih-chip--solid ih-chip--sm"><span>{t('ieltsOb.recommended')}</span></span>}
                </div>
                <h2>{t(`ieltsOb.route.${o.id}`)}</h2>
                <b className={`ih-route__term ${o.term.long ? 'is-long' : ''}`}>{o.term.long ? t('ieltsOb.termLong') : t('ieltsOb.termMonths', { n: String(o.term.months).replace('.', lang === 'en' ? '.' : ',') })}</b>
                <span className="ih-muted">{t('ieltsOb.toGoal')}</span>
                {o.fits != null && (
                  <p className={`ih-ob__note ${o.fits ? 'is-ok' : 'is-warn'}`}>{t(o.fits ? 'ieltsOb.fitsShort' : 'ieltsOb.notFitsShort', { date: dateLabel })}</p>
                )}
                <ul>
                  {[1, 2, 3].map((i) => <li key={i}><CheckIcon size={16} />{t(`ieltsOb.routeFeature.${o.id}.${i}`)}</li>)}
                </ul>
                <button type="button" className={recommended ? 'ih-cta' : 'ih-btn ih-btn--outline'} onClick={() => choose(o.id)} disabled={!!busy}>
                  {t(`ieltsOb.routeCta.${o.id}`)}
                </button>
              </section>
            )
          })}
        </div>
        <p className="ih-muted">{t('ieltsOb.routeWhy', { daily: String(p.dailyMinutes || 60) })}</p>
      </div>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="ielts">
      <div className="ih">{body}</div>
    </LearningLayout>
  )
}
