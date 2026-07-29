import { useState, useEffect } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronRightIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms, roleForLevel } from '../kingdoms.js'
import { getLearningPath, countProgress } from '../api.js'

export default function LearningPage({ userLevel = 'A1', userName, token, onOpenKingdom, onNav, onProfile }) {
  const { t } = useI18n()
  const [progress, setProgress] = useState({}) // id -> {done,total}
  const [view, setView] = useState('map') // 'map' | 'list'

  useEffect(() => {
    if (!token) return
    let alive = true
    computeKingdoms(userLevel)
      .filter((k) => !k.comingSoon)
      .forEach((k) => {
        // apply срабатывает и на кэш (мгновенно), и на свежий путь из фона —
        // так прогресс не отстаёт после пройденного урока.
        const apply = (p) =>
          alive && p && setProgress((prev) => ({ ...prev, [k.id]: countProgress(p) }))
        getLearningPath(k.level, token, apply).then(apply).catch(() => {})
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
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" token={token} onNav={onNav} onProfile={onProfile}>
      <div className={`lp${view === 'map' ? ' lp--map' : ''}`}>
        {/* Центр: заголовок + переключатель + карта / список миров */}
        <div className="lp__center">
          <div className="lp__head">
            <div>
              <h1 className="lp__title">{t('nav.learning')}</h1>
              <p className="lp__sub">{t('learn.subtitle')}</p>
            </div>
            <div className="lp-viewtoggle" role="tablist" aria-label={t('nav.learning')}>
              <button
                role="tab"
                aria-selected={view === 'map'}
                className={`lp-viewtoggle__btn${view === 'map' ? ' is-active' : ''}`}
                onClick={() => setView('map')}
              >
                {t('learn.viewMap')}
              </button>
              <button
                role="tab"
                aria-selected={view === 'list'}
                className={`lp-viewtoggle__btn${view === 'list' ? ' is-active' : ''}`}
                onClick={() => setView('list')}
              >
                {t('learn.viewList')}
              </button>
            </div>
          </div>

          {view === 'map' ? (
            <div className="lp-map">
              <div className="lp-map__canvas">
                {kingdoms.map((k) => {
                  const locked = !k.unlocked
                  const cls = `lp-node${k.current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`
                  return (
                    <button
                      key={k.id}
                      className={cls}
                      style={{ left: `${k.map.x}%`, top: `${k.map.y}%`, '--ring': k.ring }}
                      disabled={locked}
                      aria-disabled={locked}
                      title={locked ? t('learn.locked', { label: k.level }) : k.name}
                      onClick={() => !locked && onOpenKingdom?.(k)}
                    >
                      <span className="lp-node__ring">
                        <img className="lp-node__av" src={`/assets/world/levels/${k.level.toLowerCase()}.webp`} alt={k.name} loading="lazy" />
                        {locked && (
                          <span className="lp-node__lock" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="#fff" />
                              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span className="lp-node__label">{t('kingdom.levelBadge', { label: k.level })}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="lp__grid">
              {kingdoms.map((k) => (
                <button key={k.id} className="lp-card" onClick={() => onOpenKingdom?.(k)}>
                  <img className="lp-card__img" src={`/assets/world/kings/${k.id}.webp`} alt={k.name} loading="lazy" />
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
          )}
        </div>

        {/* Правая панель: статус / уровень / прогресс — только в режиме «Список»
            (в режиме «Карта» статус берётся из сайдбара, карта — во всю ширину) */}
        {view === 'list' && (
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
            <img src={`/assets/world/kings/${current.id}.webp`} alt={current.name} />
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
                  <img className="lp-done__av" src={`/assets/world/kings/${k.id}.webp`} alt="" />
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
        )}
      </div>
    </LearningLayout>
  )
}
