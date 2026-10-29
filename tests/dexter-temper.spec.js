import { test, expect } from '@playwright/test'

// Кнопка 18+ у Декстера (29.10.2026): без неё — «свой пацан», с ней — хулиган.
// Нрав у каждого тьютора свой: кнопка Декстера не трогает Спарка, а в профиль
// уходит словарь tutorTempers только с Декстером. Профиль и вход подменены.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, tutorTempers) {
  const posts = []
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  await page.route(/\/api\/profile(\?|$)/, (r) => {
    if (r.request().method() === 'POST') {
      posts.push(r.request().postDataJSON())
      return r.fulfill(json({ configured: true, ok: true }))
    }
    return r.fulfill(
      json({ configured: true, profile: { deviceId: 'user-7', tutor: 'dexter', tutorTemper: 'harsh', tutorTempers } }),
    )
  })
  return posts
}

test('Декстер: 18+ по умолчанию выключена, включается только у него', async ({ page }) => {
  // Спарк уже злой (старая колонка → его нрав), у Декстера записи нет.
  const posts = await setup(page, { spark: 'harsh' })
  await page.goto('/?screen=tutor-manage')
  const toggle = page.locator('.t-adult')
  await expect(toggle).toBeVisible({ timeout: 30000 })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => posts.find((b) => b.tutorTempers)).toBeTruthy()
  const saved = posts.find((b) => b.tutorTempers)
  expect(saved.tutorTempers).toEqual({ dexter: 'harsh' })
  expect(saved).not.toHaveProperty('tutorTemper')
})

test('Декстер: сохранённый хулиган встаёт после перезагрузки', async ({ page }) => {
  await setup(page, { dexter: 'harsh' })
  await page.goto('/?screen=tutor-manage')
  const toggle = page.locator('.t-adult')
  await expect(toggle).toBeVisible({ timeout: 30000 })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})
