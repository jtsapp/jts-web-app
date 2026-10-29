import { test, expect } from '@playwright/test'
import { LEGAL_VERSION } from '../src/lib/legalDocuments.js'

// Луна открывает раздел — целиком в браузере: ответ чата с действием (служебный
// хвост стрима, lib/assistant/actions.js) → переход App. Модель и синтез
// подменены — проверяется цепочка экрана, а не Claude и Gemini.
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

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

async function setup(page, replies) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  // Документы платформы приняты, разделы тарифа не заданы — иначе экраны согласия и
  // проверки доступа перекрывают приложение (LegalDocumentsGate, StudentSectionGate).
  await page.route('**/user/legal-documents**', (r) => r.fulfill(json({ version: LEGAL_VERSION, acceptedAt: '2026-10-29T10:00:00Z' })))
  await page.route('**/cabinet/my-sections', (r) => r.fulfill(json({ known: false, allowed: [] })))
  const calls = { chat: [], speak: [] }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    // Первая реплика при открытии окна (lib/assistant/opening.js) — свой тест,
    // assistant-opening.spec.js; здесь она «не удалась», и окно ведёт себя как без неё.
    if (body.messages.at(-1)?.content === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    calls.chat.push(body)
    const reply = replies[Math.min(calls.chat.length, replies.length) - 1]
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply })
  })
  await page.route('**/api/assistant/speak', async (r) => {
    calls.speak.push(JSON.parse(r.request().postData()).text)
    await r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  })
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
  return calls
}

async function ask(page, text) {
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Помощник' }).click()
  await page.getByRole('textbox').fill(text)
  await page.getByRole('textbox').press('Enter')
}

test('«где потренировать говорение» → кнопка под ответом → Практика на вкладке «Говорение»', async ({ page }) => {
  const calls = await setup(page, [
    'Говорение тренируют в Практике, вкладка «Говорение»: шэдоуинг, ситуации, SpeakSpin. Открыть?\n[[ASST_ACTION open practice-speaking offer]]',
  ])
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  await page.getByRole('button', { name: 'Где потренировать говорение?' }).click()

  const open = page.getByRole('button', { name: 'Открыть: Практика → Говорение' })
  await expect(open).toBeVisible()
  await expect(page.locator('.asst__msg--bot').last()).not.toContainText('ASST_')
  await expect(page.locator('.pk-skills')).toHaveCount(0)
  expect(calls.chat).toHaveLength(1)

  await open.click()
  await expect(page.getByRole('tab', { name: /Говорение/ })).toHaveAttribute('aria-selected', 'true', { timeout: 15000 })
  // Разговор пережил переход: окно и ответ на месте (десктоп), на телефоне окно убрано.
  const phone = (page.viewportSize()?.width || 0) <= 720
  await expect(page.getByRole('dialog', { name: 'Луна' })).toHaveCount(phone ? 0 : 1)
})

test('«да» после предложения — раздел открывается сам, модель видит, что предлагала', async ({ page }) => {
  const calls = await setup(page, [
    'Слова учат в Словаре. Открыть?\n[[ASST_ACTION open vocab offer]]',
    'Открываю Словарь — начните с уровня A2.\n[[ASST_ACTION open vocab now]]',
  ])
  await page.goto('/?screen=home')
  await ask(page, 'где учить слова')
  await expect(page.getByRole('button', { name: 'Открыть: Словарь' })).toBeVisible()
  await ask(page, 'да')
  await expect(page.locator('.vp').first()).toBeVisible({ timeout: 15000 })
  expect(calls.chat[1].messages[1]).toEqual({ role: 'assistant', content: 'Слова учат в Словаре. Открыть?\n[[OPEN vocab]]' })
})

// Тур «от Луны» убран 28.10.2026 (решение владельца): на просьбу о туре Луна открывает
// раздел, а тур там новый — выходит сам при первом заходе и по «?». Здесь авто-туры
// погашены (playwright.config.js), поэтому после перехода тура нет вовсе: Луна его не
// запускает. Хвост тура от прежнего сервера тоже ничего не запускает.
test('тур Луна не запускает: открывает раздел, и только', async ({ page }) => {
  const calls = await setup(page, [
    'Тур по Практике выходит сам при первом заходе, повторить — кнопка «?» вверху. Открываю Практику.\n[[ASST_ACTION open practice now]]',
    'Начинаю тур.\n[[ASST_ACTION tour practice now]]',
  ])
  await page.goto('/?screen=home')
  await ask(page, 'проведи тур по практике')
  await expect(page.locator('.pk-skills')).toBeVisible({ timeout: 15000 })

  await ask(page, 'проведи тур')
  await expect(page.locator('.asst__msg--bot').last()).toContainText('Начинаю тур.')
  await expect(page.locator('.asst__msg--bot').last()).not.toContainText('ASST_')
  await page.waitForTimeout(1500)
  await expect(page.locator('.t-tour')).toHaveCount(0)
  expect(calls.chat).toHaveLength(2)
  expect(calls.speak).toEqual([])
})
