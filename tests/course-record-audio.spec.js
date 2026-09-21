import { test, expect } from '@playwright/test'

// Шаг «послушайте, затем запишите себя» в настоящем плеере на настоящих
// данных. Образцы были строками и звучали браузерным синтезом (на Android без
// английского голоса — тишина); теперь образец с записью — { text, src }
// (scripts/voice-step-cards.js), и тап играет файл. Задание по-русски — у B1
// таких больше половины строк — показано текстом, а не кнопкой «послушать».
//
// До record-шага урок идёт десятки экранов (у A0 урока 1 — 56-й из 58), поэтому
// ответ steps-1.json подменяется: берётся настоящий файл, и в нём остаются
// только шаги record. Плеер, данные и записи при этом настоящие.
async function openRecordSteps(page, level) {
  await page.route(new RegExp(`/course/${level.toLowerCase()}/steps-1\\.json(\\?|$)`), async (route) => {
    const res = await route.fetch()
    const data = await res.json()
    await route.fulfill({ response: res, json: { ...data, steps: data.steps.filter((s) => s.type === 'record') } })
  })
  // Синтез браузера считаем: образцу с записью он не нужен вовсе.
  await page.addInitScript(() => {
    window.__spoken = []
    if (window.speechSynthesis) window.speechSynthesis.speak = (u) => window.__spoken.push(u.text)
  })
  await page.goto(`/?screen=kingdom-interior&level=${level}&unlock=1`)
  await page.locator('.kt-step:not([disabled])').first().click()
  await expect(page.locator('.cp-rec')).toBeVisible({ timeout: 20000 })
}

// Тап по образцу → запрос его mp3 и ни слова синтеза.
async function tapPlaysRecording(page, level, text) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => new RegExp(`/learning/audio/${level}/[0-9a-f]{12}\\.mp3$`).test(r.url())),
    page.locator('.cp-rec button.cp-rec__line', { hasText: text }).click(),
  ])
  expect(res.ok()).toBe(true)
  expect(res.headers()['content-type']).toContain('audio/mpeg')
  expect(await page.evaluate(() => window.__spoken)).toEqual([])
}

test('A0: образец звучит своей записью, а не синтезом', async ({ page }) => {
  await openRecordSteps(page, 'A0')
  await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(4)
  await tapPlaysRecording(page, 'a0', 'I like coffee.')
})

test('B1: задание по-русски — текст, рамка ответа звучит записью', async ({ page }) => {
  await openRecordSteps(page, 'B1')
  // Первые два record урока — задания по-русски: ни одной кнопки «послушать».
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.cp-rec p.cp-rec__line--task')).toHaveCount(3)
    await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(0)
    await page.locator('.cp-cta:not([disabled])').click()
  }
  // Третий — рамки ответа по-английски, и у каждой своя запись.
  await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(3)
  await tapPlaysRecording(page, 'b1', 'My closest friend is')
})
