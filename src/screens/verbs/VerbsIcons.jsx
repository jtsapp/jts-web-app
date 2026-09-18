// Иконки раздела — контуры из прототипа (speaker/star/micIcon в его скрипте).
// Цвет берут из currentColor, толщину — из .vb-i в verbs.css.

export function SpeakerIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
    </svg>
  )
}

export function StarIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  )
}

export function MicIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
    </svg>
  )
}

// Предпрослушка бита: треугольник «играть» и квадрат «стоп» — своих в
// прототипе не было, контур в той же толщине, что остальные.
export function PlayIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  )
}

export function StopIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg className="vb-i" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
