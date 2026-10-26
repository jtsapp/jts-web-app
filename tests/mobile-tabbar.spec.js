import { test, expect } from '@playwright/test'

// Телефон по дизайну приложения (спека 2026-10-26): до 560px вместо бургера нижняя панель из пяти вкладок и экран
// «Сервисы». Планшет 561–760 — прежний бургер (mobile-shell.spec.js), компьютер — сайдбар.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником, как tests/lessons-schedule.spec.js.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
})

test.describe('нижняя панель — телефон', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только телефон')

  for (const screen of ['home', 'practice', 'lessons', 'vocab', 'services']) {
    test(`${screen}: панель видна, бургера и сайдбара нет`, async ({ page }) => {
      await page.goto(`/?screen=${screen}`)
      await expect(page.locator('.mtab')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('.mtab__item')).toHaveCount(5)
      await expect(page.locator('.mtop')).toBeHidden()
      await expect(page.locator('.sb')).toBeHidden()
    })
  }

  test('горит вкладка своего раздела, Словарь — внутри «Сервисов»', async ({ page }) => {
    await page.goto('/?screen=practice')
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'practice', { timeout: 15_000 })
    await page.goto('/?screen=vocab')
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'services', { timeout: 15_000 })
  })

  test('вкладки ведут в разделы, «Сервисы» — к плиткам', async ({ page }) => {
    await page.goto('/?screen=home')
    await page.locator('.mtab [data-tab="practice"]').click({ timeout: 15_000 })
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'practice')
    await page.locator('.mtab [data-tab="services"]').click()
    await expect(page.locator('.svc-grid')).toBeVisible()
    await page.locator('.svc-tile', { hasText: 'Словарь' }).click()
    await expect(page.locator('.vp')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.mtab__item.is-active')).toHaveAttribute('data-tab', 'services')
  })

  test('контент не уходит под панель', async ({ page }) => {
    await page.goto('/?screen=services')
    await expect(page.locator('.mtab')).toBeVisible({ timeout: 15_000 })
    const pad = await page.locator('.learn').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
    expect(pad).toBeGreaterThanOrEqual(58)
  })
})

test.describe('нижняя панель — компьютер', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'только широкий экран')

  test('панели нет, сайдбар на месте', async ({ page }) => {
    await page.goto('/?screen=home')
    await expect(page.locator('.sb')).toBeInViewport({ timeout: 15_000 })
    await expect(page.locator('.mtab')).toBeHidden()
  })
})
