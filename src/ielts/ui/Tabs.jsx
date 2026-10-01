import { useRef } from 'react'

// Вкладки раздела с подчёркиванием активной (макет: «Сегодня · Обучение ·
// Пробные тесты · …»). Доступность — по WAI-ARIA tabs: стрелки влево/вправо,
// Home/End, у панели id `${idBase}-panel-${key}`. На узком экране строка
// прокручивается вбок, а не переносится (ТЗ §5.2: tabs с горизонтальным скроллом).
export default function Tabs({ items, value, onChange, idBase = 'ih-tabs', label }) {
  const refs = useRef({})
  const keys = items.map((i) => i.key)

  const onKeyDown = (e) => {
    const i = keys.indexOf(value)
    let next = null
    if (e.key === 'ArrowRight') next = keys[(i + 1) % keys.length]
    else if (e.key === 'ArrowLeft') next = keys[(i - 1 + keys.length) % keys.length]
    else if (e.key === 'Home') next = keys[0]
    else if (e.key === 'End') next = keys[keys.length - 1]
    if (next == null) return
    e.preventDefault()
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div className="ih-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map(({ key, label: text }) => {
        const active = key === value
        return (
          <button
            key={key}
            ref={(el) => (refs.current[key] = el)}
            type="button"
            role="tab"
            id={`${idBase}-tab-${key}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel-${key}`}
            tabIndex={active ? 0 : -1}
            className={`ih-tabs__tab ${active ? 'ih-tabs__tab--active' : ''}`}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
