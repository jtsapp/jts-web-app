// Иконки «Слушай и выбирай» — те же контуры, что в прототипе (ICONS). Штрих и
// заливку задаёт CSS (.lc-i); у сплошных фигур fill/stroke стоят прямо на
// пути и перебивают унаследованное.

const PATHS = {
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
  pause: <path d="M8 5v14M16 5v14" strokeWidth="4" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />,
  replay: <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />,
  volume: <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />,
  muted: <path d="m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  headphones: (
    <>
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <rect x="3" y="12" width="4" height="9" rx="2" />
      <rect x="17" y="12" width="4" height="9" rx="2" />
    </>
  ),
  zoom: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5M7 10h6M10 7v6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 1 1 4 3v2m0 3h.01" />
    </>
  ),
}

export function LcIcon({ name }) {
  return (
    <svg className="lc-i" viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
