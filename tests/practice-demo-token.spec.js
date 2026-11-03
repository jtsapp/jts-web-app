import { test, expect } from '@playwright/test'

// Гостевая витрина «Практики» берёт токен У СЕРВЕРА.
//
// С 23.10.2026 гостя кабинет не ждёт: диплинк уводит его на вход. Пока экран грузился статически, он успевал смонтироваться на
// один кадр и завести демо-сессию впустую; с ленивой загрузкой (03.11.2026) гость уходит раньше, чем приехал чанк, и в сеть не
// ходит вовсе. Ручку и код экрана сторожат юнит-тесты, названные ниже, а здесь — что браузер сам не логинится.
//
// Раньше браузер логинился сам парой NEXT_PUBLIC_DEMO_PHONE /
// NEXT_PUBLIC_DEMO_PASSWORD со значениями по умолчанию прямо в коде — то есть
// пароль общего аккаунта уезжал в бандл и читался из исходников вкладки.
// Юнит-тесты (src/clientSecrets.test.js, src/app/api/practice/demo-token/
// route.test.js) стерегут одну сторону каждый; здесь проверяется стык: гость,
// открывший раздел, действительно ходит в новую ручку и НЕ ходит в /auth/login.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const jwt = () => {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, userId: 1 })}.s`
}

/** Гость: токена в localStorage нет, кэш демо-токена пуст. */
async function asGuest(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('jts_access_token')
    localStorage.removeItem('jts_demo_token')
  })
  // Раздел тянет несколько каталогов; пустых ответов достаточно, чтобы экран
  // отрисовался и не ждал живой бэкенд.
  await page.route(/\/mobile\/(comics|karaoke|media-clips|audiobooks|tales)/, (r) => r.fulfill(json([])))
}

test('гость на диплинке уходит на вход: сам не логинится и демо-сессию впустую не заводит', async ({ page }) => {
  await asGuest(page)

  const логины = []
  await page.route('**/auth/login', (r) => { логины.push(r.request().url()); r.fulfill(json({ accessToken: jwt() })) })

  const запросы = []
  await page.route('**/api/practice/demo-token', (r) => {
    запросы.push(r.request().method())
    return r.fulfill(json({ accessToken: jwt() }))
  })

  await page.goto('/?screen=practice')
  await expect(page.getByRole('button', { name: 'Регистрация' }).first()).toBeVisible({ timeout: 30_000 })

  expect(запросы).toEqual([])
  // И главное: пароля браузер больше не знает, поэтому в /auth/login не ходит.
  expect(логины).toEqual([])
})

test('стенд без демо-доступа не роняет раздел: 503 — это «витрины нет»', async ({ page }) => {
  await asGuest(page)
  await page.route('**/api/practice/demo-token', (r) =>
    r.fulfill(json({ error: 'demo access is not configured' }, 503)))

  await page.goto('/?screen=practice')

  // Экран остаётся на месте: адрес не переписан на welcome и страница жива.
  await expect(page).toHaveURL(/screen=practice/)
  await expect(page.locator('body')).toBeVisible()
})
