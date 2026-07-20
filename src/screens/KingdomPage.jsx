import { useState, useEffect } from 'react'
import LangSelector from '../components/LangSelector.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms, roleForLevel } from '../kingdoms.js'
import { getBalance, getLearningPath, countProgress } from '../api.js'

function groupNum(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function KingdomPage({ userLevel = 'A1', userName, token, onOpenKingdom }) {
  const { t } = useI18n()
  const [view, setView] = useState('list') // list | map
  const [balance, setBalance] = useState({ coins: 0, streak: 0, streakActiveToday: false })
  const [progress, setProgress] = useState({}) // id -> {done,total}

  useEffect(() => {
    if (!token) return
    let alive = true
    // apply-колбэки получают и кэш (мгновенный рендер), и свежие данные из фона.
    const applyBalance = (b) =>
      alive && b && setBalance({ coins: b.coins ?? 0, streak: b.streak ?? 0, streakActiveToday: !!b.streakActiveToday })
    getBalance(token, applyBalance).then(applyBalance).catch(() => {})
    computeKingdoms(userLevel)
      .filter((k) => !k.comingSoon)
      .forEach((k) => {
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
  const initial = (userName || 'JTS').trim().charAt(0).toUpperCase()

  return (
    <div className="kd-screen">
      {/* Фон */}
      <div className="kd-bg" />

      {/* Список королевств / карта */}
      {view === 'list' ? (
        <div className="kd-list">
          {kingdoms.map((k, i) => {
            const pr = progress[k.id]
            const pct = pr && pr.total > 0 ? Math.round((pr.done / pr.total) * 100) : 0
            const locked = !k.unlocked
            return (
              <button
                key={k.id}
                className="kd-card"
                style={{ animationDelay: `${40 + i * 70}ms` }}
                disabled={locked}
                onClick={() => !locked && onOpenKingdom?.(k)}
              >
                <div className={`kd-card__img ${locked ? 'kd-card__img--locked' : ''}`}>
                  <img src={`/assets/world/kings/${k.id}.webp`} alt={k.name} loading="lazy" />
                  {locked && (
                    <span className="kd-locked">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {k.comingSoon ? t('kingdom.comingSoon') : t('kingdom.locked', { label: k.level })}
                    </span>
                  )}
                </div>
                <div className="kd-card__row">
                  <span className="kd-card__name">{k.name}</span>
                  <span className="kd-badge">{t('kingdom.levelBadge', { label: k.level })}</span>
                </div>
                {!locked && pr && pr.total > 0 && (
                  <div className="kd-progress">
                    <div className="kd-progress__fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="kd-map">
          <img src="/assets/world/world_map.jpg" alt="map" />
        </div>
      )}

      {/* Верхний HUD */}
      <div className="kd-hud">
        <div className="kd-hud__row">
          <div className="kd-profile">
            <span className="kd-avatar">{initial}</span>
            <span className="kd-profile__name">{userName || t('kingdom.profile')}</span>
          </div>
          <div className="kd-hud__right">
            <div className="kd-toggle">
              <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')} aria-label={t('nav.map')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5 3 7v12l6-2 6 2 6-2V5l-6 2-6-2Zm0 0v12m6-10v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </button>
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label={t('nav.list')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <LangSelector />
          </div>
        </div>
        <div className="kd-hud__row">
          <div className="kd-chip">
            <img src="/assets/world/coin.png" alt="" />
            <span className="kd-chip__num kd-chip__num--coin">{groupNum(balance.coins)}</span>
          </div>
          <div className="kd-chip">
            <img className="kd-flame" src="/assets/world/streak.svg" alt="" />
            <span className={`kd-chip__num ${balance.streakActiveToday ? 'kd-chip__num--hot' : ''}`}>
              {balance.streak}
            </span>
          </div>
        </div>
      </div>

      {/* Нижняя плашка текущего уровня */}
      <div className="kd-levelpill">
        <img className="kd-role-ic" src={`/assets/world/roles/${role.key}.png`} alt="" />
        <span className="kd-levelpill__text">
          {t('kingdom.currentLevel')}
          <b>{role.title}</b>
        </span>
        <span className="kd-levelpill__cefr">{(userLevel || 'A1').toUpperCase()}</span>
      </div>
    </div>
  )
}
