// sitemap.xml — только на домене лендинга (главная и /info на двух языках с
// hreflang). На прочих доменах карты нет: они закрыты в robots.txt.
import { headers } from 'next/headers'
import { parseHosts, requestHost } from '../../landing/hostRouting.js'
import { indexable, siteOrigin, sitemapXml } from '../../landing/seo.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const host = requestHost(await headers())
  const landingHosts = parseHosts(process.env.LANDING_HOSTS)
  if (!indexable({ host, landingHosts })) return new Response('Not found', { status: 404 })
  return new Response(sitemapXml(siteOrigin({ host, landingHosts })), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
