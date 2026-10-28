import { expect } from '@playwright/test'

// Прогон целиком идёт с погашенными турами (storageState в playwright.config.js):
// тур — модалка и перехватывает клики у тестов про другое. Тестам самого тура
// нужен наоборот чистый профиль — они объявляют его через test.use(FRESH_PROFILE).
export const FRESH_PROFILE = { storageState: { cookies: [], origins: [] } }

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

// Гостя приложение уводит на лендинг, и тур экрана он не увидит — входим учеником.
// Бэкенд JTS подменён: профиль, остальное — пустые ответы (как в home-goal.spec.js).
export async function signIn(page) {
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A1', isDemoAccount: false }
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
}

// Номер шага и их число: прежний вид пишет «2/7», вид coach («Главная», «Практика») — точками.
async function tourProgress(page) {
  const count = page.locator('.t-tour__count')
  if (await count.count()) {
    const [k, n] = (await count.textContent()).split('/').map(Number)
    return { k, n }
  }
  const dots = page.locator('.t-tour__dots i')
  const k = await dots.evaluateAll((els) => els.findIndex((el) => el.classList.contains('is-on')) + 1)
  return { k, n: await dots.count() }
}

// Идём по всем шагам тура, проверяя геометрию на каждом. Возвращает число шагов.
export async function walkTour(page, viewport) {
  await page.waitForSelector('.t-tour__pop, .t-tour__intro', { timeout: 20000 })
  // Вид coach начинается приветствием — шаги идут после «Показать».
  if (await page.locator('.t-tour__intro').count()) {
    await page.locator('.t-tour__intro-go').click()
    await page.waitForSelector('.t-tour__pop', { timeout: 20000 })
  }
  const total = (await tourProgress(page)).n
  expect(total).toBeGreaterThan(1)

  for (let step = 1; ; step++) {
    await page.waitForTimeout(500) // transition поповера между шагами
    // Шаги без своего элемента тур пропускает сам, и последние из них могут
    // отпасть все разом — тогда он просто закрывается (см. OnboardingTour).
    if (!(await page.locator('.t-tour__pop').count())) return total
    const { pop, hole, overlap } = await page.evaluate(() => {
      const pop = document.querySelector('.t-tour__pop').getBoundingClientRect()
      const hole = document.querySelector('.t-tour__hole')?.getBoundingClientRect()
      const overlap =
        hole &&
        !(pop.right < hole.left || pop.left > hole.right || pop.bottom < hole.top || pop.top > hole.bottom)
      return { pop: { t: pop.top, b: pop.bottom, l: pop.left, r: pop.right }, hole: Boolean(hole), overlap }
    })
    expect(pop.t, `шаг ${step}: поповер вылез за верх`).toBeGreaterThanOrEqual(0)
    expect(pop.b, `шаг ${step}: поповер вылез за низ`).toBeLessThanOrEqual(viewport.height + 1)
    expect(pop.l, `шаг ${step}: поповер вылез за левый край`).toBeGreaterThanOrEqual(0)
    expect(pop.r, `шаг ${step}: поповер вылез за правый край`).toBeLessThanOrEqual(viewport.width + 1)
    expect(hole, `шаг ${step}: нет прожектора`).toBe(true)
    expect(overlap, `шаг ${step}: поповер накрывает подсвеченный элемент`).toBe(false)

    // Заголовок и текст шага — из словаря, а не ключи (i18n.jsx, зона useI18n).
    expect(await page.locator('.t-tour__title').textContent()).not.toContain('tour.')
    expect(await page.locator('.t-tour__text').textContent()).not.toContain('tour.')

    const isLast = (await tourProgress(page)).k === total
    await page.locator('.t-tour__ok').click()
    if (isLast) break
  }

  await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  // Скролл страницы тур запирал — после закрытия он снова свободен.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  return total
}
