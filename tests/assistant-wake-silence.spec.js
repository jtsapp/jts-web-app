import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { FLAGS, HELLO, WAKE, bubble, enableWake, setup, silentWav } from './helpers/assistant-wake.js'

// Одно «Луна» и тишина (21.10.2026): «слушаю» облачком, 6 с без речи — прежнее приветствие с
// окном. Микрофон браузера читает файл тишины вместо писка фальшивого устройства: писк
// иногда считается речью, и тест стал бы лотереей. Флаг браузера — на весь файл.
const SILENCE_FILE = path.join(os.tmpdir(), 'jts-e2e-silence.wav')
fs.writeFileSync(SILENCE_FILE, silentWav(16000 * 3, 16000))
test.use({ launchOptions: { args: [...FLAGS, `--use-file-for-fake-audio-capture=${SILENCE_FILE}`] } })

test('одно «Луна» и тишина — «слушаю», потом прежнее приветствие с окном и запись одного ответа', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)

  await page.evaluate(() => window.__jtsWake())
  await expect(bubble(page)).toHaveAttribute('data-cmd', 'listening')
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeHidden()
  // 6 с без речи — приветствие (WAKE_MARK), как до 21.10.
  await expect(dialog.getByText(HELLO)).toBeVisible({ timeout: 15_000 })
  expect(calls.stt).toBe(0)
  expect(calls.chat[0].messages).toEqual([{ role: 'user', content: WAKE }])
  expect(calls.chat[0].voice).toBe(true)
  await expect(dialog).not.toContainText(WAKE)
  // Договорила — запись ответа пошла сама, без кнопки.
  await expect(page.getByRole('button', { name: 'Закончить вопрос' })).toBeVisible({ timeout: 15_000 })
})
