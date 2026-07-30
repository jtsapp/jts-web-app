import { MenuIcon, UserIcon } from './icons.jsx'

// Мобильная шапка обучающей/тьютор-зоны (видна только на узких экранах —
// управление через CSS `.mtop`, десктоп её прячет). Слева гамбургер, который
// открывает сайдбар-drawer, и чип профиля; справа — опциональный слот (напр.
// кнопка «Назад» тьютора). Компонент презентационный и i18n-агностичный:
// подписи приходят пропсами, чтобы работать в обеих языковых системах.
export default function MobileTopBar({ userName, profileLabel, menuLabel, onMenu, onProfile, right }) {
  // Без имени показываем силуэт, а не первую букву подписи «Профиль» — иначе
  // в шапке была бы «П», а на самом профиле — «J»: две несвязанные буквы.
  const trimmedName = (userName || '').trim()
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : null
  return (
    <header className="mtop">
      <button className="mtop__menu" type="button" onClick={onMenu} aria-label={menuLabel}>
        <MenuIcon size={24} />
      </button>

      <button className="mtop__profile" type="button" onClick={onProfile}>
        <span className="mtop__avatar">{initial || <UserIcon size={18} />}</span>
        <span className="mtop__meta">
          <b>{userName || profileLabel}</b>
          {/* Без имени верхняя строка уже показывает подпись — не дублируем её */}
          {userName && <span>{profileLabel}</span>}
        </span>
      </button>

      {right && <div className="mtop__right">{right}</div>}
    </header>
  )
}
