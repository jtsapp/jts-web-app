import { test, expect } from '@playwright/test'
import { FLAGS, WAKE, bubble, dot, enableWake, setup } from './helpers/assistant-wake.js'

// Позывной Луны в окне помощника. С 21.10.2026 одно «Луна» — сигнал «слушаю» (облачко у
// кнопки) и одна команда или вопрос; промолчал 6 с — прежнее приветствие с окном
// (assistant-wake-silence.spec.js). «Ухо» подменено: настоящий Vosk проверяет
// tests/wake-lab.spec.js, здесь — цепочка окна. Нажатия командами — assistant-click.spec.js.
//
// Писк фальшивого микрофона Chrome то считается речью, то нет (порог голоса считается от
// шума первых 300 мс, а писк попадает в них через раз), поэтому «говорит» здесь только
// фраза одним духом: её звук «ухо» отдаёт само.
test.use({ launchOptions: { args: FLAGS } })

test('«Луна, где домашка?» одним духом — без окна, распознавание, ответ-объяснение открывает окно', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)

  await page.evaluate(() => window.__jtsWake('луна [unk] [unk]'))
  await expect(bubble(page)).toBeVisible()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  expect(calls.stt).toBe(1)
  // Обращение срезано: модели — сам вопрос, голосом.
  expect(calls.chat[0].messages.at(-1)).toEqual({ role: 'user', content: 'где домашка?' })
  expect(calls.chat[0].voice).toBe(true)
  expect(calls.chat.some((c) => c.messages.at(-1).content === WAKE)).toBe(false)
  await expect(page.locator('.asst__msg--bot').last()).toContainText('Домашняя работа')
  await expect(bubble(page)).toBeHidden()

  // Один ответ, не разговор: после ответа Луны запись сама не начинается.
  await page.waitForTimeout(1500)
  await expect(page.getByRole('button', { name: 'Закончить вопрос' })).toBeHidden()
})

test('раздел взял микрофон — «ухо» молчит, отпустил — снова слушает', async ({ page }) => {
  await setup(page)
  await enableWake(page)
  await page.evaluate(async () => {
    window.__sectionMic = await navigator.mediaDevices.getUserMedia({ audio: true })
  })
  await expect(dot(page)).toHaveAttribute('data-wake', 'paused')
  // Пока микрофон у раздела, позывной ничего не делает.
  await page.evaluate(() => window.__jtsWake())
  await expect(bubble(page)).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeHidden()
  await page.evaluate(() => window.__sectionMic.getTracks().forEach((t) => t.stop()))
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 5_000 })
})

test('закрыл окно после позывного — 5 с позывной глух', async ({ page }) => {
  const calls = await setup(page)
  await enableWake(page)
  await page.evaluate(() => window.__jtsWake('луна [unk]'))
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await page.evaluate(() => window.__jtsWake('луна [unk]'))
  await expect(bubble(page)).toBeHidden()
  expect(calls.stt).toBe(1)
  await expect(dot(page)).toHaveAttribute('data-wake', 'listening', { timeout: 10_000 })
  await page.evaluate(() => window.__jtsWake('луна [unk]'))
  await expect.poll(() => calls.stt, { timeout: 10_000 }).toBe(2)
})
