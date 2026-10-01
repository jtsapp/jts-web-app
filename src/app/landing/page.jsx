// Лендинг — отдельный маршрут рядом с SPA (src/app/page.jsx → App.jsx).
// Отдельный, а не экран внутри App: странице нужны настоящий серверный HTML
// и свои метаданные для поисковиков, а экраны SPA рисуются только на клиенте
// после гидратации.
import '../../landing.css'
import Landing from '../../landing/Landing.jsx'
import { pickContent } from '../../landing/content.js'

export const metadata = {
  title: 'Just to Study — индивидуальные уроки английского по цене групповых',
  description:
    'Уроки с преподавателем, AI-тьютор 24/7, сказки, книги, комиксы и караоке — всё для английского в одном месте. Бесплатный доступ на 24 часа.',
}

export default async function LandingPage({ searchParams }) {
  const sp = await searchParams
  const lang = sp?.lang === 'kz' ? 'kz' : 'ru'
  return (
    <>
      {/* Шрифты макета: Onest — вся страница, Geist — подвал. React 19 сам
          поднимает stylesheet с precedence в <head>, поэтому они не уходят в
          общий layout и не грузятся экранами приложения. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;900&family=Geist:wght@400;500&display=swap" />
      <Landing c={pickContent(lang)} lang={lang} />
    </>
  )
}
