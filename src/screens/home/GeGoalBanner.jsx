import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { formatDate } from '../../ielts/format.js'
import { ArrowForwardIcon, EditIcon, EventIcon } from '../../ielts/icons.jsx'
import { goalBannerState, sayKey } from '../../ge/homeState.js'
import { formatTerm } from '../../ge/route.js'

/**
 * Блок цели «Главной» General English — по образцу GoalBanner раздела IELTS («IELTS new», GoalJourney): маскот с
 * репликой, срок и дорожка «старт → сейчас → цель» тремя узлами без оси. Под дорожкой — прежние строки карточки
 * уровня («ещё N материалов», «+N% за неделю»): их считает сервер, и терять их при смене вида незачем.
 */
export default function GeGoalBanner({ profile, option, planLine, week, onEdit, onOpenRoute, onBuy }) {
  const { t, lang } = useI18n()
  const [seed] = useState(() => Math.random())
  const s = goalBannerState({ deadline: profile.deadline, journey: profile.journey, fit: option?.fit ?? null })
  const d = profile.deadline || {}
  const j = profile.journey || {}
  const cur = j.current || {}
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (iso) => (iso ? formatDate(`${iso}T00:00:00`, lang) : '')
  const monthYear = (iso) =>
    new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00`)).replace(/\s?г\.$/, '')
  const sayVars = { level: profile.targetLevel, term: option ? formatTerm(option.units, t, lang) : '' }

  let title
  let sub = null
  if (s.title === 'reached') {
    title = t('geGoal.title.reached', { level: profile.targetLevel })
  } else if (s.title === 'none') {
    title = t('geGoal.title.none')
    sub = (
      <button type="button" className="ih-gb__pill" onClick={onEdit}>
        <EventIcon size={16} /> {t('geGoal.setDate')}
      </button>
    )
  } else if (s.title === 'passed') {
    title = t('geGoal.title.passed')
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{fmt(d.date)}</span>
        <button type="button" className="ih-gb__pill" onClick={onEdit}>
          {t('geGoal.updateGoal')}
        </button>
      </span>
    )
  } else {
    title =
      s.title === 'today'
        ? t('geGoal.title.today')
        : s.title === 'tomorrow'
          ? t('geGoal.title.tomorrow')
          : s.title === 'approx'
            ? t('geGoal.title.approx', { date: monthYear(d.date) })
            : plural(t, lang, 'geGoal.title.days', d.daysRemaining)
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{s.title === 'approx' ? t(`geOb.window.${profile.deadlineWindow}`) : fmt(d.date)}</span>
        <button type="button" className="ih-gb__edit" onClick={onEdit} aria-label={t('geGoal.edit')}>
          <EditIcon size={14} />
        </button>
      </span>
    )
  }

  // Блок кликабелен целиком, как у IELTS: ведёт на маршрут. Свои кнопки внутри клик наружу не отдают.
  const onBlockClick = (e) => {
    if (e.target.closest('button, a') || s.reached) return
    onOpenRoute?.()
  }

  return (
    <div className="ge-skin">
      <section className="ih-gb is-clickable ge-goal" aria-label={t('geGoal.aria')} onClick={onBlockClick}>
        <img className="ih-gb__bg" src="/ielts/mascot/goal-bg.webp" alt="" aria-hidden="true" />
        <div className="ih-gb__mascot">
          <p className="ih-gb__bubble">{t(sayKey(s.say, seed), sayVars)}</p>
          <img src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="300" height="237" />
        </div>
        <div className="ih-gb__journey">
          <div className="ih-gb__exam">
            <h2>{title}</h2>
            {sub}
          </div>
          <ol className={`ih-gb__track${s.reached ? ' is-reached' : ''}`}>
            <li className="ih-gb__node ih-gb__node--a" aria-label={t('geGoal.start')}>
              <span>{j.start || '—'}</span>
            </li>
            <li className="ih-gb__line ih-gb__line--done" aria-hidden="true" />
            <li className="ih-gb__now" aria-label={t('geGoal.now')}>
              <span className="ih-gb__node ih-gb__node--now">{cur.level || '—'}</span>
              <span className="ih-gb__nowtag">{typeof cur.percent === 'number' ? t('geGoal.nowPct', { percent: String(cur.percent) }) : t('geGoal.now')}</span>
            </li>
            <li className="ih-gb__line ih-gb__line--todo" aria-hidden="true" />
            <li className="ih-gb__star" aria-label={t('geGoal.goal')}>
              <span>{profile.targetLevel}</span>
            </li>
          </ol>
          <div className="ih-gb__foot">
            {(planLine || week > 0) && (
              <p className="ge-goal__plan">
                {planLine}
                {week > 0 && <span className="hm-level__week">{t('home.level.week', { n: String(week) })}</span>}
              </p>
            )}
            {s.reached ? (
              <button type="button" className="ih-link" onClick={onBuy}>
                {t('home.level.buy')} <ArrowForwardIcon size={17} />
              </button>
            ) : (
              <button type="button" className="ih-link" onClick={onOpenRoute}>
                {t('geGoal.toRoute')} <ArrowForwardIcon size={17} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
