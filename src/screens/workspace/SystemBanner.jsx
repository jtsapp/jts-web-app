// Системный баннер — единая форма для сообщений уровня экрана (спека §2:
// «отдельных форм не изобретать»). Полоса во всю ширину контентной области,
// иконка слева, текст, необязательное действие справа текст-кнопкой.
//
// Тон меняет только заливку: neutral — обычное сообщение, attention — то, на
// что стоит посмотреть, error — не получилось.
export default function SystemBanner({ icon, text, actionLabel, onAction, tone = 'neutral' }) {
  return (
    <div className={`lw-sysbanner lw-sysbanner--${tone}`} role="status">
      {icon && (
        <span className="lw-sysbanner__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="lw-sysbanner__text">{text}</span>
      {actionLabel && onAction && (
        <button type="button" className="lw-sysbanner__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
