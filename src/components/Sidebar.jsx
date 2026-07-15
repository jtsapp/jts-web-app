import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { roleForLevel } from '../kingdoms.js'
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

// Левый сайдбар обучающей зоны (статичная оболочка).
export default function Sidebar({ userName, userLevel = 'A1', active = 'learning', onNav, onProfile }) {
  const { t } = useI18n()
  const role = roleForLevel(userLevel)
  const initial = (userName || 'JTS').trim().charAt(0).toUpperCase()

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
    </aside>
  )
}
