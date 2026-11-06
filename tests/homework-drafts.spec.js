import { test, expect } from '@playwright/test'

// Проверка настоящего экрана; API — управляемый стенд, чтобы проверить перезаход без Web Storage.
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

test('несданная домашка переживает обновление без хранилища браузера и не отправляется на проверку сама', async ({ page }) => {
  const work = {
    id: 7, studentId: 116, title: 'Продолжить домашку', status: 'ASSIGNED',
    materials: [], submissions: [], exercises: [1, 2].map((id) => ({
      id, batchId: 'one', orderIndex: id, lessonTitle: 'Черновик',
      question: { id: `q${id}`, type: 'gap', gapBefore: 'I', gapAfter: 'coffee', answers: ['like'] },
    })),
  }
  let answersSent = 0
  let submissions = 0
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('hw-')) throw new DOMException('full', 'QuotaExceededError')
      return set.call(this, key, value)
    }
  })
  await page.route('https://dev-server.justtostudy.kz/**', (r) => r.fulfill(json({})))
  await page.route('**/api/profile?*', (r) => r.fulfill(json({ profile: null })))
  await page.route('**/cabinet/my-sections', (r) => r.fulfill(json({ known: true, allowed: ['homework'] })))
  await page.route('**/user/legal-documents', (r) => r.fulfill(json({ version: '2026-10-29', acceptedAt: '2026-10-30T10:00:00Z' })))
  await page.route('**/api/practice/state', (r) => r.fulfill(json({})))
  await page.route('**/user/me', (r) => r.fulfill(json({ id: 116, isDemoAccount: false, languageLevel: 'A2' })))
  await page.route('**/user/language-level', (r) => r.fulfill(json({ languageLevel: 'A2' })))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: {
    id: 116, name: 'Ученик', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2',
  } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([work])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([])))
  await page.route('**/admin/homework/7/exercises/*/draft', async (r) => {
    const id = Number(r.request().url().match(/exercises\/(\d+)/)[1])
    work.exercises.find((e) => e.id === id).draftAnswer = r.request().postDataJSON().answer
    await r.fulfill({ status: 204 })
  })
  await page.route('**/admin/homework/7/exercises/*/answer', async (r) => {
    answersSent++
    const id = Number(r.request().url().match(/exercises\/(\d+)/)[1])
    work.exercises.find((e) => e.id === id).studentAnswer = r.request().postDataJSON().answer
    await r.fulfill(json(work))
  })
  await page.route('**/admin/homework/7/submit', async (r) => {
    submissions++
    work.status = 'SUBMITTED'
    await r.fulfill(json(work))
  })
  await page.goto('/?screen=homework', { waitUntil: 'domcontentloaded' })
  const fields = page.locator('.hw-exercise input')
  await expect(fields).toHaveCount(2, { timeout: 45000 })
  await fields.first().fill('unfinished answer')
  await expect(page.getByRole('status')).toContainText('Черновик сохранён')
  expect(work.exercises[0].draftAnswer).toBe('unfinished answer')
  expect(answersSent).toBe(0)
  expect(submissions).toBe(0)
  await page.reload()
  await expect(fields.first()).toHaveValue('unfinished answer')
  await expect(fields.nth(1)).toHaveValue('')
  await fields.nth(1).fill('like')
  await page.getByRole('button', { name: 'Отправить на проверку', exact: true }).click()
  await expect(page.getByText('Работа у преподавателя — ждём проверки')).toBeVisible()
  expect(answersSent).toBe(2)
  expect(submissions).toBe(1)
  expect(work.exercises.map((e) => e.studentAnswer)).toEqual(['unfinished answer', 'like'])
})
