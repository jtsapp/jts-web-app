import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'

// Оболочка обучающей зоны: сайдбар слева + контент + подвал снизу.
export default function LearningLayout({
  userName,
  userLevel,
  active = 'learning',
  onNav,
  onProfile,
  children,
}) {
  return (
    <div className="learn">
      <div className="learn__body">
        <Sidebar
          userName={userName}
          userLevel={userLevel}
          active={active}
          onNav={onNav}
          onProfile={onProfile}
        />
        <main className="learn__main">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
