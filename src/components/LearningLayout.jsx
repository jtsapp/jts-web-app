import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import MobileTopBar from './MobileTopBar.jsx'
import Footer from './Footer.jsx'
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
  children,
}) {
  const { t } = useI18n()
  const [drawer, setDrawer] = useState(false)

  return (
    <div className="learn">
      <MobileTopBar
        userName={userName}
        profileLabel={t('kingdom.profile')}
        menuLabel={t('nav.learning')}
        onMenu={() => setDrawer(true)}
        onProfile={onProfile}
      />
      <div className="learn__body">
        <Sidebar
          userName={userName}
          userLevel={userLevel}
          active={active}
          token={token}
          onNav={onNav}
          onProfile={onProfile}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <main className="learn__main">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
