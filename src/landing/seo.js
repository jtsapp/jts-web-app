// Поисковики и превью ссылок для лендинга (16.11.2026). До этого у сайта не было
// robots.txt, sitemap.xml, canonical и Open Graph: www и голый домен отдавались
// двумя одинаковыми сайтами, казахская версия не была связана с русской, а ссылка
// в WhatsApp и Instagram приходила без картинки. По запросу «Just to Study» сайта
// в поиске не было вовсе.
//
// Главный адрес — голый домен (https://justtostudy-english.kz): он в анкете
// Freedom Pay, оферте и политике (COMPANY.site), и первым стоит в LANDING_HOSTS
// прода. www уводится на него в proxy (wwwRedirect в hostRouting.js).
//
// Чистые функции без next/* — правила накрыты тестом (seo.test.js).
import { COMPANY } from './company.js'
import { INFO_PAGES } from './info.js'

/** Голый домен без «www.»: «www.a.kz» → «a.kz». */
export const bareDomain = (host) => String(host || '').replace(/^www\./, '')

/**
 * Адрес сайта для canonical, sitemap и разметки. На домене лендинга — его же
 * голый домен, иначе (локально, превью на деве) — адрес из реквизитов: ссылки
 * поисковику всегда ведут на прод.
 */
export function siteOrigin({ host, landingHosts }) {
  if (host && landingHosts.has(host)) return `https://${bareDomain(host)}`
  return COMPANY.site.replace(/\/+$/, '')
}

/** Индексировать можно только домен лендинга: дев-стенды и приложение — нет. */
export const indexable = ({ host, landingHosts }) => Boolean(host && landingHosts.has(host))

const withLang = (path, lang) => (lang === 'kz' ? `${path}?lang=kz` : path)

/** Пары адресов страницы на двух языках: путь → { ru, kk }. */
export function pageUrls(origin, path) {
  return { ru: origin + withLang(path, 'ru'), kk: origin + withLang(path, 'kz') }
}

/**
 * Метаданные Next для страницы лендинга: canonical, hreflang, Open Graph,
 * карточка Twitter и robots. path — '/' или '/info/<страница>'.
 */
export function pageMetadata({ origin, path, lang, title, description, index }) {
  const urls = pageUrls(origin, path)
  const url = lang === 'kz' ? urls.kk : urls.ru
  const image = { url: `${origin}/landing/${lang === 'kz' ? 'og-kz' : 'og'}.png`, width: 1200, height: 630, alt: title }
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url, languages: { ru: urls.ru, kk: urls.kk, 'x-default': urls.ru } },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Just to Study',
      title,
      description,
      locale: lang === 'kz' ? 'kk_KZ' : 'ru_RU',
      alternateLocale: lang === 'kz' ? ['ru_RU'] : ['kk_KZ'],
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  }
}

/** Пути, которые отдаём поисковику: главная и страницы для покупателя. */
export const SITEMAP_PATHS = ['/', ...INFO_PAGES.map((p) => `/info/${p}`)]

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** sitemap.xml: у каждого адреса — пара на втором языке (hreflang). */
export function sitemapXml(origin) {
  const entries = SITEMAP_PATHS.flatMap((path) => {
    const urls = pageUrls(origin, path)
    const links = [
      `    <xhtml:link rel="alternate" hreflang="ru" href="${xmlEscape(urls.ru)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="kk" href="${xmlEscape(urls.kk)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(urls.ru)}"/>`,
    ].join('\n')
    const priority = path === '/' ? '1.0' : '0.5'
    return [urls.ru, urls.kk].map((loc) =>
      `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n${links}\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`)
  })
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + entries.join('\n') + '\n</urlset>\n'
}

/**
 * robots.txt. Домен лендинга открыт целиком, кроме служебного (ручки, экраны
 * приложения в адресе, короткие ссылки рекламы ведут на главную сами); прочие
 * домены (приложение, дев) закрыты: в поиске должен быть лендинг, а не экран
 * входа или копия дев-стенда.
 */
export function robotsTxt({ origin, index }) {
  if (!index) return 'User-agent: *\nDisallow: /\n'
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /*?screen=',
    'Disallow: /*&screen=',
    '',
    `Host: ${origin}`,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}

/**
 * Разметка schema.org: школа (EducationalOrganization) и сайт. Без неё поисковик
 * не связывает домен с названием «Just to Study», телефоном и городом.
 */
export function organizationJsonLd({ origin, description }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${origin}/#organization`,
        name: 'Just to Study',
        alternateName: ['JTS', 'Just To Study English'],
        url: `${origin}/`,
        logo: `${origin}/landing/icons/logo.svg`,
        image: `${origin}/landing/og.png`,
        description,
        email: COMPANY.email,
        telephone: COMPANY.phone.replace(/\s+/g, ''),
        // Только город: улица в реквизитах — адрес ИП, в карточку поисковика его не несём.
        address: { '@type': 'PostalAddress', addressLocality: 'Алматы', addressCountry: 'KZ' },
        areaServed: { '@type': 'Country', name: 'Kazakhstan' },
        knowsLanguage: ['ru', 'kk', 'en'],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: 'Just to Study',
        inLanguage: ['ru', 'kk'],
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  }
}

/** JSON для <script type="application/ld+json">: «<» экранируется, чтобы текст не закрыл тег. */
export const jsonLdScript = (data) => JSON.stringify(data).replace(/</g, '\\u003c')
