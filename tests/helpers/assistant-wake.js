import { expect } from '@playwright/test'

// Позывной Луны без бэкенда: вход, подменные модель, синтез и распознавание и «ухо»
// (window.__jtsFakeWakeEar, useWakeWord.js). Общий файл для спек позывного — с писком
// фальшивого микрофона и с тишиной вместо него (флаг браузера ставится на файл).

export const FLAGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
export const WAKE = '[ученик позвал голосом]'
export const HELLO = 'Здравствуйте, Айгерім! Вы на Главной. Чем помочь?'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** Тишина WAV PCM 16 бит: n сэмплов с частотой rate. */
export function silentWav(n = 2400, rate = 8000) {
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24)
  b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  return b
}

export async function setup(page) {
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
    await r.fulfill(json({ text: 'Луна, где домашка?' }))
  })
  return calls
}

export const dot = (page) => page.locator('.asst__launcher [data-wake]')
export const bubble = (page) => page.locator('.asst [data-cmd]')

// Включить позывной в окне и закрыть окно. После закрытия 5 с позывной глух
// (ложное срабатывание → ученик закрыл окно), поэтому ждём «слушает» с запасом.
export async function enableWake(page) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await dialog.getByRole('checkbox', { name: 'Звать Луну голосом' }).check()
  await expect(dialog.getByText('Скажите «Луна»')).toBeVisible()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
}
