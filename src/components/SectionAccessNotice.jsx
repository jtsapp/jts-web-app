import { useI18n } from '../i18n.jsx'
import './section-access-notice.css'

/** Общие разделы остаются доступны, а причина отсутствия остальных вкладок видна в меню и мобильных сервисах. */
export default function SectionAccessNotice({ access, onRetry }) {
  const { t } = useI18n()
  const status = access?.status
  if (status !== 'loading' && status !== 'error') return null
  return <div className="section-access-note" role={status === 'error' ? 'alert' : 'status'} data-testid="section-access-notice">
    <p>{t(`section.access.${status}.title`)}</p>
    {status === 'error' && <button type="button" onClick={onRetry}>{t('section.access.retry')}</button>}
  </div>
}
