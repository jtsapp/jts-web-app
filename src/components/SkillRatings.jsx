// src/components/SkillRatings.jsx
// Карточка профиля: рейтинг 6 навыков шкалой из 10 сегментов (2..10 заполнено).
// stats = { skill: { done, firstTry } } | null. Иконки — локальные (как Pf*Icon
// в ProfilePage), чтобы не раздувать общий icons.jsx.

import { useI18n } from '../i18n.jsx'
import { SKILLS, skillBars } from '../practice/skillStatsCore.js'

const TOTAL_SEGMENTS = 10

function Bars({ filled, muted }) {
  return (
    <div className="pf-skill__bars" aria-hidden="true">
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
        <i key={i} className={i < filled ? (muted ? 'pf-skill__seg is-muted' : 'pf-skill__seg is-on') : 'pf-skill__seg'} />
      ))}
    </div>
  )
}

function SkillRow({ skill, stat, t }) {
  const done = stat?.done || 0
  const firstTry = stat?.firstTry || 0
  const bars = skillBars({ done, firstTry })
  const empty = done === 0
  const pct = empty ? 0 : Math.round(Math.min(1, firstTry / done) * 100)
  return (
    <div className="pf-skill">
      <span className="pf-skill__ic"><SkillIcon skill={skill} /></span>
      <div className="pf-skill__body">
        <div className="pf-skill__top">
          <span className="pf-skill__name">{t('profile.skills.' + skill)}</span>
          <span className="pf-skill__meta">
            {empty ? t('profile.skills.empty') : t('profile.skills.meta', { done, pct })}
          </span>
        </div>
        <Bars filled={bars} muted={empty} />
      </div>
    </div>
  )
}

export default function SkillRatings({ stats, loading }) {
  const { t } = useI18n()
  return (
    <>
      <div className="pf-label">{t('profile.skills.title')}</div>
      <div className="pf-card pf-skills">
        {SKILLS.map((skill) => (
          <SkillRow
            key={skill}
            skill={skill}
            stat={loading ? null : stats?.[skill]}
            t={t}
          />
        ))}
      </div>
    </>
  )
}

// Локальные иконки навыков (24×24, currentColor). Простые линейные глифы.
function SkillIcon({ skill }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (skill) {
    case 'listening':
      return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4" height="7" rx="2" /><rect x="17.5" y="13" width="4" height="7" rx="2" /></svg>
    case 'speaking':
      return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
    case 'reading':
      return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
    case 'writing':
      return <svg {...p}><path d="M4 20h16" /><path d="M14.5 4.5 19 9 8 20l-4.5.5.5-4.5 10.5-11.5Z" /></svg>
    case 'grammar':
      return <svg {...p}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>
    case 'vocab':
      return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
    default:
      return null
  }
}
