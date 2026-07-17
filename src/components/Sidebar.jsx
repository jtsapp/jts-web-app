import { useState, useEffect } from 'react'
import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { roleForLevel } from '../kingdoms.js'
import { getBalance } from '../api.js'
import { loadToken } from '../lib/session.js'
import {
  LearningIcon,
  PracticeIcon,
  TutorIcon,
  LessonsIcon,
  IeltsIcon,
  ChevronRightIcon,
} from './icons.jsx'

const NAV = [
  { key: 'learning', label: 'nav.learning', Icon: LearningIcon },
  { key: 'practice', label: 'nav.practice', Icon: PracticeIcon },
  { key: 'tutor', label: 'nav.tutor', Icon: TutorIcon },
  { key: 'lessons', label: 'nav.lessons', Icon: LessonsIcon },
  { key: 'ielts', label: 'nav.ielts', Icon: IeltsIcon },
]

// 1253 → «1 253» (как в мобильном HUD)
function groupNum(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Левый сайдбар обучающей зоны. Монеты и стрик — из бэкенда
// (GET /mobile/balance/info), логика начисления живёт там же.
export default function Sidebar({ userName, userLevel = 'A1', active = 'learning', token, onNav, onProfile }) {
  const { t } = useI18n()
  const role = roleForLevel(userLevel)
  const initial = (userName || 'JTS').trim().charAt(0).toUpperCase()

  const [balance, setBalance] = useState({ coins: 0, streak: 0, streakActiveToday: false })

  useEffect(() => {
    // Не все экраны пробрасывают token (тьютор, профиль) — тогда берём его
    // из localStorage сами, чтобы монеты и стрик не залипали на нуле.
    const authToken = token || loadToken()
    if (!authToken) return
    let alive = true
    getBalance(authToken)
      .then((b) => {
        if (alive && b) {
          setBalance({
            coins: b.coins ?? 0,
            streak: b.streak ?? 0,
            streakActiveToday: !!b.streakActiveToday,
          })
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  return (
    <aside className="sb">
      <div className="sb__logo">
        <Logo variant="dark" />
      </div>

      <button className="sb__profile" onClick={onProfile}>
        <span className="sb__avatar">{initial}</span>
        <span className="sb__profile-text">
          <b>{userName || t('kingdom.profile')}</b>
          <span>{t('kingdom.profile')}</span>
        </span>
        <span className="sb__profile-chev">
          <ChevronRightIcon size={16} />
        </span>
      </button>

      <nav className="sb__nav">
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`sb__item ${active === key ? 'sb__item--active' : ''}`}
            onClick={() => onNav?.(key)}
          >
            <Icon size={24} />
            <span>{t(label)}</span>
          </button>
        ))}
      </nav>

      <div className="sb__spacer" />

      <div className="sb__role">
        <img className="sb__role-ic" src={`/assets/world/roles/${role.key}.png`} alt="" />
        <span className="sb__role-text">
          {t('nav.you')} {t('role.' + role.key)}
        </span>
        <span className="sb__role-lvl">{(userLevel || 'A1').toUpperCase()}</span>
      </div>

      {/* Стрик + монеты (данные из бэкенда) */}
      <div className="sb__balance">
        <div className="sb__stat">
          <img
            className={`sb__flame ${balance.streakActiveToday ? 'sb__flame--hot' : ''}`}
            src="/assets/world/streak.svg"
            alt=""
          />
          <span className={`sb__stat-num ${balance.streakActiveToday ? 'sb__stat-num--hot' : ''}`}>
            {balance.streak}
          </span>
        </div>
        <div className="sb__stat">
          <img className="sb__coin" src="/assets/world/coin.png" alt="" />
          <span className="sb__stat-num sb__stat-num--coin">{groupNum(balance.coins)}</span>
        </div>
      </div>
    </aside>
  )
}
