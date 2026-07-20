import { MenuIcon } from './icons.jsx'

// Мобильная шапка обучающей/тьютор-зоны (видна только на узких экранах —
// управление через CSS `.mtop`, десктоп её прячет). Слева гамбургер, который
// открывает сайдбар-drawer, и чип профиля; справа — опциональный слот (напр.
// кнопка «Назад» тьютора). Компонент презентационный и i18n-агностичный:
// подписи приходят пропсами, чтобы работать в обеих языковых системах.
export default function MobileTopBar({ userName, profileLabel, menuLabel, onMenu, onProfile, right }) {
  const initial = (userName || profileLabel || 'JTS').trim().charAt(0).toUpperCase()
  return (
    <header className="mtop">
      <button className="mtop__menu" type="button" onClick={onMenu} aria-label={menuLabel}>
        <MenuIcon size={24} />
      </button>

      <button className="mtop__profile" type="button" onClick={onProfile}>
        <span className="mtop__avatar">{initial}</span>
        <span className="mtop__meta">
          <b>{userName || profileLabel}</b>
          <span>{profileLabel}</span>
        </span>
      </button>

      {right && <div className="mtop__right">{right}</div>}
    </header>
  )
}
