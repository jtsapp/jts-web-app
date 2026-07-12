import Logo from './Logo.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <Logo variant="light" />
      <a className="footer-link" href="#">
        Политика конфиденциальности
      </a>
      <span className="footer-copy">© Все права защищены</span>
    </footer>
  )
}
