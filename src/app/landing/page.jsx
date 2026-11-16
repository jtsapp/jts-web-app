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
import MetaPixel from '../../landing/MetaPixel.jsx'
import { metaPixelId } from '../../landing/metaPixel.js'
import { APP_LOGIN_URL, pickContent } from '../../landing/content.js'
import { appLink, normalizeAppUrl, parseHosts, requestHost } from '../../landing/hostRouting.js'
import { landingAppPath, pickUtm } from '../../lib/attribution.js'
import { indexable, jsonLdScript, organizationJsonLd, pageMetadata, siteOrigin } from '../../landing/seo.js'

// Язык — в адресе (?lang=kz), а не в localStorage: поисковик и ссылка из
// рекламы должны получать казахскую страницу сразу, с сервера.
async function langOf(searchParams) {
  const sp = await searchParams
  return sp?.lang === 'kz' ? 'kz' : 'ru'
}

// Адрес сайта и можно ли индексировать — по домену запроса (src/landing/seo.js):
// на домене лендинга canonical — его голый домен, на дев-превью страница noindex.
async function seoContext() {
  const host = requestHost(await headers())
  const landingHosts = parseHosts(process.env.LANDING_HOSTS)
  return { origin: siteOrigin({ host, landingHosts }), index: indexable({ host, landingHosts }) }
}

export async function generateMetadata({ searchParams }) {
  const lang = await langOf(searchParams)
  const { meta } = pickContent(lang)
  const { origin, index } = await seoContext()
  return pageMetadata({ origin, path: '/', lang, title: meta.title, description: meta.description, index })
}

export default async function LandingPage({ searchParams }) {
  const lang = await langOf(searchParams)
  const onLandingHost = parseHosts(process.env.LANDING_HOSTS).has(requestHost(await headers()))
  const appUrl = normalizeAppUrl(process.env.APP_PUBLIC_URL)
  // «Войти» уводит в приложение с from=landing и метками рекламы, что привела
  // сюда: иначе пришедший отсюда в amoCRM неотличим от пришедшего прямо в
  // приложение (src/lib/attribution.js). «Начать обучение» ведёт к форме
  // на этой же странице — ссылка ей не нужна.
  const utm = pickUtm(await searchParams)
  const links = {
    login: appLink(landingAppPath(APP_LOGIN_URL, utm), { onLandingHost, appUrl }),
    // ҚАЗ/РУС меняют только язык: голый «?lang=kz» стёр бы метки рекламы.
    langRu: '?' + new URLSearchParams({ lang: 'ru', ...utm }),
    langKz: '?' + new URLSearchParams({ lang: 'kz', ...utm }),
  }
  return (
    <>
      {/* Шрифты макета: Onest — вся страница, Geist — подвал. React 19 сам
          поднимает stylesheet с precedence в <head>, поэтому они не уходят в
          общий layout и не грузятся экранами приложения. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;900&family=Geist:wght@400;500&display=swap" />
      {/* Разметка schema.org: школа и сайт — поисковик связывает домен с названием. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd({
          origin: (await seoContext()).origin,
          description: pickContent(lang).meta.description,
        })) }}
      />
      <Landing c={pickContent(lang)} lang={lang} links={links} />
      {/* Meta Pixel — только на домене лендинга: на dev и в самом приложении учеников его нет,
          иначе в рекламную аудиторию попадали бы экраны кабинета и тестовые заявки. */}
      {onLandingHost && <MetaPixel pixelId={metaPixelId(process.env.META_PIXEL_ID)} />}
    </>
  )
}
