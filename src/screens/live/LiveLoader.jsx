// Лоадер живого урока: кружок и подпись, что именно идёт. Один на все места
// экрана — загрузку занятия, материала и рамки, — чтобы ожидание везде
// выглядело одинаково. Раньше там стояла голая строка «Загрузка графика…» (ключ
// расписания), а рамка урока секундами висела пустым белым листом.
//
// role="status" — экранный диктор прочтёт подпись, когда лоадер появится.
// `hidden` — лоадер остаётся в разметке, но спрятан (рамка уходит из-под него
// плавным затуханием, см. .lw-frame-cover), и диктору его не читать.
export default function LiveLoader({ label, className = '', hidden = false }) {
  return (
    <div
      className={`lw-loader${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={hidden ? 'true' : undefined}
    >
      <span className="spinner lw-loader__spinner" aria-hidden="true" />
      <span className="lw-loader__label">{label}</span>
    </div>
  )
}
