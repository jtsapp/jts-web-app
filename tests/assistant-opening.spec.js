import { test, expect } from '@playwright/test'

// Первая реплика Луны: открыл окно — она сама говорит, что видит на экране и что
// сделать дальше (lib/assistant/opening.js), голосом и с кнопкой «Открыть».
// Модель и синтез подменены — проверяется цепочка экрана, а не Claude и Gemini.
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const OPENING = '[ученик открыл окно]'
const GREETING = 'Айгерім, вы на Главной, и у вас 14 слов ждут повторения. С них и стоит начать — так слова не забудутся. Открыть?'

// 0.3 с тишины WAV 8 кГц — валидная запись для <audio>.
function silentWav() {
  const n = 2400
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24)
  b.writeUInt32LE(16000, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  return b
}

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { chat: [], speak: [] }
  await page.route('**/api/assistant/chat', async (r) => {
    calls.chat.push(JSON.parse(r.request().postData()))
    await r.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: `${GREETING}\n[[ASST_ACTION open vocab offer]]`,
    })
  })
  await page.route('**/api/assistant/speak', async (r) => {
    calls.speak.push(JSON.parse(r.request().postData()).text)
    await r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  })
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  return calls
}

test('открыл окно — Луна говорит первой, голосом, и предлагает раздел кнопкой', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()

  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(GREETING)).toBeVisible()
  expect(calls.chat).toHaveLength(1)
  expect(calls.chat[0].messages).toEqual([{ role: 'user', content: OPENING }])
  expect(calls.chat[0].voice).toBe(true)
  expect(calls.chat[0].screen.id).toBe('home')
  expect(calls.chat[0].screen.text.length).toBeGreaterThan(0)
  // Пометку ученик не видит, служебный хвост — тоже.
  await expect(dialog).not.toContainText(OPENING)
  await expect(dialog).not.toContainText('ASST_')
  // Сказано голосом — по фразам, тем же текстом.
  await expect.poll(() => calls.speak.join(' ')).toContain('С них и стоит начать')

  // Переход — только по кнопке: ученик ни о чём не просил.
  await expect(page.locator('.vp')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Открыть: Словарь' }).click()
  await expect(page.locator('.vp').first()).toBeVisible({ timeout: 15000 })
})

test('закрыл и открыл на том же экране — Луна не повторяется', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(GREETING)).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await page.getByRole('button', { name: 'Помощник' }).click()
  await expect(dialog.getByText(GREETING)).toBeVisible()
  await page.waitForTimeout(500)
  expect(calls.chat).toHaveLength(1)
})
