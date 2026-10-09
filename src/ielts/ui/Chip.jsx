// Пилюля раздела IELTS: серия, XP, «Цель 7.0», статус фазы, быстрое действие.
// Цвет — тоном, а не hex в месте вызова: тоны из макета Screen MS.
//   neutral  серый фон, тёмный текст (быстрые действия, дата экзамена)
//   muted    серый фон, серый текст («оценит ИИ», ориентир фазы)
//   violet   сиреневый фон, фиолетовый текст (XP, цель, текущая фаза)
//   orange   персиковый фон, оранжевый текст (серия дней)
//   green    мятный фон, зелёный текст (фаза сделана)
//   solid    фиолетовый фон, белый текст («Начните с этого»)
// size: md — 14px с отступом 8/14 (шапка, быстрые действия), sm — 12px 4/10.
// С onClick становится кнопкой.
export default function Chip({ tone = 'neutral', size = 'md', icon = null, onClick, children, className = '' }) {
  const cls = `ih-chip ih-chip--${tone} ih-chip--${size} ${className}`.trim()
  const body = (
    <>
      {icon && <span className="ih-chip__icon">{icon}</span>}
      <span>{children}</span>
    </>
  )
  return onClick ? (
    <button type="button" className={`${cls} ih-chip--action`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={cls}>{body}</span>
  )
}
