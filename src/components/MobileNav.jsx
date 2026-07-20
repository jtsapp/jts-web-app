import { useState } from 'react'
import Sidebar from './Sidebar.jsx'

// Мобильный shell (≤560px): топбар с бургером и чипом профиля + выезжающий
// drawer, внутри которого — тот же Sidebar (навигация). На десктопе скрыт
// через CSS (.mnav{display:none}), сам Sidebar-рельс скрывается на мобиле.
// Проброс всех пропсов в Sidebar, чтобы навигация/профиль/уровень совпадали.
export default function MobileNav(props) {
  const [open, setOpen] = useState(false)
  const name = props.userName || 'Профиль'
  const initial = name.trim().charAt(0).toUpperCase() || 'J'

  return (
    <>
      <div className="mnav">
        <button
          className="mnav__burger"
          type="button"
          aria-label="Меню"
          onClick={() => setOpen(true)}
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
            <path
              d="M1 1h18M1 8h18M1 15h18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button className="mnav__profile" type="button" onClick={props.onProfile}>
          <span className="mnav__avatar">{initial}</span>
          <span className="mnav__meta">
            <b>{name}</b>
            <span>Профиль</span>
          </span>
        </button>
      </div>

      <div
        className={`mnav__scrim ${open ? 'mnav__scrim--on' : ''}`}
        onClick={() => setOpen(false)}
      />
      <div className={`mnav__drawer ${open ? 'mnav__drawer--on' : ''}`}>
        <Sidebar
          {...props}
          onNav={(key) => {
            setOpen(false)
            props.onNav?.(key)
          }}
          onProfile={() => {
            setOpen(false)
            props.onProfile?.()
          }}
        />
      </div>
    </>
  )
}
