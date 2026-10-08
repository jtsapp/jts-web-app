'use client'

import { useI18n } from '../i18n.jsx'

// Плашка «Сессия истекла» поверх любого экрана.
//
// Токен живёт сутки, и вкладка, простоявшая ночь, — самый обычный случай. Раньше
// сессия кончалась молча: запросы падали, каталоги рисовали «Нет данных», а
// человек не понимал, сломалось ли приложение или просто надо войти заново.
//
// Не тост и не часть конкретного экрана: после выхода экран зависит от того, где
// человек был (гостю открыта Практика, ученику — «Главная»), а сказать об этом
// нужно везде, и висеть плашка должна, пока он не войдёт или не закроет её сам.
export default function SessionExpiredNotice({ onLogin, onClose }) {
  const { t } = useI18n()
  return (
    <div className="se-notice" role="alert">
      <svg className="se-notice__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="se-notice__text">{t('session.expired')}</span>
      <button type="button" className="se-notice__cta" onClick={onLogin}>
        {t('session.expired.login')}
      </button>
      <button type="button" className="se-notice__close" onClick={onClose} aria-label={t('session.expired.close')}>
        ×
      </button>
    </div>
  )
}
