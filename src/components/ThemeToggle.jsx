'use client'

// Кнопка темы в строке логотипа сайдбара (и в мобильном меню — это тот же
// сайдбар). Иконка показывает, КУДА переключит: луна в светлой теме, солнце —
// в тёмной.
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { THEME_KEY } from '../lib/theme.js'
import { MoonIcon, SunIcon } from './icons.jsx'

function apply(theme) {
  const d = document.documentElement
  if (theme === 'dark') d.setAttribute('data-theme', 'dark')
  else d.removeAttribute('data-theme')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // приватный режим — тема просто не запомнится
  }
}

export default function ThemeToggle() {
  const { t } = useI18n()
  const [dark, setDark] = useState(null)

  // Тема — пока набросок, поэтому кнопку видно только на dev-стенде и
  // локально: develop целиком уезжает в main, и без этой проверки она
  // появилась бы в проде у всех. В проде тему можно включить ссылкой
  // ?theme=dark — тогда кнопка тоже есть, чтобы было чем вернуть светлую.
  // Состояние читаем после гидратации: на сервере атрибута нет.
  useEffect(() => {
    let chosen = null
    try {
      chosen = localStorage.getItem(THEME_KEY)
    } catch {
      // приватный режим — решаем по адресу
    }
    const devHost = /^(localhost|127\.0\.0\.1|dev-)/.test(location.hostname)
    if (!devHost && !chosen) return
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  if (dark === null) return null
  const label = t(dark ? 'theme.toLight' : 'theme.toDark')
  return (
    <button
      type="button"
      className="sb__theme"
      onClick={() => {
        apply(dark ? 'light' : 'dark')
        setDark(!dark)
      }}
      aria-label={label}
      title={label}
    >
      {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  )
}
