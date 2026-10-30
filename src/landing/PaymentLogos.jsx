// Знаки Visa и Mastercard — рекомендация Freedom Pay к сайту до подключения
// оплаты. Рисуем сами, как KaspiMark в PaymentMethodModal: файлов брендов в
// public/ нет, а тянуть картинку с чужого сервера CSP не пропустит. Будут
// официальные файлы из брендбука (их выдаёт Freedom Pay) — заменить здесь.
// Без хуков и состояния — годится и серверной странице, и подвалу приложения.

export function VisaMark() {
  return (
    <svg className="pay-logo" width="54" height="34" viewBox="0 0 54 34" role="img" aria-label="Visa">
      <rect width="54" height="34" rx="5" fill="#fff" stroke="#d9dce6" />
      <text
        x="27" y="22.5" textAnchor="middle" fill="#1434cb"
        fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" letterSpacing="0.5"
      >
        VISA
      </text>
    </svg>
  )
}

export function MastercardMark() {
  return (
    <svg className="pay-logo" width="54" height="34" viewBox="0 0 54 34" role="img" aria-label="Mastercard">
      <rect width="54" height="34" rx="5" fill="#fff" stroke="#d9dce6" />
      <circle cx="21.5" cy="17" r="9.5" fill="#eb001b" />
      <circle cx="32.5" cy="17" r="9.5" fill="#f79e1b" />
      {/* Пересечение кругов: линза между ними, как в знаке. */}
      <path d="M27 9.24a9.5 9.5 0 0 1 0 15.52 9.5 9.5 0 0 1 0-15.52Z" fill="#ff5f00" />
    </svg>
  )
}

export default function PaymentLogos({ label, className = '' }) {
  return (
    <div className={('pay-logos ' + className).trim()} aria-label={label} role="group">
      <VisaMark />
      <MastercardMark />
    </div>
  )
}
