// Заглушка вкладки или блока без данных: иконка, заголовок, пояснение и, по
// желанию, действие. Для вкладок, которые ещё переносятся из прототипа.
export default function EmptyState({ icon = null, title, text, action = null }) {
  return (
    <div className="ih-empty">
      {icon && <span className="ih-empty__icon">{icon}</span>}
      <h3 className="ih-empty__title">{title}</h3>
      {text && <p className="ih-empty__text">{text}</p>}
      {action}
    </div>
  )
}
