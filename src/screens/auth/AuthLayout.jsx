import Logo from '../../components/Logo.jsx'
import LangSelector from '../../components/LangSelector.jsx'
import { ArrowBackIcon } from '../../components/authIcons.jsx'
import { useI18n } from '../../i18n.jsx'

/**
 * Каркас экранов входа и регистрации по макету «Регистрация» (Figma, секции
 * «1 · Регистрация» — десктоп 1440, «2 · Регистрация» — телефон 440).
 *
 * Весь экран — одна <form>: Enter в любом поле отправляет шаг. Внутри два
 * блока, потому что раскладки у них разные: на десктопе кнопки идут сразу под
 * полями, а на телефоне прижаты к низу экрана (там они — отдельная рамка
 * макета), а поля с заголовком стоят по центру оставшейся высоты.
 *
 * Полоска шагов есть не у всех экранов, но место под неё держат все, кроме
 * выбора языка: в макете у «Входа» и «Регистрация пройдена» она просто
 * прозрачная, и заголовок стоит на той же высоте, что у шагов регистрации.
 */
export default function AuthLayout({
  onBack,
  step,
  total,
  centered = false,
  onSubmit,
  actions,
  children,
  busy = false,
  className = '',
}) {
  const { t } = useI18n()

  function submit(e) {
    e.preventDefault()
    if (!busy) onSubmit?.()
  }

  return (
    <div className={`rg${centered ? ' rg--centered' : ''}${className ? ' ' + className : ''}`}>
      <div className="rg__bg" aria-hidden="true" />
      <header className="rg-top">
        {onBack && (
          <button type="button" className="rg-iconbtn rg-back" onClick={onBack} aria-label={t('common.back')}>
            <ArrowBackIcon />
          </button>
        )}
        <Logo variant="dark" />
        <span className="rg-top__spacer" />
        <LangSelector globe />
      </header>

      <main className="rg-body">
        <form className="rg-form" onSubmit={submit} noValidate aria-busy={busy || undefined}>
          <div className="rg-main">
            {!centered && <Steps step={step} total={total} />}
            <div className="rg-content">{children}</div>
          </div>
          {actions && <div className="rg-actions">{actions}</div>}
        </form>
      </main>
    </div>
  )
}

function Steps({ step, total }) {
  const { t } = useI18n()
  if (!step || !total) return <div className="rg-steps rg-steps--ghost" aria-hidden="true" />
  return (
    <div className="rg-steps" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
      <div className="rg-steps__segs" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`rg-steps__seg${i < step ? ' is-done' : ''}`} />
        ))}
      </div>
      <span className="rg-steps__label">{t('rg.step', { n: String(step), total: String(total) })}</span>
    </div>
  )
}

/** Заголовок шага: крупная строка и подпись под ней. */
export function AuthHeading({ title, sub }) {
  return (
    <div className="rg-heading">
      <h1 className="rg-title">{title}</h1>
      {sub && <p className="rg-sub">{sub}</p>}
    </div>
  )
}
