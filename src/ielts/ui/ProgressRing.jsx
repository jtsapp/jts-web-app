// Кольцо прогресса с подписью в центре (план дня «1/5»; пригодится и кольцам
// секций в «Прогрессе»). Рисуется штрихом окружности, а не картинкой из макета:
// дуга должна расти вместе с данными.
export default function ProgressRing({ value = 0, max = 1, size = 64, stroke = 6, label, ariaLabel }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <span className="ih-ring" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ih-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        {share > 0 && (
          <circle
            className="ih-ring__arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c * share} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {label != null && <span className="ih-ring__label">{label}</span>}
    </span>
  )
}
