'use client'

// Иконки раздела — те же контуры, что в прототипе (ICON в jtswords.html:244).
// Отдельным файлом, чтобы не разносить одни и те же пути по четырём экранам.

export function IconSound(props) {
  return (
    <svg className="wd-i" viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

export function IconPlay(props) {
  return (
    <svg className="wd-i" viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M7 5l12 7-12 7V5z" />
    </svg>
  )
}

export function IconCheck(props) {
  return (
    <svg className="wd-i" viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M5 13l4 4 10-10" />
    </svg>
  )
}
