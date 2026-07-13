import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <Logo variant="light" />
      <a className="footer-link" href="#" onClick={(e) => e.preventDefault()}>
        {t('footer.privacy')}
      </a>
      <span className="footer-copy">{t('footer.rights')}</span>
    </footer>
  )
}
