import { test, expect } from '@playwright/test'
import { unlockStep } from './helpers/course-steps.js'

// «Застряли? Подсказать?» (lib/assistant/stuck.js, useStuckWatch.js) на настоящем
// уроке курса: ученик дважды подряд ошибся — у кнопки Луны облачко, по нажатию окно
// и в чат уходит служебная пометка «ученик застрял». Модель подменена.
//
// Урок A1 №1: первый оценённый экран — выбор (третий по счёту), до него заметка и
// «отметь, что про тебя» без оценки. У A2 перед выбором стоит «соединение», которое
// тест прошёл бы наугад и с ошибкой — счёт сбился бы раньше времени.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    // Вводное облачко «Я Луна…» — для тех, кто ни разу не открывал окно; здесь оно мешало бы.
    localStorage.setItem('jts_assistant_met', '1')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
  const chat = []
  await page.route('**/api/assistant/chat', async (r) => {
    chat.push(JSON.parse(r.request().postData()))
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Посмотрите, кто выполняет действие. ' })
  })
  // Голос не нужен: проверяем, что пометка ушла с voice, а не как звучит Луна.
  await page.route('**/api/assistant/speak', (r) => r.fulfill(json({ error: 'tts_failed' }, 502)))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  return chat
}

// Ответы урока: шаг узнаём по набору вариантов на экране (вопрос у шагов то в
// prompt, то в title, а варианты есть всегда).
async function answers(page) {
  return page.evaluate(() =>
    fetch('/course/a1/steps-1.json')
      .then((r) => r.json())
      .then((d) => d.steps.filter((s) => s.type === 'choice' && s.answer).map((s) => ({ options: s.options, answer: s.answer }))),
  )
}

// До следующего экрана с выбором — экраны без оценки проходим как есть.
async function toChoice(page) {
  for (let i = 0; i < 15 && !(await page.locator('.cp-choice:not([disabled])').count()); i++) {
    await unlockStep(page)
    await page.locator('.cp-cta:not([disabled])').click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator('.cp-choice:not([disabled])').first()).toBeVisible()
}

// Неверный вариант: любой, кроме ответа шага с тем же набором вариантов.
async function answerWrong(page, steps) {
  const choices = page.locator('.cp-choice')
  const shown = (await choices.allTextContents()).map((t) => t.trim())
  const same = (opts) => opts.length === shown.length && opts.every((o) => shown.includes(o.trim()))
  const right = steps.find((st) => same(st.options))?.answer
  expect(right, `шаг с вариантами ${shown.join(' / ')}`).toBeTruthy()
  await choices.nth(shown.findIndex((t) => t !== right.trim())).click()
  await page.locator('.cp-cta:not([disabled])').click()
  await expect(page.locator('.cp-fb.is-no')).toBeVisible()
}

test('две ошибки подряд — облачко «Подсказать?», по нажатию Луна разбирает задание', async ({ page }) => {
  test.setTimeout(90_000)
  const chat = await setup(page)
  await page.goto('/?screen=kingdom-interior&level=A1&unlock=1')
  const node = page.locator('.kt-step:not([disabled])').first()
  await expect(node).toBeVisible({ timeout: 20_000 })
  await node.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 20_000 })
  const key = await answers(page)

  await toChoice(page)
  await answerWrong(page, key)
  // Одна ошибка — обычное дело: облачка нет (снимки — через 0.8 и 2 с после действия).
  await page.waitForTimeout(2500)
  await expect(page.locator('.asst__hint--stuck')).toHaveCount(0)

  await page.locator('.cp-cta:not([disabled])').click()
  await toChoice(page)
  await answerWrong(page, key)
  const hint = page.locator('.asst__hint--stuck')
  await expect(hint).toBeVisible({ timeout: 5000 })
  await expect(hint).toHaveText('Подсказать?')
  await expect(hint).toHaveAttribute('data-stuck', 'errors')

  await hint.click()
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeVisible()
  await expect.poll(() => chat.length).toBe(1)
  expect(chat[0].messages.at(-1).content).toBe('[ученик застрял: две ошибки подряд]')
  expect(chat[0].voice).toBe(true)
  // Служебная пометка в переписке не рисуется — виден только ответ Луны.
  await expect(page.locator('.asst__msg--me')).toHaveCount(0)
  await expect(page.locator('.asst__msg--bot').last()).toContainText('кто выполняет действие')
  await expect(hint).toHaveCount(0)
})
