import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import LegalDocumentsLinks from './LegalDocumentsLinks.jsx'
import PaymentLogos from '../landing/PaymentLogos.jsx'
import { INFO_PAGES, infoUrl, pickInfo } from '../landing/info.js'

// Страницы для покупателя (/info/*) и знаки карт — требования Freedom Pay;
// страницы общие с лендингом, на английском их нет — показываем русские.
export default function Footer() {
  const { t, lang } = useI18n()
  const info = pickInfo(lang)
  return (
    <footer className="footer">
      <Logo variant="light" />
      <nav className="footer-documents" aria-label={t('legal.title')}>
        <LegalDocumentsLinks />
        <ul className="legal-links">
          {INFO_PAGES.map((page) => <li key={page}>
            <a href={infoUrl(page, lang)} target="_blank" rel="noopener noreferrer">
              <span className="legal-link-label">{info.nav[page]}</span> <span className="legal-link-arrow" aria-hidden="true">↗</span>
            </a>
          </li>)}
        </ul>
        <PaymentLogos label={info.cards} className="footer-cards" />
      </nav>
      <span className="footer-copy">{t('footer.rights')}</span>
    </footer>
  )
}
