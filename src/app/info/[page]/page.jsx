// Страницы для покупателя: /info/tariffs, /info/payment, /info/refund,
// /info/contacts. Их требует Freedom Pay до подключения оплаты и проверяет на
// публичном домене без входа — поэтому это серверные страницы рядом с
// лендингом (его шапка, подвал и стили), а не экраны SPA, которые рисуются
// только после гидратации. Тексты — src/landing/info.js.
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import '../../../landing.css'
import { Footer, Header } from '../../../landing/Landing.jsx'
import InfoContent from '../../../landing/InfoContent.jsx'
import { APP_LOGIN_URL, pickContent } from '../../../landing/content.js'
import { INFO_PAGES, pickInfo } from '../../../landing/info.js'
import { appLink, normalizeAppUrl, parseHosts, requestHost } from '../../../landing/hostRouting.js'
import { BACKEND_URL } from '../../../lib/auth-server.js'

async function langOf(searchParams) {
  const sp = await searchParams
  return sp?.lang === 'kz' ? 'kz' : 'ru'
}

export async function generateMetadata({ params, searchParams }) {
  const { page } = await params
  if (!INFO_PAGES.includes(page)) return {}
  const info = pickInfo(await langOf(searchParams))
  return { title: `${info[page].title} — Just to Study`, description: info[page].lead }
}

// Прайс — с бэкенда (GET /catalog/offers, публично), как и на витрине
// приложения: по нему сервер считает сумму заказа, и вторая копия цен здесь
// означала бы, что человек видит одно, а платит другое. Кэш на 5 минут —
// правка цены в админке доезжает быстро, а бэкенд не дёргается на каждый
// заход. Бэкенд не ответил — null, страница скажет это словами.
async function loadOffers() {
  try {
    const res = await fetch(`${BACKEND_URL}/catalog/offers`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export default async function InfoPage({ params, searchParams }) {
  const { page } = await params
  if (!INFO_PAGES.includes(page)) notFound()
  const lang = await langOf(searchParams)

  const landingHosts = parseHosts(process.env.LANDING_HOSTS)
  const host = requestHost(await headers())
  const onLandingHost = landingHosts.has(host)
  const appUrl = normalizeAppUrl(process.env.APP_PUBLIC_URL)
  // Главная — лендинг: на его домене это корень, на домене приложения —
  // первый домен из LANDING_HOSTS, без него (локально, dev) — /landing.
  const firstLandingHost = [...landingHosts][0]
  const home = onLandingHost ? '/' : firstLandingHost ? `https://${firstLandingHost}/` : '/landing'
  const homeWithLang = lang === 'kz' ? `${home}?lang=kz` : home
  const links = {
    login: appLink(APP_LOGIN_URL, { onLandingHost, appUrl }),
    langRu: '?lang=ru',
    langKz: '?lang=kz',
  }
  const offers = page === 'tariffs' ? await loadOffers() : null

  return (
    <>
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;900&family=Geist:wght@400;500&display=swap" />
      <div className="ld" id="top" lang={lang === 'kz' ? 'kk' : 'ru'}>
        <Header c={pickContent(lang)} lang={lang} links={links} home={homeWithLang} />
        <main className="ld-info">
          <InfoContent page={page} lang={lang} offers={offers} home={homeWithLang} />
        </main>
        <Footer c={pickContent(lang)} lang={lang} home={homeWithLang} />
      </div>
    </>
  )
}
