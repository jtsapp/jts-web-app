import Logo from './Logo.jsx'
import LangSelector from './LangSelector.jsx'
import Footer from './Footer.jsx'
import { ChevronLeftIcon } from './icons.jsx'

// Общая оболочка экрана: шапка (с опциональной кнопкой «назад») + контент + подвал
export default function Shell({ onBack, children }) {
  return (
    <div className="screen">
      <div className="card card--plain">
        <header className="reg-header">
          <div className="reg-header__left">
            {onBack && (
              <button className="back-btn" onClick={onBack} aria-label="Назад">
                <ChevronLeftIcon size={20} />
              </button>
            )}
            <Logo variant="dark" />
          </div>
          <LangSelector />
        </header>

        <section className="reg-body">
          <div className="form-inner">{children}</div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
