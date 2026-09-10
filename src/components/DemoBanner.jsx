import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { demoTimeLeft, formatDemoLeft } from '../lib/demoAccess.js'

// Тёмная полоса над «Главной» демо-аккаунта: что доступ демонстрационный,
// сколько его осталось и куда идти за полным.
//
// Показывается только демо-ученику и только когда у демо есть срок. Бессрочное
// демо (менеджер выдал доступ руками, demoExpiresAt = null) обходится без
// таймера: пустое место на его месте выглядело бы сломанным счётчиком, а «0 ч
// 0 мин» — прямой ложью.
//
// Тик раз в минуту, а не в секунду: в макете самая мелкая единица — минута,
// и посекундный интервал перерисовывал бы шапку 60 раз впустую.
export default function DemoBanner({ expiresAt, onOpenAccess }) {
  const { t } = useI18n()
  // Первый рендер обязан совпасть с серверным, иначе Next роняет гидратацию:
  // на сервере Date.now() другой. Поэтому остаток считаем эффектом, а до него
  // рисуем полосу без таймера — текст и кнопка в ней те же.
  const [left, setLeft] = useState(null)

  useEffect(() => {
    const tick = () => setLeft(demoTimeLeft(expiresAt))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])

  const expired = left?.expired === true
  const timer = left && !left.endless ? formatDemoLeft(t, left) : ''

  return (
    <div className={`dm-banner${expired ? ' is-out' : ''}`}>
      <span className="dm-banner__badge">{t('demo.badge')}</span>
      <span className="dm-banner__text">
        {t(expired ? 'demo.bannerExpired' : 'demo.banner')}
      </span>
      {timer && (
        <span className="dm-banner__timer">
          <ClockIcon />
          {timer}
        </span>
      )}
      <button type="button" className="dm-banner__cta" onClick={onOpenAccess}>
        {t('demo.open')}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
