// src/screens/chess/pieces.jsx
// Фигуры — свой набор (графика chess.com — их собственность, наборы Lichess — под свободными, но заразными
// лицензиями). Объём дают блик и тень, цвет — CSS-переменные клетки с фигурой.
const BASE = <path d="M22 90v-6q0-7 9-8h38q9 1 9 8v6z" />
const SHINE = { fill: 'var(--ch-shine)', stroke: 'none' }

const SHAPES = {
  p: (
    <>
      <circle cx="50" cy="30" r="13" />
      <ellipse cx="50" cy="46" rx="15" ry="4.5" />
      <path d="M41 49q5 12-8 26h34q-13-14-8-26z" />
      {BASE}
      <circle cx="45" cy="26" r="4" {...SHINE} />
    </>
  ),
  r: (
    <>
      <path d="M29 16h11v8h6v-8h8v8h6v-8h11v20H29z" />
      <path d="M35 38h30l4 37H31z" />
      {BASE}
      <path d="M38 42h5l-2 30h-5z" {...SHINE} />
    </>
  ),
  n: (
    <>
      <path d="M33 75c0-17 11-22 9-33-6 2-11 9-16 7s-3-9 1-13l13-14 2-9 9 7c17 2 25 22 21 55z" />
      {BASE}
      <circle cx="41" cy="31" r="2.4" fill="var(--ch-line)" stroke="none" />
      <path d="M55 26c8 6 10 20 8 40h-5c2-18 1-30-3-40z" {...SHINE} />
    </>
  ),
  b: (
    <>
      <circle cx="50" cy="13" r="5" />
      <path d="M50 18c17 14 15 28 6 35H44c-9-7-11-21 6-35z" />
      <path d="M55 27l-9 14" fill="none" strokeWidth="3.5" />
      <ellipse cx="50" cy="55" rx="15" ry="4.5" />
      <path d="M42 58q4 9-9 17h34q-13-8-9-17z" />
      {BASE}
      <path d="M44 30q-5 9 0 18h3q-4-9 0-18z" {...SHINE} />
    </>
  ),
  q: (
    <>
      <path d="M24 30l11 27h30l11-27-13 16-6-23-7 21-7-21-6 23z" />
      <circle cx="24" cy="27" r="4.5" /><circle cx="43" cy="20" r="4.5" /><circle cx="57" cy="20" r="4.5" /><circle cx="76" cy="27" r="4.5" />
      <path d="M35 59h30l4 16H31z" />
      {BASE}
      <path d="M38 61h5l-1 12h-6z" {...SHINE} />
    </>
  ),
  k: (
    <>
      <path d="M46 5h8v6h6v8h-6v8h-8v-8h-6v-8h6z" />
      <path d="M30 34q20-13 40 0l-7 23H37z" />
      <path d="M37 59h26l6 16H31z" />
      {BASE}
      <path d="M37 37q5-4 11-5l-2 23h-5z" {...SHINE} />
    </>
  ),
}

/** Спрайт фигур — один раз на экран; сами фигуры ссылаются на символы. */
export function PieceSprite() {
  return (
    <svg className="ch-sprite" aria-hidden="true" width="0" height="0">
      {Object.entries(SHAPES).map(([type, shape]) => (
        <symbol key={type} id={`ch-${type}`} viewBox="0 0 100 100">
          <g fill="var(--ch-fill)" stroke="var(--ch-line)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">{shape}</g>
        </symbol>
      ))}
    </svg>
  )
}

export function Piece({ type, color, className = '', style }) {
  return (
    <svg className={`ch-piece ch-piece--${color} ${className}`} style={style} viewBox="0 0 100 100" aria-hidden="true">
      <use href={`#ch-${type}`} />
    </svg>
  )
}
