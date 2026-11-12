// Лендинг живёт на своём домене (justtostudy-english.kz), а приложение — на
// своём, но сборка и контейнер у них ОДНИ: поднимать второй экземпляр ради
// одной страницы — двойной расход ресурсов (решение 03.10.2026). Поэтому
// развилка по домену — здесь, в src/proxy.js, а не в отдельной ветке.
//
// Чистые функции без next/server — чтобы правило накрывалось юнит-тестом.

// Что домену лендинга отдаём как есть: бандл Next, картинки лендинга,
// иконка вкладки (/assets/dexter-icon.png из общего layout), шрифты и ручки самого
// лендинга — POST формы, уведённый редиректом на другой домен, браузер не
// повторит (CORS), и заявка тихо пропала бы. /info/ — страницы для покупателя
// (тарифы, оплата, возврат, контакты): их проверяет платёжный провайдер на
// публичном домене, поэтому они живут здесь, а не в приложении.
// /api/ — целиком: оформление заказа (см. CHECKOUT_SCREENS) идёт приложением на
// этом же домене, и его вход, профиль и прочие роуты должны отвечать здесь, а не
// уводиться на домен приложения (fetch за редиректом на чужой домен ломает CORS).
const PASS_PREFIXES = ['/_next/', '/landing/', '/assets/', '/legal/', '/fonts/', '/api/', '/info/']

// Экраны приложения, которые открываются на домене лендинга, а не уводятся:
// оформление и оплата заказа. Freedom Pay принимает оплату на домене из анкеты
// и публичных документов (оферта, политика) — это justtostudy-english.kz
// (решение владельца 10.11.2026). Вход здесь — свой: localStorage у доменов разный.
export const CHECKOUT_SCREENS = new Set(['pricing', 'minutes'])
const PASS_FILES = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml'])

// Короткая ссылка рекламы: justtostudy-english.kz/имя → лендинг с UTM-метками
// этой ссылки (их заводит маркетинг в «Настройки CRM → Короткие ссылки»).
// Правило имени — как на бэкенде (CrmShortLinkValidator.SLUG), а занятые
// адреса сайта — как его RESERVED: держать в согласии.
const SHORT_LINK = /^\/([a-z0-9][a-z0-9_-]{1,39})\/?$/i
export const SHORT_LINK_RESERVED = new Set(['_next', 'api', 'assets', 'fonts', 'info', 'landing', 'legal',
  'favicon.ico', 'robots.txt', 'sitemap.xml', 'complete-registration', 'report', 'trial', 'wake-lab',
  'arcade', 'course', 'demo', 'exam', 'ielts', 'learning', 'placement', 'practice', 'sat', 'shadowing',
  'tutor', 'vocab', 'pricing', 'minutes', 'login', 'admin', 'pay', 'payment', 'app'])

/** Имя короткой ссылки из пути («/Dana/» → «dana») или null. */
export function shortLinkSlug(pathname) {
  const m = SHORT_LINK.exec(pathname)
  const slug = m && m[1].toLowerCase()
  return slug && !SHORT_LINK_RESERVED.has(slug) ? slug : null
}

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
    const screen = pathname === '/' ? new URLSearchParams(search).get('screen') : null
    if (pathname === '/' && !screen) return { action: 'rewrite', to: '/landing' + search }
    if (CHECKOUT_SCREENS.has(screen)) return { action: 'next' }
    if (PASS_FILES.has(pathname) || PASS_PREFIXES.some((p) => pathname.startsWith(p))) return { action: 'next' }
    // Короткая ссылка: ищет её серверный роут (ключ бэкенда в браузер не попадает).
    const slug = shortLinkSlug(pathname)
    if (slug) return { action: 'rewrite', to: `/api/landing/go/${slug}${search}` }
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

/**
 * Где оформлять заказ: на домене лендинга (первый из LANDING_HOSTS). Уже на нём
 * или доменов лендинга нет (локально, дев без лендинга) — здесь же, null.
 */
export function checkoutOrigin({ onLandingHost, landingHosts }) {
  const first = [...landingHosts][0]
  return onLandingHost || !first ? null : `https://${first}`
}
