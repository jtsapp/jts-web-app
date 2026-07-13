import { JtsLogo } from './TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

export default function TutorFooter() {
  const t = useT()
  return (
    <footer className="t-footer">
      <span className="t-footer__logo">
        <JtsLogo height={29} color="#fff" />
      </span>
      <a className="t-footer__link" href="#">
        {t('footer.privacy')}
      </a>
      <span className="t-footer__copy">{t('footer.copy')}</span>
    </footer>
  )
}
