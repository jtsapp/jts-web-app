import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Удаление аккаунта (требование App Store): подтверждение отдельным шагом, один DELETE /user/me, после 200 —
// сессия стёрта, экран «Аккаунт удалён», дальше приветствие. Телефон — экраны дизайна приложения (профиль →
// шестерёнка → «Удалить аккаунт»), компьютер — та же форма окном под «Выйти из аккаунта».

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function withDelete(page, status = 200) {
  const calls = []
  await loginAsStudent(page, { level: 'B1' })
  // После loginAsStudent: в Playwright выигрывает последний зарегистрированный маршрут.
  await page.route(/justtostudy\.kz\/user\/me(\?|$)/, (r) => {
    if (r.request().method() !== 'DELETE') return r.fallback()
    calls.push(r.request().headers().authorization)
    return r.fulfill(status === 200 ? json({ success: true }) : json({ messages: ['x'] }, status))
  })
  return calls
}

async function openConfirm(page, viewport) {
  await page.goto('/?screen=profile')
  if ((viewport?.width ?? 0) <= 560) {
    await page.getByRole('button', { name: 'Настройки' }).click({ timeout: 20_000 })
    await page.locator('.pfm-out__del').click()
  } else {
    await page.locator('.pf-delete-link').click({ timeout: 20_000 })
  }
  await expect(page.getByText('Удалить аккаунт навсегда?')).toBeVisible()
}

test('удаление: один запрос, «Аккаунт удалён», затем приветствие без сессии', async ({ page, viewport }) => {
  const calls = await withDelete(page)
  await openConfirm(page, viewport)
  expect(calls).toHaveLength(0)

  await page.locator('.pfd-del').dblclick()
  await expect(page.getByText('Аккаунт удалён')).toBeVisible()
  expect(calls).toEqual(['Bearer test-token'])
  expect(await page.evaluate(() => localStorage.getItem('jts_access_token'))).toBeNull()

  await page.getByText('На главную').click()
  await expect(page.locator('.pfdone')).toHaveCount(0)
  await expect(page.getByText('Войти').first()).toBeVisible()
})

test('403: аккаунт сотрудника — объяснение, сессия на месте', async ({ page, viewport }) => {
  const calls = await withDelete(page, 403)
  await openConfirm(page, viewport)
  await page.locator('.pfd-del').click()
  await expect(page.locator('.pfd-err')).toHaveText('Аккаунт сотрудника удаляет администратор. Напишите в службу поддержки.')
  expect(calls).toHaveLength(1)
  expect(await page.evaluate(() => localStorage.getItem('jts_access_token'))).toBe('test-token')
})
