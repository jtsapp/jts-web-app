// Лендинг живёт на своём домене (justtostudy-english.kz), а приложение — на
// своём, но сборка и контейнер у них ОДНИ: поднимать второй экземпляр ради
// одной страницы — двойной расход ресурсов (решение 03.10.2026). Поэтому
// развилка по домену — здесь, в src/proxy.js, а не в отдельной ветке.
//
// Чистые функции без next/server — чтобы правило накрывалось юнит-тестом.

// Что домену лендинга отдаём как есть: бандл Next, картинки лендинга,
// иконка вкладки (/assets/dexter.png из общего layout), шрифты и ручки самого
// лендинга — POST формы, уведённый редиректом на другой домен, браузер не
// повторит (CORS), и заявка тихо пропала бы.
const PASS_PREFIXES = ['/_next/', '/landing/', '/assets/', '/fonts/', '/api/landing/']
const PASS_FILES = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml'])

// Локальная разработка видит /landing всегда — иначе страницу не посмотреть.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/

const clean = (v) => String(v ?? '').replace(/^\uFEFF/, '').trim()

// Значение env без BOM и пробелов — общий помощник серверной части лендинга.
export const cleanEnv = clean

function bareHost(value) {
  // «JustToStudy-English.kz:443» → «justtostudy-english.kz»; IPv6 в скобках
  // оставляем целиком.
  const h = clean(value).toLowerCase()
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1)
  return h.replace(/:\d+$/, '')
}

// LANDING_HOSTS — домены через запятую. BOM вырезаем, как у всех env: значение
// из Windows-пайпа приходит с U+FEFF (инцидент с BACKEND_URL 17.07.2026).
export function parseHosts(raw) {
  return new Set(clean(raw).split(',').map(bareHost).filter(Boolean))
}

// nginx перед приложением ставит X-Forwarded-Host; Host до приложения может
// доехать уже адресом апстрима (127.0.0.1:порт). `headers` — Headers или Map.
export function requestHost(headers) {
  const fwd = clean(headers.get('x-forwarded-host')).split(',')[0]
  return bareHost(fwd || headers.get('host'))
}

// Абсолютный адрес на том же домене для редиректа из proxy. Собирать его из
// request.url нельзя: за nginx тот указывает на апстрим (http://127.0.0.1:порт),
// а относительный Location Next в proxy не пропускает (Invalid URL).
// Протокол — из X-Forwarded-Proto, по умолчанию https: домен лендинга
// публичный, и по http его отдаёт разве что сам nginx редиректом.
export function sameHostUrl(headers, path) {
  const proto = clean(headers.get('x-forwarded-proto')).split(',')[0] || 'https'
  return `${proto}://${requestHost(headers)}${path}`
}

export function normalizeAppUrl(raw) {
  return clean(raw).replace(/\/+$/, '')
}

/**
 * Что делать с запросом. Возвращает одно из:
 *   { action: 'next' }                — не трогать
 *   { action: 'rewrite', to }         — отдать другую страницу под тем же адресом
 *   { action: 'redirect', to }        — увести (to — путь или полный адрес)
 *   { action: 'notFound' }            — 404
 */
export function routeLanding({ host, pathname, search = '', landingHosts, appUrl = '', preview = false }) {
  if (landingHosts.has(host)) {
    if (pathname === '/landing') return { action: 'redirect', to: '/' + search }
    const isAppScreen = pathname === '/' && new URLSearchParams(search).has('screen')
    if (pathname === '/' && !isAppScreen) return { action: 'rewrite', to: '/landing' + search }
    if (PASS_FILES.has(pathname) || PASS_PREFIXES.some((p) => pathname.startsWith(p))) return { action: 'next' }
    // Экран приложения на домене лендинга — уводим в приложение: вход
    // хранится в localStorage домена, и зарегистрированный здесь ученик
    // оказался бы разлогинен в приложении. Адреса приложения нет — лучше
    // отдать как есть, чем увести в никуда.
    return appUrl ? { action: 'redirect', to: appUrl + pathname + search } : { action: 'next' }
  }
  // Остальные домены: сама страница /landing скрыта (её картинки под
  // /landing/img — нет, они безвредны и нужны превью).
  if (pathname === '/landing' && !preview && !LOCAL.test(host)) return { action: 'notFound' }
  return { action: 'next' }
}

// «Войти» и переход после заявки: на домене лендинга относительная ссылка
// «/?screen=…» вернула бы на тот же лендинг, поэтому ведём на домен
// приложения. На самом приложении (и локально) — как было, относительно.
export function appLink(path, { onLandingHost, appUrl }) {
  return onLandingHost && appUrl ? appUrl + path : path
}
