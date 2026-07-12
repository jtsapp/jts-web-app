import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from '../components/icons.jsx'

export default function WelcomePage({ onRegister, onLogin }) {
  return (
    <div className="screen">
      <div className="card">
        {/* Шапка поверх героя */}
        <header className="hero-header">
          <Logo variant="dark" />

          <div className="hero-header__right">
            <div className="socials">
              <a className="social-pill" href="#">
                <InstagramIcon size={15} />
                <span>Instagram</span>
              </a>
              <a className="social-round" href="#" aria-label="Telegram">
                <TelegramIcon size={16} />
              </a>
              <a className="social-round social-round--wa" href="#" aria-label="WhatsApp">
                <WhatsAppIcon size={16} />
              </a>
            </div>
            <LangSelector />
          </div>
        </header>

        {/* Герой */}
        <section
          className="hero"
          style={{ backgroundImage: 'url(/assets/hero-london.jpg)' }}
        >
          <div className="hero__content">
            <h1 className="hero__title">
              Обучайся английскому
              <br />с личным тьютором
            </h1>
            <p className="hero__subtitle">
              Комфорт и лучшие методики обучения английского языка
            </p>

            <div className="cta">
              <button className="btn btn--primary" onClick={onRegister}>
                Регистрация
              </button>
              <button className="btn btn--secondary" onClick={onLogin}>
                Войти
              </button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
