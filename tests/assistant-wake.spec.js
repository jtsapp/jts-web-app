import { test, expect } from '@playwright/test'

// Позывной Луны в окне помощника: «Привет, Луна» → окно → приветствие → запись ОДНОГО
// ответа. «Ухо» подменено (window.__jtsFakeWakeEar, useWakeWord.js): настоящий Vosk
// проверяет tests/wake-lab.spec.js, здесь — цепочка окна. Модель, синтез и
// распознавание тоже подменены.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const WAKE = '[ученик позвал голосом]'
const HELLO = 'Здравствуйте, Айгерім! Вы на Главной. Чем помочь?'

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
    window.__jtsFakeWakeEar = true
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { chat: [], stt: 0 }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    const last = body.messages.at(-1).content
    // Первая реплика по кнопке — свой тест (assistant-opening.spec.js); здесь она «не удалась».
    if (last === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    calls.chat.push(body)
    await r.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: last === WAKE ? HELLO : 'Домашка — в разделе «Домашняя работа».',
    })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  await page.route('**/api/assistant/transcribe', async (r) => {
    calls.stt += 1
    await r.fulfill(json({ text: 'Где домашка?' }))
  })
  return calls
}

const dot = (page) => page.locator('.asst__launcher [data-wake]')

// Включить позывной в окне и закрыть окно. После закрытия 5 с позывной глух
// (ложное срабатывание → ученик закрыл окно), поэтому ждём «слушает» с запасом.
async function enableWake(page) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await dialog.getByRole('checkbox', { name: 'Звать Луну голосом' }).check()
  await expect(dialog.getByText('Скажите «Луна»')).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
}

test('«Привет, Луна» — окно, приветствие голосом, потом Луна сама слушает один ответ', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)

  await page.evaluate(() => window.__jtsWake())
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(HELLO)).toBeVisible()
  expect(calls.chat[0].messages).toEqual([{ role: 'user', content: WAKE }])
  expect(calls.chat[0].voice).toBe(true)
  await expect(dialog).not.toContainText(WAKE)

  // Договорила — запись ответа пошла сама, без кнопки.
  const stop = page.getByRole('button', { name: 'Закончить вопрос' })
  await expect(stop).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1200)
  // Фальшивый микрофон пищит с паузами — запись могла кончиться сама на тишине.
  if (await stop.isVisible()) await stop.click()
  await expect(page.locator('.asst__msg--me')).toContainText('Где домашка?')
  expect(calls.stt).toBe(1)
  expect(calls.chat[1].messages.at(-1)).toEqual({ role: 'user', content: 'Где домашка?' })

  // Один ответ, не разговор: после ответа Луны запись сама не начинается.
  await expect(page.locator('.asst__msg--bot').last()).toContainText('Домашняя работа')
  await page.waitForTimeout(1500)
  await expect(stop).toBeHidden()
})

test('раздел взял микрофон — «ухо» молчит, отпустил — снова слушает', async ({ page }) => {
  await setup(page)
  await enableWake(page)
  await page.evaluate(async () => {
    window.__sectionMic = await navigator.mediaDevices.getUserMedia({ audio: true })
  })
  await expect(dot(page)).toHaveAttribute('data-wake', 'paused')
  // Пока микрофон у раздела, позывной окно не открывает.
  await page.evaluate(() => window.__jtsWake())
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeHidden()
  await page.evaluate(() => window.__sectionMic.getTracks().forEach((t) => t.stop()))
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 5_000 })
})

test('закрыл окно после позывного — 5 с позывной его не открывает', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)
  await page.evaluate(() => window.__jtsWake())
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText(HELLO)).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await page.evaluate(() => window.__jtsWake())
  await expect(dialog).toBeHidden()
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
  await page.evaluate(() => window.__jtsWake())
  await expect(dialog).toBeVisible()
  expect(calls.chat.filter((c) => c.messages.at(-1).content === WAKE)).toHaveLength(2)
})
