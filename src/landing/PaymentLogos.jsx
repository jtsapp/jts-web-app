// Знаки Visa и Mastercard — рекомендация Freedom Pay к сайту до подключения
// оплаты. Mastercard — официальный файл в public/landing/icons. Visa пока
// нарисована нами: её файлы выдают только после анкеты на globalclient.visa.com;
// получим — положить рядом и сделать как MastercardMark.
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

// Официальный символ Mastercard из Brand Center (mc_symbol_SVG.zip, «For
// websites & apps», скачан 30.10.2026) — файл как есть, без правок: правила
// бренда запрещают менять знак. Рамка-плашка — наша, вокруг файла.
export function MastercardMark() {
  return (
    <span className="pay-logo pay-logo--file">
      <img src="/landing/icons/pay-mastercard.svg" width="45" height="32" alt="Mastercard" />
    </span>
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
