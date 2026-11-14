// src/screens/chess/pieces.jsx
// Фигуры — набор Cburnett (тот, что в Википедии и по умолчанию в Lichess): владелец выбрал его 14.11.2026
// вместо первого своего набора из простых форм. Автор, Colin M.L. Burnett, выпустил набор под тремя лицензиями;
// мы берём BSD (public/chess/PIECES-LICENSE.txt) — она не требует открывать код сайта. Графика chess.com — их
// собственность, её не берём.
//
// Разметка фигур генерируется из исходных SVG (scripts/build-chess-pieces.js → piecesSprite.js). У белых и
// чёрных разметка разная (у чёрных свои белые штрихи), поэтому символ на каждую из 12 фигур, а не один на тип.
import { PIECE_MARKUP, PIECE_VIEWBOX } from './piecesSprite.js'

/** Спрайт фигур — один раз на экран; сами фигуры ссылаются на символы. */
export function PieceSprite() {
  return (
    <svg className="ch-sprite" aria-hidden="true" width="0" height="0">
      {Object.entries(PIECE_MARKUP).map(([key, markup]) => (
        // Разметка — из файлов репозитория, проверенных сборщиком (без скриптов и внешних ссылок), не от пользователя.
        <symbol key={key} id={`ch-${key}`} viewBox={PIECE_VIEWBOX} dangerouslySetInnerHTML={{ __html: markup }} />
      ))}
    </svg>
  )
}

export function Piece({ type, color, className = '', style }) {
  return (
    <svg className={`ch-piece ch-piece--${color} ${className}`} style={style} viewBox={PIECE_VIEWBOX} aria-hidden="true">
      <use href={`#ch-${color}${type}`} />
    </svg>
  )
}
