import { useState, useRef, useEffect } from 'react'
import { ChevronRightIcon } from './icons.jsx'
import { LANGS, useI18n } from '../i18n.jsx'

export default function LangSelector() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGS.find((l) => l.code === lang) || LANGS[0]
  const CurrentFlag = current.Flag

  // Закрытие по клику вне меню
  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="lang-wrap" ref={ref}>
      <button
        className="lang-selector"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CurrentFlag />
        <span>{current.label}</span>
        <span className={`chev ${open ? 'chev--open' : ''}`}>
          <ChevronRightIcon size={14} />
        </span>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox">
          {LANGS.map((l) => {
            const Flag = l.Flag
            return (
              <li key={l.code}>
                <button
                  className={`lang-option ${l.code === lang ? 'lang-option--active' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  onClick={() => {
                    setLang(l.code)
                    setOpen(false)
                  }}
                >
                  <Flag />
                  <span>{l.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
