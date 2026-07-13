import {
  JtsLogo,
  HomeIcon,
  ConnectorIcon,
  StarIcon,
  CapIcon,
  ArrowRightIcon,
} from './TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Пункты навигации тьютор-раздела (макет: Обучение / Практика / Тьютор / Уроки)
const NAV = [
  { key: 'learn', tkey: 'nav.learn', Icon: HomeIcon },
  { key: 'practice', tkey: 'nav.practice', Icon: ConnectorIcon },
  { key: 'tutor', tkey: 'nav.tutor', Icon: StarIcon },
  { key: 'lessons', tkey: 'nav.lessons', Icon: CapIcon },
]

export default function TutorSidebar({
  active = 'tutor',
  user = { name: 'Сакен', rank: 'Вы Барон', level: 'B1' },
  onNavigate,
  onProfile,
}) {
  const t = useT()
  return (
    <aside className="t-sidebar">
      <div className="t-sidebar__top">
        <div className="t-sidebar__group">
          <div className="t-logo">
            <JtsLogo height={21} color="var(--t-purple)" />
          </div>

          <button className="t-profile" type="button" onClick={onProfile}>
            <span className="t-profile__left">
              <img className="t-profile__avatar" src="/tutor/avatar.png" alt="" />
              <span className="t-profile__meta">
                <span className="t-profile__name">{user.name}</span>
                <span className="t-profile__role">{t('sidebar.profile')}</span>
              </span>
            </span>
            <span className="t-profile__arrow">
              <ArrowRightIcon size={20} />
            </span>
          </button>

          <nav className="t-nav">
            {NAV.map(({ key, tkey, Icon }) => (
              <button
                key={key}
                type="button"
                className={'t-nav__item' + (active === key ? ' is-active' : '')}
                onClick={() => onNavigate && onNavigate(key)}
              >
                <span className="t-nav__icon">
                  <Icon size={24} />
                </span>
                <span className="t-nav__label">{t(tkey)}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="t-rank">
          <span className="t-rank__left">
            <img className="t-rank__avatar" src="/tutor/fox.png" alt="" />
            <span className="t-rank__name">{user.rank}</span>
          </span>
          <span className="t-rank__level">{user.level}</span>
        </div>
      </div>
    </aside>
  )
}
