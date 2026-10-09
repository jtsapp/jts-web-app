// Развилка по домену: лендинг — только на своём домене (LANDING_HOSTS), всё
// остальное — приложение. Правило целиком в src/landing/hostRouting.js и
// накрыто тестом; здесь только перевод решения в ответ Next.
//
// Proxy (бывший middleware в Next 16) по умолчанию идёт в Node-рантайме,
// поэтому env читается на каждом запросе — менять домены можно переменными
// окружения без пересборки образа.
import { NextResponse } from 'next/server'
import { cleanEnv, normalizeAppUrl, parseHosts, requestHost, routeLanding, sameHostUrl } from './landing/hostRouting.js'

export function proxy(request) {
  const url = request.nextUrl
  const decision = routeLanding({
    host: requestHost(request.headers),
    pathname: url.pathname,
    search: url.search,
    landingHosts: parseHosts(process.env.LANDING_HOSTS),
    appUrl: normalizeAppUrl(process.env.APP_PUBLIC_URL),
    // Посмотреть /landing на дев-стенде до того, как домен заведён.
    preview: cleanEnv(process.env.LANDING_PREVIEW) === '1',
  })
  switch (decision.action) {
    case 'rewrite':
      return NextResponse.rewrite(new URL(decision.to, url))
    case 'redirect':
      // Путь на своём домене — адрес из заголовков nginx (см. sameHostUrl),
      // полный адрес (приложение) — как есть. 307, а не постоянный 308:
      // решение зависит от env (LANDING_HOSTS, APP_PUBLIC_URL), а 308 браузер
      // запомнит и после того, как env поменяют или лендинг откатят.
      return NextResponse.redirect(
        decision.to.startsWith('/') ? sameHostUrl(request.headers, decision.to) : decision.to,
        307,
      )
    case 'notFound':
      // Несуществующий путь — Next отдаёт свою 404 с верным статусом.
      return NextResponse.rewrite(new URL('/_landing-not-here', url))
    default:
      return NextResponse.next()
  }
}

export const config = {
  // Статика бандла домену не важна — ей прокси не нужен вовсе. /api — тоже:
  // при живом proxy Next буферизует тело КАЖДОГО запроса под ним с потолком
  // 10 МБ (proxyClientMaxBodySize) и молча обрезает остальное, а Шэдоуинг и
  // распознавание шлют записи до 30 МБ — длинная запись приходила бы битой.
  // Ручкам лендинга (/api/landing/*) прокси и не нужен: они отдаются как есть.
  matcher: ['/((?!_next/static|_next/image|api/).*)'],
}
