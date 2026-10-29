import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import LegalDocumentsLinks from './LegalDocumentsLinks.jsx'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <Logo variant="light" />
      <nav className="footer-documents" aria-label={t('legal.title')}>
        <LegalDocumentsLinks />
      </nav>
      <span className="footer-copy">{t('footer.rights')}</span>
    </footer>
  )
}
