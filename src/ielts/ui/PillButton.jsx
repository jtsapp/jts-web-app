// Кнопка-пилюля раздела IELTS (13px bold, отступ 8/14).
//   primary  фиолетовая — главное действие строки («Начать» у рекомендованной задачи)
//   soft     серая — остальные «Начать»
//   outline  белая с рамкой — вторичное действие карточки («Пересобрать», «Отчёт к уроку»)
export default function PillButton({ variant = 'soft', icon = null, onClick, disabled, children, ...rest }) {
  return (
    <button
      type="button"
      className={`ih-btn ih-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="ih-btn__icon">{icon}</span>}
      {children}
    </button>
  )
}
