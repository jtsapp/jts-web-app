import Logo from './Logo.jsx'
import LangSelector from './LangSelector.jsx'
import Footer from './Footer.jsx'
import { ChevronLeftIcon } from './icons.jsx'
import { useI18n } from '../i18n.jsx'

// Общая оболочка экрана: шапка (с опциональной кнопкой «назад») + контент + подвал
export default function Shell({ onBack, children }) {
  const { t } = useI18n()
  return (
    <div className="screen">
      <div className="card card--plain">
        <header className="reg-header">
          <div className="reg-header__left">
            {onBack && (
              <button className="back-btn" onClick={onBack} aria-label={t('common.back')}>
                <ChevronLeftIcon size={20} />
              </button>
            )}
            <Logo variant="dark" />
          </div>
          <LangSelector />
        </header>

        <section className="reg-body">{children}</section>
      </div>
      <Footer />
    </div>
  )
}
