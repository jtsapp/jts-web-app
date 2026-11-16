import { describe, it, expect } from 'vitest'
import { parseHosts } from './hostRouting.js'
import { indexable, jsonLdScript, organizationJsonLd, pageMetadata, robotsTxt, siteOrigin, sitemapXml, SITEMAP_PATHS } from './seo.js'

const landingHosts = parseHosts('justtostudy-english.kz,www.justtostudy-english.kz')
const ORIGIN = 'https://justtostudy-english.kz'

describe('адрес сайта и индексация', () => {
  it('на домене лендинга — его голый домен, www склеивается', () => {
    expect(siteOrigin({ host: 'justtostudy-english.kz', landingHosts })).toBe(ORIGIN)
    expect(siteOrigin({ host: 'www.justtostudy-english.kz', landingHosts })).toBe(ORIGIN)
  })
  it('вне домена лендинга (локально, дев) — прод из реквизитов, без индексации', () => {
    expect(siteOrigin({ host: 'localhost', landingHosts: parseHosts('') })).toBe(ORIGIN)
    expect(indexable({ host: 'dev-tutor.justtostudy.kz', landingHosts })).toBe(false)
    expect(indexable({ host: 'ai-tutor.justtostudy.kz', landingHosts })).toBe(false)
    expect(indexable({ host: 'justtostudy-english.kz', landingHosts })).toBe(true)
  })
})

describe('метаданные страницы', () => {
  const meta = (lang, path = '/') => pageMetadata({ origin: ORIGIN, path, lang, title: 'T', description: 'D', index: true })

  it('canonical — своя версия языка, hreflang связывает ru и kk', () => {
    expect(meta('ru').alternates).toEqual({
      canonical: `${ORIGIN}/`,
      languages: { ru: `${ORIGIN}/`, kk: `${ORIGIN}/?lang=kz`, 'x-default': `${ORIGIN}/` },
    })
    expect(meta('kz').alternates.canonical).toBe(`${ORIGIN}/?lang=kz`)
    expect(meta('kz', '/info/tariffs').alternates.languages.kk).toBe(`${ORIGIN}/info/tariffs?lang=kz`)
  })
  it('превью ссылки: картинка своего языка 1200×630, абсолютным адресом', () => {
    expect(meta('ru').openGraph.images[0]).toMatchObject({ url: `${ORIGIN}/landing/og.png`, width: 1200, height: 630 })
    expect(meta('kz').openGraph.images[0].url).toBe(`${ORIGIN}/landing/og-kz.png`)
    expect(meta('kz').openGraph.locale).toBe('kk_KZ')
    expect(meta('ru').twitter.card).toBe('summary_large_image')
  })
  it('вне домена лендинга — noindex', () => {
    const m = pageMetadata({ origin: ORIGIN, path: '/', lang: 'ru', title: 'T', description: 'D', index: false })
    expect(m.robots).toEqual({ index: false, follow: false })
  })
})

describe('robots.txt и sitemap.xml', () => {
  it('домен лендинга открыт и указывает карту и главное зеркало', () => {
    const txt = robotsTxt({ origin: ORIGIN, index: true })
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Disallow: /api/')
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    expect(txt).toContain(`Host: ${ORIGIN}`)
  })
  it('прочие домены закрыты целиком', () => {
    expect(robotsTxt({ origin: ORIGIN, index: false })).toBe('User-agent: *\nDisallow: /\n')
  })
  it('карта — каждая страница на двух языках, с парой hreflang', () => {
    const xml = sitemapXml(ORIGIN)
    expect(xml.match(/<url>/g)).toHaveLength(SITEMAP_PATHS.length * 2)
    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`)
    expect(xml).toContain(`<loc>${ORIGIN}/info/contacts?lang=kz</loc>`)
    expect(xml).toContain(`hreflang="kk" href="${ORIGIN}/info/refund?lang=kz"`)
    expect(xml).not.toMatch(/&(?!amp;)/)
  })
})

describe('разметка schema.org', () => {
  it('школа с названием, контактами и городом; адрес ИП не публикуется', () => {
    const ld = organizationJsonLd({ origin: ORIGIN, description: 'D' })
    const org = ld['@graph'][0]
    expect(org).toMatchObject({ '@type': 'EducationalOrganization', name: 'Just to Study', url: `${ORIGIN}/` })
    expect(org.telephone).toMatch(/^\+7\d{10}$/)
    expect(org.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Алматы', addressCountry: 'KZ' })
  })
  it('json в <script> не закрывает тег', () => {
    expect(jsonLdScript({ a: '</script><b>' })).not.toContain('</script>')
  })
})
