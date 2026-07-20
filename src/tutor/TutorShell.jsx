import Sidebar from '../components/Sidebar.jsx'
import MobileNav from '../components/MobileNav.jsx'
import Footer from '../components/Footer.jsx'
import { ArrowLeftIcon } from './TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Оболочка тьютор-раздела: сайдбар слева, контент по центру, тёмный подвал снизу.
// onBack  — если задан, сверху рисуется белая полоса с кнопкой «Назад».
// layout  — 'center' (велком/язык, контент по центру) | 'flow' (внутренние экраны, сверху).
// title   — опциональный заголовок в верхней полосе (рядом с «Назад»).
export default function TutorShell({
  active = 'tutor',
  user,
  onNavigate,
  onProfile,
  onBack,
  title,
  layout = 'center',
  children,
}) {
  const t = useT()
  return (
    <div className="t-app">
      <div className="t-body">
        <MobileNav
          active={active}
          userName={user?.name}
          userLevel={user?.level}
          onNav={onNavigate}
          onProfile={onProfile}
        />
        <Sidebar
          active={active}
          userName={user?.name}
          userLevel={user?.level}
          onNav={onNavigate}
          onProfile={onProfile}
        />
        <main className="t-main">
          {onBack && (
            <div className="t-topbar">
              <button className="t-back" type="button" onClick={onBack}>
                <ArrowLeftIcon size={20} />
                {t('shell.back')}
              </button>
              {title && <span className="t-topbar__title">{title}</span>}
            </div>
          )}
          <div className={'t-content t-content--' + layout}>{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
