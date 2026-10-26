import { useI18n } from '../i18n.jsx'
import { useMenuItems } from './useMenuItems.js'
import { mobileTabs, tabFor } from '../lib/navSections.js'

// Нижняя панель телефона (≤560px) — дизайн мобильного приложения (Figma «Mobile», узел TabBar кадра 6419:6295).
// Заменяет на телефоне бургер и выезжающее меню; планшет и компьютер её не видят (src/mobile/nav.css). Вкладки — из
// того же меню ученика, что сайдбар (lib/navSections.js), поэтому у преподавателя и в тьютор-онли их меньше.
export default function MobileTabBar({ active, token, onNav }) {
  const { t } = useI18n()
  const { items } = useMenuItems(token)
  const current = tabFor(active)
  return (
    <nav className="mtab" aria-label={t('mtab.label')}>
      {mobileTabs(items).map(({ key, label, ico }) => (
        <button
          key={key}
          type="button"
          className={`mtab__item${current === key ? ' is-active' : ''}`}
          data-tab={key}
          aria-current={current === key ? 'page' : undefined}
          onClick={() => onNav?.(key)}
        >
          <span className="mtab__pill">
            <i className="mtab__ico" style={{ '--mtab-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
          </span>
          <span className="mtab__label">{t(label)}</span>
        </button>
      ))}
    </nav>
  )
}
