// Вход учеником без бэкенда. С 23.10.2026 (c04db5d0) гостю кабинет не рисуется: любой ?screen=, кроме экранов
// входа, уводит на лендинг «Регистрация / Войти» (src/lib/guestLogin.js). Поэтому экраны кабинета e2e открывает
// учеником: токен в хранилище раньше первого скрипта страницы и мок /api/auth/me, которым App сверяет токен на
// старте и на каждый 401 (reportUnauthorized в lib/session.js) — пока он отвечает, ученика не разлогинивает.
// Телефон обязателен: без него приложение уводит на «Остался один шаг» (reg-google).
import { LEGAL_VERSION } from '../../src/lib/legalDocuments.js'

export const STUDENT = { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567' }

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

// С 29.10.2026 поверх кабинета два замка develop: «Документы платформы» (GET /user/legal-documents, версия
// сверяется с LEGAL_VERSION) и разделы тарифа (GET /cabinet/my-sections). На пустой ответ оба встают экраном
// поверх приложения, и любой спек со входом ловил их вместо своего экрана. Ответ — документы приняты,
// ограничений разделов не задано.
export function gateReply(url) {
  if (url.includes('/user/legal-documents')) return { version: LEGAL_VERSION, acceptedAt: '2026-10-29T10:00:00Z' }
  if (url.includes('/cabinet/my-sections')) return { known: false, allowed: [] }
  return null
}

export async function loginAsStudent(page, { level = 'A1', ...user } = {}) {
  const me = { ...STUDENT, languageLevel: level, ...user }
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: me })))
  // Гостя кабинет не ждал ни секунды, а у ученика спиннер старта висит, пока не ответят профиль тьютора
  // (/api/profile — его роут сам идёт в бэкенд) и бэкенд JTS: демо-статус по /user/me и уровень. Настоящий
  // dev-server отвечает когда как, и прогон ловил пустую страницу вместо тропы. Поэтому бэкенд подменён целиком,
  // как в tour-helper.js: профиль и уровень — ученика, модулей уроков нет (прогресс тропы — в localStorage),
  // остальное — пустые ответы.
  await page.route('**/api/profile?**', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json({ profile: null })) : r.fallback(),
  )
  await page.route(/justtostudy\.kz/, (r) => {
    const url = r.request().url()
    const gate = gateReply(url)
    if (gate) return r.fulfill(json(gate))
    if (url.includes('/user/language-level')) return r.fulfill(json({ languageLevel: level }))
    if (url.includes('/user/me')) return r.fulfill(json({ ...me, isDemoAccount: false }))
    if (url.includes('/mobile/lesson-modules')) return r.fulfill(json([]))
    return r.fulfill(json({}))
  })
}
