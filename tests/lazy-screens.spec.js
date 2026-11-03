import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'
import { openSection } from './helpers/nav.js'

// Экраны грузятся по требованию (src/lib/lazyScreen.js). Здесь то, что юнит-тестом не проверить: настоящий чанк, настоящая
// гидратация и настоящая перезагрузка страницы.

const PRACTICE = '.pk'
const NAV = '.mtab:visible, .sb__nav:visible'

// «Hydration failed» приходит как pageerror, а не console.error, поэтому слушаем оба.
function watchHydration(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text())
  })
  return errors
}

// Адреса чанков, которые страница уже получила: всё, что новее, — чанк экрана, куда ещё не заходили.
function trackChunks(page) {
  const seen = new Set()
  page.on('response', (r) => {
    if (r.url().includes('/_next/static/') && r.ok()) seen.add(r.url())
  })
  return seen
}

test.describe('ленивые экраны', () => {
  test('диплинк открывает экран, гидратация без ошибок', async ({ page }) => {
    const errors = watchHydration(page)
    await loginAsStudent(page)
    await page.goto('/?screen=practice')
    await expect(page.locator(PRACTICE)).toBeVisible({ timeout: 30_000 })
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
  })

  test('гость: экран входа открывается без ошибок гидратации', async ({ page }) => {
    const errors = watchHydration(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Регистрация' }).first()).toBeVisible({ timeout: 30_000 })
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
  })

  test('пока чанк едет — заглушка в оболочке, меню остаётся', async ({ page }) => {
    const chunks = trackChunks(page)
    await loginAsStudent(page)
    await page.goto('/?screen=home')
    await expect(page.locator(NAV).first()).toBeVisible({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')

    await page.route('**/_next/static/**', async (route) => {
      if (!chunks.has(route.request().url())) await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fallback()
    })
    await openSection(page, 'Практика')

    await expect(page.locator('.scr-in [role="status"][aria-busy="true"]')).toBeVisible()
    await expect(page.locator(NAV).first()).toBeVisible()
    await expect(page.locator(PRACTICE)).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.scr-in [role="status"][aria-busy="true"]')).toHaveCount(0)
  })

  test('чанк пропал после выката: одна перезагрузка, потом просьба обновить, и экран восстанавливается', async ({ page }) => {
    const chunks = trackChunks(page)
    await loginAsStudent(page)
    await page.goto('/?screen=home')
    await expect(page.locator(NAV).first()).toBeVisible({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')

    let deployed = true
    let loads = 0
    page.on('load', () => loads++)
    await page.route('**/_next/static/**', (route) => {
      if (deployed && !chunks.has(route.request().url())) return route.fulfill({ status: 404, body: 'not found' })
      return route.fallback()
    })
    await openSection(page, 'Практика')

    const failed = page.getByRole('alert').filter({ hasText: 'Экран не загрузился' })
    await expect(failed).toBeVisible({ timeout: 30_000 })
    expect(loads).toBe(1)

    deployed = false
    await failed.getByRole('button').click()
    await expect(page.locator(PRACTICE)).toBeVisible({ timeout: 30_000 })
    await expect(failed).toHaveCount(0)
  })

  test('язык из хранилища: кабинет сразу на нём, без ошибок гидратации', async ({ page }) => {
    const errors = watchHydration(page)
    await page.addInitScript(() => localStorage.setItem('lang', 'kk'))
    await loginAsStudent(page)
    await page.goto('/?screen=home')
    await expect(page.locator('html')).toHaveAttribute('data-ui-lang', 'kk')
    await expect(page.locator('body')).toContainText('Тәжірибе', { timeout: 30_000 })
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
  })
})
