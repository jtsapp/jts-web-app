'use client'

// Переключатель наброска тёмной темы: плашка внизу экрана, чтобы владелец мог
// пройтись по разделам и сравнить вживую. В продукт в таком виде не идёт —
// настоящий выбор темы будет в профиле.
import { useEffect, useState } from 'react'
import { THEME_KEY } from '../lib/theme.js'

const OPTIONS = [
  { id: 'light', label: 'Светлая', dot: '#ffffff' },
  { id: 'dark', label: 'Тёмная', dot: '#9047ff' },
]

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

export default function ThemeSketchSwitch() {
  const [current, setCurrent] = useState(null)

  // Текущее значение читаем после гидратации: на сервере атрибута нет.
  // Плашку видно только на dev-стенде и локально: develop целиком уезжает в
  // main, и без этой проверки она появилась бы в проде у всех. В проде тему
  // по-прежнему можно включить ссылкой ?theme=dark — тогда плашка тоже есть,
  // чтобы было чем вернуть светлую.
  useEffect(() => {
    let chosen = null
    try {
      chosen = localStorage.getItem(THEME_KEY)
    } catch {
      // приватный режим — решаем по адресу
    }
    const devHost = /^(localhost|127\.0\.0\.1|dev-)/.test(location.hostname)
    if (!devHost && !chosen) return
    setCurrent(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
  }, [])

  if (!current) return null
  return (
    <div className="theme-sketch" role="group" aria-label="Тема (набросок)">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className="theme-sketch__btn"
          aria-pressed={current === o.id}
          onClick={() => {
            apply(o.id)
            setCurrent(o.id)
          }}
        >
          <span className="theme-sketch__dot" style={{ background: o.dot }} />
          {o.label}
        </button>
      ))}
    </div>
  )
}
