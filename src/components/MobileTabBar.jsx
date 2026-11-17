import { useI18n } from '../i18n.jsx'
import { useMenuItems } from './useMenuItems.js'
import { mobileTabs, serviceItems, tabFor } from '../lib/navSections.js'

// Нижняя панель телефона (≤560px) — дизайн мобильного приложения (Figma «Mobile», узел TabBar кадра 6419:6295).
// Заменяет на телефоне бургер и выезжающее меню; планшет и компьютер её не видят (src/mobile/nav.css). Вкладки — из
// того же меню ученика, что сайдбар (lib/navSections.js), поэтому у преподавателя и в тьютор-онли их меньше.
export default function MobileTabBar({ active, token, onNav }) {
  const { t } = useI18n()
  const { items, badges } = useMenuItems(token)
  // Раздел ждёт действия (бейдж в сайдбаре) — точка на его вкладке, иначе на телефоне его не заметить; раздел из
  // «Сервисов» — точка на «Сервисах». Бейдж «Уроков» (подбор учителя, с 17.11.2026 вкладка «Уроков») — на «Уроках».
  const servicesAlert = serviceItems(items).some((i) => badges[i.key] > 0)
  const alert = (key) => (key === 'services' ? servicesAlert : badges[key] > 0)
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
            {alert(key) && <b className="mtab__dot" aria-hidden="true" />}
          </span>
          <span className="mtab__label" data-label={t(label)}>{t(label)}</span>
        </button>
      ))}
    </nav>
  )
}
