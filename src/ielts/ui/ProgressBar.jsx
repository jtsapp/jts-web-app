// Тонкая полоса прогресса (Figma: строки карточек «Обучения»). Цвет — из --ih-tone места вызова.
export default function ProgressBar({ value = 0, max = 1, width = 92, label }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <span className="ih-bar" style={{ width }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${share * 100}%` }} />
    </span>
  )
}
