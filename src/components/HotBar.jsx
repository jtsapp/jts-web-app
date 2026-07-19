import { LessonsIcon, TutorIcon, UserIcon, ScenariosIcon } from './icons.jsx'
import { MenuIcon } from '../tutor/TutorIcons.jsx'
import { useI18n } from '../i18n.jsx'

const TABS = [
  { key: 'lessons', label: 'hotbar.lessons', Icon: LessonsIcon },
  { key: 'scenarios', label: 'hotbar.scenarios', Icon: ScenariosIcon },
  { key: 'tutor', label: 'hotbar.tutor', Icon: TutorIcon },
  { key: 'manage', label: 'hotbar.manage', Icon: MenuIcon },
  { key: 'profile', label: 'hotbar.profile', Icon: UserIcon },
]

// Нижняя навигация для мобильных: на телефонах сайдбар скрыт (см. медиblock
// «Мобильная навигация» в styles.css), и хотбар — единственный способ ходить
// между уроками, сценариями, тьютором, управлением и профилем. Рендерится
// один раз в App.jsx поверх активного экрана; на десктопе display:none.
export default function HotBar({ active, onNav }) {
  const { t } = useI18n()
  return (
    <nav className="hotbar" aria-label={t('hotbar.aria')}>
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className={`hotbar__item ${active === key ? 'hotbar__item--active' : ''}`}
          onClick={() => onNav?.(key)}
          aria-current={active === key ? 'page' : undefined}
        >
          <Icon size={22} />
          <span>{t(label)}</span>
        </button>
      ))}
    </nav>
  )
}
