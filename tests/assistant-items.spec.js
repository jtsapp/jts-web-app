import { test, expect } from '@playwright/test'

// «Луна, открой урок 1» (lib/assistant/items/): ответ чата с адресом урока курса →
// App переходит на тропу A1 с целью → тропа открывает урок сама. Закрытый урок она не
// открывает и показывает «Сначала пройди предыдущий урок» — как при нажатии на замок.
// Модель подменена: сверку адреса и каталог проверяют юнит-тесты роута и каталога.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, reply) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('jts_assistant_met', '1')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
  const chat = []
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    // Первая реплика при открытии окна — свой тест (assistant-opening.spec.js); здесь «не удалась».
    if (body.messages.at(-1)?.content === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    chat.push(body)
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill(json({ error: 'tts_failed' }, 502)))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  return chat
}

async function ask(page, text) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  await page.getByRole('textbox').fill(text)
  await page.getByRole('textbox').press('Enter')
}

test('«открой урок 1» — тропа A1 открывает урок', async ({ page }) => {
  test.setTimeout(60_000)
  const chat = await setup(page, 'Открываю урок 1.\n[[ASST_ACTION open course.A1.L1 now «урок 1 “My biography”»]]')
  await ask(page, 'открой урок 1')
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 20_000 })
  expect(chat[0].messages.at(-1).content).toBe('открой урок 1')
})

test('закрытый урок — не открывается, тропа показывает «сначала предыдущий»', async ({ page }) => {
  test.setTimeout(60_000)
  await setup(page, 'Открываю урок 5.\n[[ASST_ACTION open course.A1.L5 now «урок 5 “Family”»]]')
  await ask(page, 'открой урок 5')
  await expect(page.locator('.kt-hint')).toContainText('Сначала пройди предыдущий урок', { timeout: 20_000 })
  await expect(page.locator('.cp-step')).toHaveCount(0)
})

test('предложение — кнопка «Открыть: урок 1 “…”» ведёт в урок', async ({ page }) => {
  test.setTimeout(60_000)
  await setup(page, 'Это урок 1 «My biography». Открыть?\n[[ASST_ACTION open course.A1.L1 offer «урок 1 “My biography”»]]')
  await ask(page, 'где урок про биографию?')
  const open = page.getByRole('button', { name: 'Открыть: урок 1 “My biography”' })
  await expect(open).toBeVisible()
  await open.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 20_000 })
})
