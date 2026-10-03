// Лендинг — отдельный маршрут рядом с SPA (src/app/page.jsx → App.jsx).
// Отдельный, а не экран внутри App: странице нужны настоящий серверный HTML
// и свои метаданные для поисковиков, а экраны SPA рисуются только на клиенте
// после гидратации.
//
// Снаружи адрес у неё — корень домена лендинга: туда её подставляет
// src/proxy.js, а на других доменах /landing отдаёт 404.
import { headers } from 'next/headers'
import '../../landing.css'
import Landing from '../../landing/Landing.jsx'
import { APP_LOGIN_URL, APP_START_URL, pickContent } from '../../landing/content.js'
import { appLink, normalizeAppUrl, parseHosts, requestHost } from '../../landing/hostRouting.js'

// Язык — в адресе (?lang=kz), а не в localStorage: поисковик и ссылка из
// рекламы должны получать казахскую страницу сразу, с сервера.
async function langOf(searchParams) {
  const sp = await searchParams
  return sp?.lang === 'kz' ? 'kz' : 'ru'
}

export async function generateMetadata({ searchParams }) {
  const { meta } = pickContent(await langOf(searchParams))
  return { title: meta.title, description: meta.description }
}

export default async function LandingPage({ searchParams }) {
  const lang = await langOf(searchParams)
  const onLandingHost = parseHosts(process.env.LANDING_HOSTS).has(requestHost(await headers()))
  const appUrl = normalizeAppUrl(process.env.APP_PUBLIC_URL)
  const links = {
    start: appLink(APP_START_URL, { onLandingHost, appUrl }),
    login: appLink(APP_LOGIN_URL, { onLandingHost, appUrl }),
  }
  return (
    <>
      {/* Шрифты макета: Onest — вся страница, Geist — подвал. React 19 сам
          поднимает stylesheet с precedence в <head>, поэтому они не уходят в
          общий layout и не грузятся экранами приложения. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;900&family=Geist:wght@400;500&display=swap" />
      <Landing c={pickContent(lang)} lang={lang} links={links} />
    </>
  )
}
