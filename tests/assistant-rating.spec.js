import { test, expect } from '@playwright/test'
import { LEGAL_VERSION } from '../src/lib/legalDocuments.js'

// 👍/👎 под ответом Луны и журнал ответов (ТЗ v2.0, 8.5; lib/assistant/ratingClient.js) — в браузере, на телефоне
// (проект mobile, 390 px) и компьютере. Чат и роут оценок подменены: проверяется окно, а не модель и база.
// Журнал под webdriver молчит, пока страница не включит его флагом __jtsRating (как «Луна пишет первой»).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, replies) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
    window.__jtsRating = true
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  await page.route('**/user/legal-documents**', (r) => r.fulfill(json({ version: LEGAL_VERSION, acceptedAt: '2026-10-29T10:00:00Z' })))
  await page.route('**/cabinet/my-sections', (r) => r.fulfill(json({ known: false, allowed: [] })))
  const calls = { chat: 0, rating: [] }
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    // Первая реплика при открытии окна — свой тест (assistant-opening.spec.js); здесь она «не удалась».
    if (body.messages.at(-1)?.content === '[ученик открыл окно]') return r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {})
    calls.chat += 1
    const reply = replies[Math.min(calls.chat, replies.length) - 1]
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', headers: { 'x-assistant-model': 'claude-haiku-5-5' }, body: reply })
  })
  // Глобом со ** на конце, как моки POST-ручек бэкенда (CLAUDE.md, ?jts_app=student).
  await page.route('**/api/assistant/rating**', async (r) => {
    calls.rating.push(JSON.parse(r.request().postData()))
    await r.fulfill(json({ saved: true }))
  })
  return calls
}

async function ask(page, text) {
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Помощник' }).click()
  // Поле вопроса — по классу: после 👎 в окне есть и поле комментария.
  await dialog.locator('.asst__input').fill(text)
  await dialog.locator('.asst__input').press('Enter')
}

test('ответ уходит в журнал; 👎 с причиной и комментарием, смена на 👍 — в ту же строку', async ({ page }) => {
  const calls = await setup(page, ['Домашка — в разделе «Уроки», вкладка «Домашняя работа».'])
  await page.goto('/?screen=home')
  await ask(page, 'где моя домашка')

  const dialog = page.getByRole('dialog', { name: 'Луна' })
  const down = dialog.getByRole('button', { name: 'Бесполезный ответ' })
  await expect(down).toBeVisible()
  await expect.poll(() => calls.rating.length).toBe(1)
  expect(calls.rating[0]).toMatchObject({ seq: 1, turn: 1, question: 'где моя домашка', channel: 'text', model: 'claude-haiku-5-5', screen: 'home', rating: null })
  // Текст пузыря кнопки оценки не меняют: эмодзи у них только для глаза.
  await expect(page.locator('.asst__msg--bot').last().locator('p').first()).toHaveText('Домашка — в разделе «Уроки», вкладка «Домашняя работа».')

  await down.click()
  await expect.poll(() => calls.rating.length).toBe(2)
  expect(calls.rating[1]).toMatchObject({ seq: 2, rating: 'down' })
  // exact: иначе «Не то» совпало бы и с «Не тот язык».
  await dialog.getByRole('button', { name: 'Не то', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Свой комментарий (необязательно)' }).fill('хотела узнать срок')
  await dialog.getByRole('button', { name: 'Готово' }).click()
  await expect(dialog.getByText('Спасибо — команда посмотрит этот ответ.')).toBeVisible()
  await expect.poll(() => calls.rating.length).toBe(3)
  expect(calls.rating[2]).toMatchObject({ seq: 3, rating: 'down', reasons: ['offtarget'], comment: 'хотела узнать срок' })

  const up = dialog.getByRole('button', { name: 'Полезный ответ', exact: true })
  await up.click()
  await expect(up).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => calls.rating.length).toBe(4)
  expect(calls.rating[3]).toMatchObject({ seq: 4, rating: 'up', reasons: [], comment: '' })
  expect(new Set(calls.rating.map((r) => r.id)).size).toBe(1)
})

test('нажатая кнопка под ответом — в строке этого ответа', async ({ page }) => {
  const calls = await setup(page, ['Говорение тренируют в Практике. Открыть?\n[[ASST_ACTION open practice-speaking offer]]'])
  await page.goto('/?screen=home')
  await ask(page, 'где потренировать говорение')
  const open = page.getByRole('button', { name: 'Открыть: Практика → Говорение' })
  await expect(open).toBeVisible()
  await expect.poll(() => calls.rating.length).toBe(1)
  expect(calls.rating[0].actions).toEqual(['open:practice-speaking'])
  await open.click()
  await expect.poll(() => calls.rating.length).toBe(2)
  expect(calls.rating[1]).toMatchObject({ id: calls.rating[0].id, clicked: 'open:practice-speaking' })
})
