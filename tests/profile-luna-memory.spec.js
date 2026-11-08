import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// «Память Луны» в Профиле (ТЗ v2.0, 8.1): факты, которые Луна запомнила, видны ученику, каждый удаляется. Ручка
// /api/profile/luna-memory подменена — проверяем экран: список, удаление (DELETE своего id), пустой блок, телефон.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const FACTS = [
  { id: '11', fact: 'готовится к IELTS к маю', createdAt: '2026-11-07T10:00:00Z', expiresAt: '2026-12-07T10:00:00Z' },
  { id: '12', fact: 'боится говорить на уроках', createdAt: '2026-11-06T10:00:00Z', expiresAt: '2026-12-06T10:00:00Z' },
]

async function setup(page, { configured = true } = {}) {
  await mockGates(page)
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
  const facts = FACTS.map((f) => ({ ...f }))
  const deleted = []
  await page.route('**/api/profile/luna-memory**', async (r) => {
    const req = r.request()
    if (req.method() === 'DELETE') {
      const id = new URL(req.url()).searchParams.get('id')
      deleted.push(id)
      facts.splice(facts.findIndex((f) => f.id === id), 1)
      return r.fulfill(json({ configured: true, ok: true }))
    }
    return r.fulfill(json(configured ? { configured: true, facts } : { configured: false, facts: [] }))
  })
  return deleted
}

test.describe('Память Луны — компьютер', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 720, 'только широкий вьюпорт')

  test('факты видны, удаление убирает строку и зовёт DELETE со своим id', async ({ page }) => {
    const deleted = await setup(page)
    await page.goto('/?screen=profile')
    const block = page.locator('[data-luna-memory]')
    await expect(block).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.pf-label', { hasText: 'Память Луны' })).toBeVisible()
    await expect(block.locator('.pf-mem__item')).toHaveCount(2)
    await expect(block).toContainText('готовится к IELTS к маю')
    await expect(block.locator('.pf-mem__until').first()).toContainText('до 7 декабря')
    await block.locator('.pf-mem__item', { hasText: 'боится говорить' }).getByRole('button', { name: 'Удалить' }).click()
    await expect(block.locator('.pf-mem__item')).toHaveCount(1)
    await expect.poll(() => deleted).toEqual(['12'])
    await block.getByRole('button', { name: 'Удалить' }).click()
    await expect(block).toContainText('Луна пока ничего не запомнила')
  })

  test('без базы на стенде блока нет вовсе', async ({ page }) => {
    await setup(page, { configured: false })
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf-label', { hasText: 'Персонализация' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[data-luna-memory]')).toHaveCount(0)
  })
})

test.describe('Память Луны — телефон', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только телефон')

  test('Настройки → «Память Луны» → удалить', async ({ page }) => {
    const deleted = await setup(page)
    await page.goto('/?screen=profile')
    await expect(page.locator('.pfm-hero')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Настройки' }).click()
    const row = page.locator('.pfm-row', { hasText: 'Память Луны' })
    await expect(row).toBeVisible()
    await expect(row).toContainText('2')
    await row.click()
    await expect(page.locator('.pfm-nav__title')).toHaveText('Память Луны')
    const block = page.locator('[data-luna-memory]')
    await expect(block.locator('.pfm-mem__item')).toHaveCount(2)
    await block.locator('.pfm-mem__item').first().getByRole('button', { name: 'Удалить' }).click()
    await expect(block.locator('.pfm-mem__item')).toHaveCount(1)
    await expect.poll(() => deleted).toEqual(['11'])
  })
})
