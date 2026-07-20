import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function WelcomePage({ onRegister, onLogin }) {
  const { t } = useI18n()
  return (
    <div className="screen">
      <div className="card">
        {/* Шапка поверх героя */}
        <header className="hero-header">
          <Logo variant="light" />

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
        <section className="hero">
          <div className="hero__content">
            <h1 className="hero__title">
              {t('welcome.title')
                .split('\n')
                .map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
            </h1>
            <p className="hero__subtitle">{t('welcome.subtitle')}</p>

            <div className="cta">
              <button className="btn btn--primary" onClick={onRegister}>
                {t('common.register')}
              </button>
              <button className="btn btn--secondary" onClick={onLogin}>
                {t('common.login')}
              </button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
