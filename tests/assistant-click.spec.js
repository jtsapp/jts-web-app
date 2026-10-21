import { test, expect } from '@playwright/test'

// Луна нажимает кнопки (21.10.2026): быстрая команда позывного — без сервера, команда
// словами — через модель (подменена), опасная кнопка — никогда. «Ухо» подменено
// (window.__jtsFakeWakeEar, useWakeWord.js), кнопки вставлены в обёртку экрана: снимок
// читает DOM, и Луне всё равно, чья это кнопка.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, { reply = () => 'Хорошо.', stt = 'Луна, нажми старт' } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('jts_luna_wake', '1')
    window.__jtsFakeWakeEar = true
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { chat: [], stt: 0 }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    if (body.messages.at(-1).content === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    calls.chat.push(body)
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply(body) })
  })
  await page.route('**/api/assistant/transcribe', async (r) => {
    calls.stt += 1
    await r.fulfill(json({ text: stt }))
  })
  // Голос Луны здесь не проверяем: синтез «не вышел», ответ остаётся текстом.
  await page.route('**/api/assistant/speak', (r) => r.fulfill({ status: 502, body: '' }))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  await page.goto('/?screen=home')
  // Кнопки «урока»: сколько раз нажали — в data-атрибуте.
  await page.locator('.scr-in').waitFor()
  await page.evaluate(() => {
    const root = document.querySelector('.scr-in')
    for (const label of ['Далее', 'Старт', 'Выйти']) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.dataset.test = label
      b.dataset.pressed = '0'
      b.addEventListener('click', () => {
        b.dataset.pressed = String(Number(b.dataset.pressed) + 1)
      })
      root.appendChild(b)
    }
  })
  await expect(page.locator('.asst__launcher [data-wake]')).toHaveAttribute('data-wake', 'listening', { timeout: 15_000 })
  return calls
}

const pressed = (page, label) => page.locator(`.scr-in button[data-test="${label}"]`).getAttribute('data-pressed')

test('«Луна, дальше» — нажатие на устройстве, без модели, облачко вместо окна', async ({ page }) => {
  const calls = await setup(page)
  await page.evaluate(() => window.__jtsWake('луна дальше'))
  await expect.poll(() => pressed(page, 'Далее')).toBe('1')
  await expect(page.locator('[data-cmd="pressed"]')).toContainText('Нажала «Далее»')
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeHidden()
  expect(calls.chat).toHaveLength(0)
  expect(calls.stt).toBe(0)
  // Глухота после быстрой команды — 1.5 с, а не 5: следующая команда проходит скоро.
  await expect(page.locator('.asst__launcher [data-wake]')).toHaveAttribute('data-wake', 'listening', { timeout: 4_000 })
  await page.evaluate(() => window.__jtsWake('луна дальше'))
  await expect.poll(() => pressed(page, 'Далее')).toBe('2')
})

test('«Луна, нажми старт» одним духом — распознавание, модель, нажатие по номеру из снимка', async ({ page }) => {
  const calls = await setup(page, {
    reply: (body) => {
      const n = /\[кнопка #(\d+) «Старт»\]/.exec(body.screen.text)[1]
      return `Нажимаю «Старт».[[ASST_ACTION click ${n} now «Старт»]]`
    },
  })
  await page.evaluate(() => window.__jtsWake('луна [unk] [unk]'))
  await expect.poll(() => pressed(page, 'Старт')).toBe('1')
  expect(calls.stt).toBe(1)
  expect(calls.chat[0].messages.at(-1)).toEqual({ role: 'user', content: 'нажми старт' })
  expect(calls.chat[0].voice).toBe(true)
  // Опасная кнопка в снимке есть, но без номера: просить её модели нечем.
  expect(calls.chat[0].screen.text).toContain('[кнопка «Выйти»]')
  await expect(page.locator('[data-cmd="pressed"]')).toContainText('Нажала «Старт»')
})

test('опасную кнопку окно не жмёт, даже если модель её назвала', async ({ page }) => {
  await setup(page, { stt: 'Луна, выйди', reply: () => 'Нажимаю.[[ASST_ACTION click 3 now «Выйти»]]' })
  await page.evaluate(() => window.__jtsWake('луна [unk]'))
  await expect(page.locator('[data-cmd="missing"]')).toContainText('Не нашла «Выйти»')
  expect(await pressed(page, 'Выйти')).toBe('0')
})
