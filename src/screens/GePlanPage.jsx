import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getLevelProgress, moveGeTask } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import { ArrowForwardIcon } from '../ielts/icons.jsx'
import { useGePlan } from '../ge/plan/useGePlan.js'
import { courseTitles, mondayOf } from '../ge/plan/planModel.js'
import { useGeTaskStart } from '../ge/plan/useGeTaskStart.js'
import { MonthView, RoadmapView, WeekView } from '../ge/plan/GePlanViews.jsx'
import OnboardingTour, { useScreenTour } from '../tutor/OnboardingTour.jsx'

// Экран «План» общего курса (?screen=ge-plan, спека 2026-10-13, секция 4): три вида над одними задачами бэкенда. Вид и
// выбранная неделя/месяц живут в адресе (?gePlanView=, &gePlanAt=), как у плана IELTS: F5 и «Назад» возвращают туда же.
const VIEWS = ['road', 'week', 'month']

// 2026-13-45 проходит регэксп, но toISOString на нём бросает — и роняет экран у того, кому прислали ссылку
function realDay(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const v = q.get('gePlanView')
    const at = q.get('gePlanAt')
    return { view: VIEWS.includes(v) ? v : 'road', at: realDay(at) ? at : null }
  } catch {
    return { view: 'road', at: null }
  }
}

function writeUrl(view, at) {
  try {
    const url = new URL(window.location.href)
    if (view && view !== 'road') url.searchParams.set('gePlanView', view)
    else url.searchParams.delete('gePlanView')
    if (at) url.searchParams.set('gePlanAt', at)
    else url.searchParams.delete('gePlanAt')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — просто не запоминаем */
  }
}

// onBack/backLabel — «назад» туда, откуда открыли план (App, lib/navStack.js):
// своей кнопки у экрана не было вовсе, уйти можно было только меню.
export default function GePlanPage({ token, userName, userLevel, onNav, onProfile, onGeStart, onGeRoute, onGeTest, onGeEdit, tourKey, onBack, backLabel }) {
  const { t } = useI18n()
  const authToken = token || loadToken()
  // уровень курса — тот, что ученик проходит (может быть выше CEFR после покупки): по нему подписи уроков и «Начать»
  const [level, setLevel] = useState(userLevel)
  useEffect(() => {
    let alive = true
    getLevelProgress(authToken)
      .then((p) => {
        if (alive && p?.level) setLevel(p.level)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authToken])

  const { status, plan, frontier, reload } = useGePlan(authToken, { level })
  const [view, setView] = useState('road')
  const [at, setAt] = useState(null)
  const [moveError, setMoveError] = useState(false)
  useEffect(() => {
    const u = readUrl()
    setView(u.view)
    setAt(u.at)
  }, [])
  const titles = useMemo(() => (plan ? courseTitles(plan.tasks, frontier) : {}), [plan, frontier])
  // Тур экрана — при первом заходе, когда план уже на экране (решает один раз за заход, как на «Главной»). Шаг про
  // дорогу — только в её виде; открыли неделю по ссылке — тур его пропустит.
  const tour = useScreenTour(status === 'ready' && plan?.state === 'ready' ? tourKey : null)
  const tourSteps = [
    { selector: '.ge-plan .ih-seg2', title: t('tour.plan.views.title'), text: t('tour.plan.views.text') },
    // дорога есть только в своём виде, панель дня — в дороге и месяце (по ссылке могли открыть неделю)
    ...(view === 'road' ? [{ selector: '.ge-plan .ih-road2', title: t('tour.plan.road.title'), text: t('tour.plan.road.text') }] : []),
    ...(view !== 'week' ? [{ selector: '.ge-plan .ih-dp', title: t('tour.plan.day.title'), text: t('tour.plan.day.text') }] : []),
    { selector: '.ge-plan .ih-seg2 [role="tab"]:nth-child(2)', title: t('tour.plan.move.title'), text: t('tour.plan.move.text') },
  ]

  const pick = (v, a = null) => {
    setView(v)
    setAt(a)
    writeUrl(v, a)
  }
  const { start, markFailed } = useGeTaskStart({ token: authToken, level, onNav, reload })
  const move = (task, date) => {
    setMoveError(false)
    moveGeTask(authToken, task.id, date).then(reload).catch(() => setMoveError(true))
  }

  let body
  if (status === 'loading') body = <p className="ih-muted">{t('gePlan.loading')}</p>
  else if (status === 'none' || !plan) {
    body = (
      <div className="ge-plan__empty">
        <p>{t('gePlan.error')}</p>
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={reload}>{t('gePlan.retry')}</button>
      </div>
    )
  } else if (plan.state !== 'ready') {
    const go = { no_onboarding: onGeStart, no_route: onGeRoute, no_level: onGeTest, reached: onGeEdit }[plan.state]
    body = (
      <div className="ge-plan__empty">
        <p>{t(`gePlan.state.${plan.state}`)}</p>
        {go && (
          <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => go()}>
            {t(`gePlan.cta.${plan.state}`)} <ArrowForwardIcon size={18} />
          </button>
        )}
      </div>
    )
  } else {
    const thisMonday = mondayOf(plan.today)
    const monday = at ? mondayOf(at) : thisMonday
    const month = at || plan.today
    body = (
      <>
        {markFailed && <p className="ge-move__error" role="alert">{t('gePlan.markFail')}</p>}
        {view === 'road' && <RoadmapView key={plan.today} plan={plan} titles={titles} onStart={start} />}
        {view === 'week' && (
          <WeekView key={monday} plan={plan} titles={titles} monday={monday} onWeek={(m) => pick('week', m)} onStart={start} onMove={move} moveError={moveError} />
        )}
        {view === 'month' && <MonthView key={month.slice(0, 7)} plan={plan} titles={titles} month={month} onMonth={(m) => pick('month', m)} onStart={start} />}
      </>
    )
  }

  const sub = plan?.state === 'ready' && plan.route ? t(`gePlan.sub.${plan.route}`, { n: String(plan.dailyMinutes || 30) }) : null
  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="home" onHelp={plan?.state === 'ready' ? tour.start : undefined}>
      <div className="ih ge-plan">
        {onBack && (
          <button type="button" className="ih-back" onClick={onBack}>
            ← {backLabel}
          </button>
        )}
        <header className="ge-plan__head">
          <div className="ge-plan__titles">
            <h1>{t('gePlan.title')}</h1>
            {sub && <span className="ge-plan__sub">{sub}</span>}
          </div>
          {plan?.state === 'ready' && (
            <div className="ih-seg2" role="tablist" aria-label={t('gePlan.viewLabel')}>
              {VIEWS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => pick(v)}>
                  {t(`gePlan.view.${v}`)}
                </button>
              ))}
            </div>
          )}
        </header>
        {plan?.state === 'ready' && plan.liveMissing && (
          <p className="ge-today__note">
            {t('gePlan.liveMissing')}{' '}
            <button type="button" className="ih-link" onClick={() => onNav?.('pricing')}>{t('gePlan.liveMissing.cta')}</button>
          </p>
        )}
        {body}
      </div>
      {tour.open && <OnboardingTour steps={tourSteps} storageKey={tourKey} onFinish={tour.finish} />}
    </LearningLayout>
  )
}
