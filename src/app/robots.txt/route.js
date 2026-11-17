// robots.txt по домену запроса: домен лендинга открыт и даёт ссылку на
// sitemap, остальные (приложение, дев-стенды) закрыты целиком. Правила —
// src/landing/seo.js. Динамический: домены задаёт env (LANDING_HOSTS).
import { headers } from 'next/headers'
import { parseHosts, requestHost } from '../../landing/hostRouting.js'
import { indexable, robotsTxt, siteOrigin } from '../../landing/seo.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const host = requestHost(await headers())
  const landingHosts = parseHosts(process.env.LANDING_HOSTS)
  const index = indexable({ host, landingHosts })
  return new Response(robotsTxt({ origin: siteOrigin({ host, landingHosts }), index }), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
