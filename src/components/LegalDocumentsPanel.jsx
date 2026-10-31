import { useI18n } from '../i18n.jsx'
import LegalDocumentsLinks from './LegalDocumentsLinks.jsx'

export default function LegalDocumentsPanel({ className = '' }) {
  const { t } = useI18n()
  return <section className={`legal-panel ${className}`}>
    <h2>{t('legal.title')}</h2>
    <LegalDocumentsLinks cards />
  </section>
}
