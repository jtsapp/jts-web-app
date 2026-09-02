import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoBanner from '../components/DemoBanner.jsx'
import AssetImage from '../components/AssetImage.jsx'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { levelSummary, touchWeeklySnapshot } from '../lib/levelProgress.js'
import { loadSkillStatsRemote, readLocalSkillStats } from '../practice/skillStats.js'

// «Главная» демо-аккаунта (макет демо-доступа, экран 1): срок демо, свой
// уровень с прогрессом до следующего, сильные и слабые стороны, вход на
// пробный урок.
//
// Экран сводит уже существующие данные, а не заводит новые: уровень — тот же,
// что в сайдбаре и на карте королевств, проценты навыков — тот же рейтинг, что
// в профиле (см. lib/levelProgress.js, там объяснено почему шкала общая).
// Придумать «свои» цифры для витрины было бы проще, но ученик видел бы два
// разных прогресса об одном себе.
export default function HomePage({
  userLevel = 'A1',
  userName,
  token,
  isDemoAccount = false,
  demoExpiresAt = null,
  onNav,
  onProfile,
  onOpenPricing,
  onOpenTrial,
}) {
  const { t, lang } = useI18n()
  const [stats, setStats] = useState(null)

  // Локальное зеркало сразу, сервер — следом: иначе карточка навыков секунду
  // висит пустой у человека, который вчера прошёл десяток заданий.
  useEffect(() => {
    setStats(readLocalSkillStats())
    if (!token) return
    let alive = true
    loadSkillStatsRemote(token).then((remote) => {
      if (alive && remote) setStats(remote)
    })
    return () => {
      alive = false
    }
  }, [token])

  const summary = useMemo(() => levelSummary(userLevel, stats), [userLevel, stats])

  // Прирост за неделю — от снимка в localStorage (истории на бэкенде нет,
  // см. levelProgress.js). Считаем в эффекте: снимок трогает localStorage, а
  // рендер обязан быть одинаковым на сервере и клиенте.
  const [week, setWeek] = useState(null)
  useEffect(() => {
    if (stats === null) return
    setWeek(touchWeeklySnapshot(summary.percent))
  }, [stats, summary.percent])

  const hasData = summary.ranked.some((r) => r.percent > 0)
  const levelName = t(`cefr.${summary.level}`)

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="home"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="hm">
        {isDemoAccount && <DemoBanner expiresAt={demoExpiresAt} onOpenAccess={onOpenPricing} />}

        {/* Карточка уровня */}
        <section className="hm-level">
          <div className="hm-level__body">
            <span className="hm-level__label">{t('home.level.label')}</span>
            <div className="hm-level__head">
              <h1 className="hm-level__name">
                {summary.level} · {levelName}
              </h1>
              {week > 0 && (
                <span className="hm-level__week">
                  <TrendIcon up />
                  {t('home.level.week', { n: String(week) })}
                </span>
              )}
            </div>

            <div className="hm-level__barrow">
              <div className="hm-level__bar">
                <i className="hm-level__fill" style={{ width: `${summary.percent}%` }} />
              </div>
              {summary.next && (
                <span className="hm-level__toNext">
                  {t('home.level.toNext', { n: String(summary.percent), level: summary.next })}
                </span>
              )}
            </div>

            <p className="hm-level__plan">
              {summary.next
                ? t('home.level.plan', {
                    lessons: plural(t, lang, 'pricing.lessons', summary.lessonsLeft),
                    practice: plural(t, lang, 'home.practice', summary.practiceLeft),
                    level: summary.next,
                  })
                : t('home.level.max')}
            </p>
          </div>

          {summary.next && (
            <div className="hm-level__goal">
              <AssetImage className="hm-level__medal" src="/assets/coin-star.png" alt="" />
              <span>{t('home.level.goal', { level: summary.next })}</span>
            </div>
          )}
        </section>

        <div className="hm-row">
          {/* Сильные и слабые стороны */}
          <section className="hm-card hm-skills">
            <h2 className="hm-card__title">{t('home.skills.title')}</h2>
            {hasData ? (
              <>
                <div className="hm-skills__list">
                  {summary.ranked.map(({ skill, percent }) => (
                    <div className="hm-skill" key={skill}>
                      <span className="hm-skill__name">{t(`profile.skills.${skill}`)}</span>
                      <div className="hm-skill__bar">
                        <i
                          className={`hm-skill__fill hm-skill__fill--${band(percent)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="hm-skill__pct">{percent}%</span>
                      <span className="hm-skill__trend" aria-hidden="true">
                        <TrendIcon up={percent >= 60} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hm-skills__tags">
                  {summary.strongest && (
                    <span className="hm-tag hm-tag--up">
                      <TrendIcon up />
                      {t('home.skills.best', { skill: t(`profile.skills.${summary.strongest.skill}`) })}
                    </span>
                  )}
                  {summary.weakest && (
                    <span className="hm-tag hm-tag--down">
                      <TrendIcon />
                      {t('home.skills.worst', { skill: t(`profile.skills.${summary.weakest.skill}`) })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="hm-skills__empty">{t('home.skills.empty')}</p>
            )}
          </section>

          {/* Пробный урок */}
          <section className="hm-card hm-trial">
            <div className="hm-trial__art">
              <AssetImage src={`/assets/world/hero/${summary.level.toLowerCase()}.webp`} alt="" />
            </div>
            <b className="hm-trial__title">{t('home.trial.title')}</b>
            <span className="hm-trial__sub">{t('home.trial.sub')}</span>
            <button type="button" className="hm-trial__cta" onClick={onOpenTrial}>
              {t('home.trial.cta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </section>
        </div>
      </div>
    </LearningLayout>
  )
}

// Цвет полосы навыка: зелёный — уверенно, фиолетовый — рабочий уровень,
// оранжевый — то, что стоит подтянуть. Границы те же, что у стрелки тренда.
function band(percent) {
  if (percent >= 70) return 'high'
  if (percent >= 60) return 'mid'
  return 'low'
}

function TrendIcon({ up = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={up ? 'M4 17 10 11l4 4 6-6' : 'M4 7 10 13l4-4 6 6'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={up ? 'M15 5h5v5' : 'M15 19h5v-5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
