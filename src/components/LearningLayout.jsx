import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import MobileTopBar from './MobileTopBar.jsx'
import Footer from './Footer.jsx'
import { NotificationProvider, NotificationBell } from './NotificationBell.jsx'
import LangSelector from './LangSelector.jsx'
import { useI18n } from '../i18n.jsx'

// Оболочка обучающей зоны: на десктопе сайдбар слева + контент + подвал;
// на мобилке — верхняя шапка с гамбургером, а сайдбар выезжает drawer'ом.
export default function LearningLayout({
  userName,
  userLevel,
  active = 'learning',
  token,
  onNav,
  onProfile,
  // Сайдбар-рейл: сворачивается в колонку иконок, чтобы рабочая область была
  // во всю ширину. Просят его сами экраны-рабочие места (класс, каталог), а не
  // раздел целиком: расписание — обычный экран и живёт с полным сайдбаром.
  rail = false,
  // Перезапуск онбординг-тура экрана. Кнопка живёт в том же углу, что колокольчик
  // и язык: заголовки экранов на телефоне из макета убраны (.pp__title,
  // .lp-isle__title в media 760), и рядом с ними «?» просто исчезала бы.
  onHelp,
  children,
}) {
  const { t } = useI18n()
  const [drawer, setDrawer] = useState(false)
  const help = onHelp ? (
    <button className="tour-help" type="button" onClick={onHelp} title={t('tour.help')} aria-label={t('tour.help')}>
      ?
    </button>
  ) : null

  return (
    <NotificationProvider token={token} onNavigate={onNav}>
    <div className={`learn ${rail ? 'learn--rail' : ''}`}>
      <MobileTopBar
        userName={userName}
        profileLabel={t('kingdom.profile')}
        menuLabel={t('nav.learning')}
        onMenu={() => setDrawer(true)}
        onProfile={onProfile}
        right={<>{help}<LangSelector compact /><NotificationBell /></>}
      />
      <div className="learn__body">
        <Sidebar
          userName={userName}
          userLevel={userLevel}
          active={active}
          rail={rail}
          token={token}
          onNav={onNav}
          onProfile={onProfile}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <main className="learn__main">
          {/* Язык рядом с колокольчиком: до этого переключатель был только на
              входных экранах, и сменить язык из кабинета было нечем. */}
          <div className="learn__bell">
            {help}
            <LangSelector compact />
            <NotificationBell />
          </div>
          {children}
        </main>
      </div>
      <Footer />
    </div>
    </NotificationProvider>
  )
}
