import { test, expect } from '@playwright/test'

// Режим рации: тумблер в настройках тьютора и его путь до комнаты.
//
// Живой звонок здесь не поднимаем (нужны LiveKit и работающий воркер), но
// главное звено проверяется без него: флаг из localStorage обязан доехать до
// /api/livekit/token — оттуда он попадает в metadata и переключает агента на
// ручной ход. Разъедься эти два конца, и рация тихо не включилась бы вовсе.

const SWITCH = '.t-manage__ptt'

// Экран звонка не пойдёт за токеном, пока getUserMedia не отдаст поток, а в
// headless-хроме микрофонов нет вовсе. Подсовываем фиктивное устройство.
test.use({
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

test.describe('Тьютор — режим рации', () => {
  test('тумблер включается и переживает перезагрузку', async ({ page }) => {
    await page.goto('/?screen=tutor-manage')
    const toggle = page.locator(SWITCH)
    await expect(toggle).toBeVisible({ timeout: 15000 })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Настройка живёт на устройстве (localStorage) — значит должна пережить
    // перезагрузку страницы, иначе ученик включал бы её перед каждым звонком.
    await page.reload()
    await expect(page.locator(SWITCH)).toHaveAttribute('aria-checked', 'true')
  })

  test('включённый тумблер уезжает в запрос токена комнаты', async ({ page, context }) => {
    await context.grantPermissions(['microphone'])
    await page.addInitScript(() => localStorage.setItem('jts:tutor:pushToTalk', '1'))

    let body = null
    // Отвечаем отказом по дневному лимиту: экран покажет сообщение и не полезет
    // в LiveKit, а тело запроса — это всё, что нам нужно проверить.
    await page.route('**/api/livekit/token', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ limited: true, error: 'daily_limit' }),
      })
    })

    await page.goto('/?screen=tutor-voice-chat')
    await expect.poll(() => body, { timeout: 15000 }).not.toBeNull()
    expect(body.pushToTalk).toBe(true)
  })

  test('выключенный тумблер флаг не шлёт', async ({ page, context }) => {
    await context.grantPermissions(['microphone'])
    let body = null
    await page.route('**/api/livekit/token', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ limited: true, error: 'daily_limit' }),
      })
    })

    await page.goto('/?screen=tutor-voice-chat')
    await expect.poll(() => body, { timeout: 15000 }).not.toBeNull()
    expect(body.pushToTalk).toBeUndefined()
  })
})
