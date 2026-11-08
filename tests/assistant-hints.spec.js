import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'
import { unlockStep } from './helpers/course-steps.js'

// Ступени подсказки (ТЗ v2.0, 7.2б; lib/assistant/hintSteps.js, hintTask.js) на настоящих экранах. Какая ступень,
// решает окно, модель подменена — проверяем, что уходит в чат: пометка ступени, ключ задания только на 3-й ступени
// практики, в домашке не больше двух ступеней и ступень уходит преподавателю — сразу ручкой …/hint и со сдачей
// (контракт homework-hint-contract.md, backend V543).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function mockLuna(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('jts_assistant_met', '1')
    // Без голоса: проверяем текст запросов, а не звук.
    localStorage.setItem('jts_assistant_voice_muted', '1')
  })
  const chat = []
  await page.route('**/api/assistant/chat', async (r) => {
    chat.push(JSON.parse(r.request().postData()))
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Посмотри на слово перед пропуском. ' })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill(json({ error: 'tts_failed' }, 502)))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  return chat
}

const hintTurns = (chat) => chat.map((c) => c.messages.at(-1).content).filter((m) => m.startsWith('[подсказка:'))

test('урок курса: «Подсказать?» трижды — ступени 1, 2, 3; ключ задания только на 3-й', async ({ page }) => {
  test.setTimeout(90_000)
  const chat = await mockLuna(page)
  await mockGates(page)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
  await page.goto('/?screen=kingdom-interior&level=A1&unlock=1')
  const node = page.locator('.kt-step:not([disabled])').first()
  await expect(node).toBeVisible({ timeout: 20_000 })
  await node.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 20_000 })
  // До первого экрана с выбором — экраны без оценки проходим как есть.
  for (let i = 0; i < 15 && !(await page.locator('.cp-choice:not([disabled])').count()); i++) {
    await unlockStep(page)
    await page.locator('.cp-cta:not([disabled])').click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator('.cp-choice:not([disabled])').first()).toBeVisible()
  const shown = (await page.locator('.cp-choice').allTextContents()).map((t) => t.trim())
  const right = await page.evaluate(
    (opts) =>
      fetch('/course/a1/steps-1.json')
        .then((r) => r.json())
        .then((d) => d.steps.find((s) => s.type === 'choice' && s.options?.length === opts.length && s.options.every((o) => opts.includes(o.trim())))?.answer),
    shown,
  )
  expect(right).toBeTruthy()

  await page.locator('.asst__launcher').click()
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeVisible()
  const chip = page.locator('.asst__chip', { hasText: 'Подсказать?' })
  for (let step = 1; step <= 3; step++) {
    await expect(chip).toBeVisible({ timeout: 10_000 })
    await chip.click()
    await expect.poll(() => hintTurns(chat).length).toBe(step)
  }
  expect(hintTurns(chat)).toEqual([
    '[подсказка: ступень 1; практика; сам попросил]',
    '[подсказка: ступень 2; практика; сам попросил]',
    '[подсказка: ступень 3; практика; сам попросил]',
  ])
  const sent = chat.filter((c) => c.messages.at(-1).content.startsWith('[подсказка:'))
  expect(sent[0].hintKey).toBeUndefined()
  expect(sent[1].hintKey).toBeUndefined()
  expect(sent[2].hintKey).toBe(right.trim())
  // Ключа в снимке экрана нет ни на одной ступени — его даёт только раздел.
  for (const c of sent) expect(c.screen.text).not.toContain('верный ответ по заданию')
  // Служебная пометка в переписке не рисуется.
  await expect(page.locator('.asst__msg--me')).toHaveCount(0)
})

test('урок курса: «подскажи» текстом — та же ступень, а не обычный вопрос', async ({ page }) => {
  test.setTimeout(90_000)
  const chat = await mockLuna(page)
  await mockGates(page)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
  await page.goto('/?screen=kingdom-interior&level=A1&unlock=1')
  await page.locator('.kt-step:not([disabled])').first().click({ timeout: 20_000 })
  for (let i = 0; i < 15 && !(await page.locator('.cp-choice:not([disabled])').count()); i++) {
    await unlockStep(page)
    await page.locator('.cp-cta:not([disabled])').click()
    await page.waitForTimeout(150)
  }
  await page.locator('.asst__launcher').click()
  const input = page.getByRole('dialog', { name: 'Луна' }).locator('textarea')
  await input.fill('подскажи')
  await input.press('Enter')
  await expect.poll(() => hintTurns(chat)).toEqual(['[подсказка: ступень 1; практика; сам попросил]'])
  await input.fill('подскажи, где словарь')
  await input.press('Enter')
  await expect.poll(() => chat.at(-1)?.messages.at(-1).content).toBe('подскажи, где словарь')
  expect(hintTurns(chat)).toHaveLength(1)
})

test('домашка: две ступени, третьей нет; ступень уходит преподавателю сразу и со сдачей', async ({ page }) => {
  test.setTimeout(90_000)
  const chat = await mockLuna(page)
  const work = {
    id: 7, studentId: 116, title: 'Домашка с подсказкой', status: 'ASSIGNED',
    materials: [], submissions: [], exercises: [1, 2].map((id) => ({
      id, batchId: 'one', orderIndex: id, lessonTitle: 'Подсказки',
      question: { id: `q${id}`, type: 'gap', gapBefore: 'I', gapAfter: 'coffee', answers: ['like'] },
    })),
  }
  const answers = {}
  const hints = []
  let submitBody = null
  await page.route('https://dev-server.justtostudy.kz/**', (r) => r.fulfill(json({})))
  await page.route('**/api/profile?*', (r) => r.fulfill(json({ profile: null })))
  await page.route('**/cabinet/my-sections', (r) => r.fulfill(json({ known: true, allowed: ['homework'] })))
  await page.route('**/user/legal-documents', (r) => r.fulfill(json({ version: '2026-10-29', acceptedAt: '2026-10-30T10:00:00Z' })))
  await page.route('**/api/practice/state', (r) => r.fulfill(json({})))
  await page.route('**/user/me', (r) => r.fulfill(json({ id: 116, isDemoAccount: false, languageLevel: 'A2' })))
  await page.route('**/user/language-level', (r) => r.fulfill(json({ languageLevel: 'A2' })))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Ученик', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([work])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([])))
  await page.route('**/admin/homework/7/exercises/*/draft', (r) => r.fulfill({ status: 204 }))
  await page.route('**/admin/homework/7/exercises/*/answer', async (r) => {
    const id = Number(r.request().url().match(/exercises\/(\d+)/)[1])
    answers[id] = r.request().postDataJSON()
    work.exercises.find((e) => e.id === id).studentAnswer = answers[id].answer
    await r.fulfill(json(work))
  })
  await page.route('**/admin/homework/7/exercises/*/hint', async (r) => {
    hints.push({ id: Number(r.request().url().match(/exercises\/(\d+)/)[1]), ...r.request().postDataJSON() })
    await r.fulfill({ status: 204 })
  })
  await page.route('**/admin/homework/7/submit', async (r) => {
    submitBody = r.request().postDataJSON()
    work.status = 'SUBMITTED'
    await r.fulfill(json(work))
  })
  await page.goto('/?screen=homework', { waitUntil: 'domcontentloaded' })
  const fields = page.locator('.hw-exercise input')
  await expect(fields).toHaveCount(2, { timeout: 45_000 })
  // Ученик взялся за первое задание — оно и есть «задание под рукой» для подсказки.
  await fields.first().click()

  await page.locator('.asst__launcher').click()
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeVisible()
  const chip = page.locator('.asst__chip', { hasText: 'Подсказать?' })
  for (let step = 1; step <= 2; step++) {
    await expect(chip).toBeVisible({ timeout: 10_000 })
    await chip.click()
    await expect.poll(() => hintTurns(chat).length).toBe(step)
  }
  expect(hintTurns(chat)).toEqual(['[подсказка: ступень 1; домашка; сам попросил]', '[подсказка: ступень 2; домашка; сам попросил]'])
  // Ступень — преподавателю сразу, как Луна её дала.
  await expect.poll(() => hints).toEqual([{ id: 1, hintLevel: 1 }, { id: 1, hintLevel: 2 }])
  for (const c of chat) expect(c.hintKey).toBeUndefined()
  // Третьей нет: окно отвечает само, без модели.
  const before = chat.length
  await chip.click()
  await expect(page.locator('.asst__msg--bot').last()).toContainText('две подсказки')
  await page.waitForTimeout(500)
  expect(chat.length).toBe(before)

  await page.keyboard.press('Escape')
  await fields.first().fill('like')
  await fields.nth(1).fill('like')
  await page.getByRole('button', { name: 'Отправить на проверку', exact: true }).click()
  await expect(page.getByText('Работа у преподавателя — ждём проверки')).toBeVisible()
  // Ответ ступени не несёт; сдача — ещё раз всё, что накопилось (на случай, если …/hint не дошла).
  expect(answers[1]).toEqual({ answer: 'like', correct: true })
  expect(submitBody).toEqual({ hintLevels: { 1: 2 } })
})
