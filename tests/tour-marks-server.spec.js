import { test, expect } from '@playwright/test'
import { FRESH_PROFILE, signIn } from './tour-helper.js'

// Отметки туров на аккаунте (lib/tourMarks.js, /api/profile/tours). До 28.10.2026 отметка жила только в
// браузере под ключом из профиля или device-id, и туры выходили по нескольку раз: после теста уровня
// (ключ менялся), на другом устройстве, после гонки входа. Сервер здесь подменён — проверяем, что
// приложение ему верит, пишет туда конец тура и переносит отметки прежней схемы.
test.use(FRESH_PROFILE)

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function serveTours(page, tours) {
  const posts = []
  await page.route('**/api/profile/tours**', (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      posts.push(req.postDataJSON())
      return route.fulfill(json({ configured: true, ok: true }))
    }
    return route.fulfill(json({ configured: true, tours }))
  })
  return posts
}

async function openPractice(page) {
  await page.goto('/?screen=practice')
  await expect(page.locator('.pk')).toBeVisible({ timeout: 15000 })
}

test.beforeEach(({ page }) => signIn(page))

test('тур, пройденный на другом устройстве, здесь не выходит', async ({ page }) => {
  await serveTours(page, ['practice'])
  await openPractice(page)
  await page.waitForTimeout(1000)
  await expect(page.locator('.t-tour__intro, .t-tour__pop')).toHaveCount(0)
})

test('конец тура уходит на сервер, и в чистом браузере тур больше не выходит', async ({ page }) => {
  const posts = await serveTours(page, [])
  await openPractice(page)
  await page.locator('.t-tour__intro-skip').click()
  await expect(page.locator('.t-tour__intro')).toHaveCount(0)
  await expect.poll(() => posts).toEqual([{ tours: ['practice'] }])

  // «Другой браузер»: localStorage пуст, отметка есть только на сервере.
  await page.evaluate(() => localStorage.removeItem('jts_tour_practice:user-7'))
  await page.unroute('**/api/profile/tours**')
  await serveTours(page, ['practice'])
  await openPractice(page)
  await page.waitForTimeout(1000)
  await expect(page.locator('.t-tour__intro, .t-tour__pop')).toHaveCount(0)
})

// Главный повтор до правки: новый ученик видел тур, пока у него не было профиля, — отметка легла под
// device-id. Теперь ключ по аккаунту, и такая отметка засчитывается и переезжает на сервер.
test('отметка под device-id прежней схемы засчитывается и уезжает на сервер', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jts_device_id', 'dev-e2e')
    localStorage.setItem('jts_tour_practice:dev-e2e', '1')
  })
  const posts = await serveTours(page, [])
  await openPractice(page)
  await page.waitForTimeout(1000)
  await expect(page.locator('.t-tour__intro, .t-tour__pop')).toHaveCount(0)
  await expect.poll(() => posts).toEqual([{ tours: ['practice'] }])
})
