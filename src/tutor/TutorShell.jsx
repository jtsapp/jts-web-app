import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import MobileTopBar from '../components/MobileTopBar.jsx'
import { useMobileTab } from '../components/mobileTab.js'
import Footer from '../components/Footer.jsx'
import { ArrowLeftIcon } from './TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Оболочка тьютор-раздела: сайдбар слева, контент по центру, тёмный подвал снизу.
// onBack  — если задан, сверху рисуется белая полоса с кнопкой «Назад».
// layout  — 'center' (велком/язык, контент по центру) | 'flow' (внутренние экраны, сверху).
// title   — опциональный заголовок в верхней полосе (рядом с «Назад»).
// На планшете: верхняя шапка с гамбургером и профилем, сайдбар — drawer, а
// кнопка «Назад» переезжает в правый слот шапки (десктопная .t-topbar скрыта CSS).
// На телефоне (≤560) шапки нет: внизу панель вкладок, а «Назад» живёт в своей
// полосе .t-topbar (src/mobile/nav.css).
// tabs    — false: на этом экране нижней панели телефона нет (звонок, тест
//           говорения — случайное касание вкладки увело бы из разговора).
export default function TutorShell({
  active = 'tutor',
  user,
  onNavigate,
  onProfile,
  onBack,
  title,
  layout = 'center',
  tabs = true,
  children,
}) {
  const t = useT()
  const [drawer, setDrawer] = useState(false)
  // Панель одна на приложение (App, mobileTab.js): оболочка только говорит, какая вкладка горит.
  useMobileTab(tabs ? active : null)

  const backBtn = onBack && (
    <button className="t-back" type="button" onClick={onBack}>
      <ArrowLeftIcon size={20} />
      {t('shell.back')}
    </button>
  )

  return (
    <div className="t-app">
      <MobileTopBar
        userName={user?.name}
        profileLabel={t('sidebar.profile')}
        menuLabel={t('nav.tutor')}
        onMenu={() => setDrawer(true)}
        onProfile={onProfile}
        right={backBtn}
      />
      <div className="t-body">
        <Sidebar
          active={active}
          userName={user?.name}
          userLevel={user?.level}
          onNav={onNavigate}
          onProfile={onProfile}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <main className="t-main">
          {onBack && (
            <div className="t-topbar">
              {backBtn}
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
