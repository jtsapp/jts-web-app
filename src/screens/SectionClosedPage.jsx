'use client'

import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import './rewards.css'

// Прямая ссылка на раздел, которого нет в тарифе ученика (ТЗ кабинетов, 14е). В меню такой пункт не показывается,
// а здесь ученик видит, что раздел не сломан, и к кому идти.
export default function SectionClosedPage({ active, userLevel, userName, token, onNav, onProfile, status = 'closed', onRetry }) {
  const { t } = useI18n()
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active={active} token={token} onNav={onNav} onProfile={onProfile}>
      <section className="rw-page" data-testid={status === 'closed' ? 'section-closed' : 'section-access-' + status}>
        <div className="rw-state" role={status === 'error' ? 'alert' : 'status'}>
          <h1>{t(status === 'closed' ? 'section.closed.title' : `section.access.${status}.title`)}</h1>
          <p>{t(status === 'closed' ? 'section.closed.text' : `section.access.${status}.text`)}</p>
          {status === 'error' && <button type="button" onClick={onRetry}>{t('section.access.retry')}</button>}
          <button type="button" onClick={() => onNav?.('home')}>{t('section.closed.home')}</button>
        </div>
      </section>
    </LearningLayout>
  )
}
