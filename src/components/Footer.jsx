import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { PRIVACY_URL } from '../lib/support.js'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <Logo variant="light" />
      <a className="footer-link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
        {t('footer.privacy')}
      </a>
      <span className="footer-copy">{t('footer.rights')}</span>
    </footer>
  )
}
