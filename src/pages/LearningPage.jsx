import { useState, useEffect } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronRightIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms, roleForLevel } from '../kingdoms.js'
import { getLearningPath, countProgress } from '../api.js'

export default function LearningPage({ userLevel = 'A1', userName, token, onOpenKingdom }) {
  const { t } = useI18n()
  const [progress, setProgress] = useState({}) // id -> {done,total}

  useEffect(() => {
    if (!token) return
    let alive = true
    computeKingdoms(userLevel)
      .filter((k) => !k.comingSoon)
      .forEach((k) => {
        getLearningPath(k.level, token)
          .then((p) => alive && setProgress((prev) => ({ ...prev, [k.id]: countProgress(p) })))
          .catch(() => {})
      })
    return () => {
      alive = false
    }
  }, [token, userLevel])

  const kingdoms = computeKingdoms(userLevel)
  const role = roleForLevel(userLevel)
  const current = kingdoms.find((k) => k.current) || kingdoms[0]

  // Пройденные королевства и общий прогресс
  const completed = kingdoms.filter((k) => {
    const p = progress[k.id]
    return p && p.total > 0 && p.done >= p.total
  })
  let sumDone = 0
  let sumTotal = 0
  for (const k of kingdoms) {
    const p = progress[k.id]
    if (p) {
      sumDone += p.done
      sumTotal += p.total
    }
  }
  const overall = sumTotal > 0 ? Math.round((sumDone / sumTotal) * 100) : 0

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" onProfile={() => {}}>
      <div className="lp">
        {/* Центр: заголовок + сетка миров */}
        <div className="lp__center">
          <h1 className="lp__title">{t('nav.learning')}</h1>
          <p className="lp__sub">{t('learn.subtitle')}</p>

          <div className="lp__grid">
            {kingdoms.map((k) => (
              <button key={k.id} className="lp-card" onClick={() => onOpenKingdom?.(k)}>
                <img className="lp-card__img" src={`/assets/world/kings/${k.id}.jpg`} alt={k.name} loading="lazy" />
                {k.current && <span className="lp-card__here">{t('learn.here')}</span>}
                <div className="lp-card__bar">
                  <div className="lp-card__meta">
                    <b>{k.name}</b>
                    <span>{t('kingdom.levelBadge', { label: k.level })}</span>
                  </div>
                  <span className="lp-card__go">
                    <ChevronRightIcon size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Правая панель: статус / уровень / текущее королевство / прогресс */}
        <aside className="lp__side">
          <div className="lp-status">
            <span className="lp-status__ic">
              <img src={`/assets/world/roles/${role.key}.png`} alt="" />
            </span>
            <div className="lp-status__label">{t('learn.status')}</div>
            <div className="lp-status__role">{t('role.' + role.key)}</div>
          </div>

          <div className="lp-curlevel">
            <span>{t('learn.currentLevel')}</span>
            <span className="lp-curlevel__cefr">{(userLevel || 'A1').toUpperCase()}</span>
          </div>

          <div className="lp-curking">
            <img src={`/assets/world/kings/${current.id}.jpg`} alt={current.name} />
            <div className="lp-curking__name">{current.name}</div>
          </div>

          <div className="lp-prog">
            <div className="lp-prog__label">
              {t('learn.progress')} <b>{overall}%</b>
            </div>
            <div className="lp-prog__bar">
              <div className="lp-prog__fill" style={{ width: `${overall}%` }} />
            </div>
          </div>

          {completed.length > 0 && (
            <div className="lp-done">
              {completed.map((k) => (
                <div key={k.id} className="lp-done__row">
                  <img className="lp-done__av" src={`/assets/world/kings/${k.id}.jpg`} alt="" />
                  <div className="lp-done__meta">
                    <b>{k.name}</b>
                    <span>{t('learn.done')}</span>
                  </div>
                  <span className="lp-done__check">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#34a853" />
                      <path d="m8 12.5 2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </LearningLayout>
  )
}
