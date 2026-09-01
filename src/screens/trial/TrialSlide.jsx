'use client'

// Слайд урока: тёмный фон в стиле презентаций школы, крупный заголовок,
// список тезисов и одна кнопка вперёд. Все презентационные экраны урока
// (приветствие, знакомство, speaking, платформа) — это он.

export default function TrialSlide({
  emoji,
  title,
  subtitle,
  note,
  items,
  children,
  onBack,
  onNext,
  nextLabel = 'Дальше →',
}) {
  return (
    <div className="trial trial--slide">
      <div className="trial-card trial-card--slide">
        {emoji && <div className="trial-slide__emoji">{emoji}</div>}
        <h1 className="trial-slide__h">{title}</h1>
        <div className="trial-slide__rule" />
        {subtitle && <p className="trial-slide__sub">{subtitle}</p>}
        {items?.length > 0 && (
          <ul className="trial-slide__list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {children}
        {note && <p className="trial-slide__note">{note}</p>}
        <button className="trial-slide__btn" onClick={onNext}>
          {nextLabel}
        </button>
        {onBack && (
          <button className="trial-ghost" onClick={onBack}>
            ← Назад
          </button>
        )}
      </div>
    </div>
  )
}
