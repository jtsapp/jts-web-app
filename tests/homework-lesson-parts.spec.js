import { test, expect } from '@playwright/test'

/**
 * Одна домашка на занятие (spec §5, §9): выданный с занятия материал —
 * теперь часть чьей-то домашней работы (homework.materialParts), а не своя
 * карточка списка. Ученик видит её прямо в ленте работы, в порядке фактической
 * выдачи вместе с пачками вопросов, и сдаёт всё одной кнопкой — у части своей
 * «Сдать» нет вовсе.
 *
 * Приёмка (spec §12.2-3): часть-материал встаёт по времени выдачи, «Открыть»
 * показывает урок так же, как отдельную выдачу (та же рамка render-эндпоинта),
 * а сдаёт работу целиком одна «Отправить на проверку».
 */
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const ВОПРОС = { id: 'q1', type: 'choice', prompt: 'She ___ a teacher.', options: ['is', 'are'], answer: 'is' }

// Часть-материал выдана РАНЬШЕ пачки вопросов — обязана встать выше в ленте.
const ЧАСТЬ = {
  id: 40, materialId: 14, materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML', isGraded: true, fileUrl: 'https://files.example/m.html',
  stageTitlesSnapshot: 'Урок 1 · целиком',
  createdAt: '2026-09-28T08:00:00', status: 'ASSIGNED', isOverdue: false,
  homeworkAssignmentId: 7, files: [], teacherScore: null, teacherFeedback: null, gradedAt: null,
  closedWithoutSubmission: false,
}

const РАБОТА = {
  id: 7, studentId: 116, title: 'Домашнее задание из урока 28.09', status: 'ASSIGNED',
  dueDate: '2026-12-31', createdByName: 'Адильжан Алимжанов', createdAt: '2026-09-28T08:00:00',
  materials: [], submissions: [],
  exercises: [{
    id: 1, batchId: 'b1', addedAt: '2026-09-28T09:00:00', lessonTitle: 'Урок 2', question: ВОПРОС,
  }],
  materialParts: [ЧАСТЬ],
}

async function openHomework(page) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([РАБОТА])))
  // Часть привязана (homeworkAssignmentId=7) — /student/assignments её тоже
  // отдаёт (совместимость со старым кабинетом, spec §7.1), но новый список её
  // прячет: она всплывает только внутри своей домашней работы.
  await page.route('**/student/assignments', (r) => r.fulfill(json([ЧАСТЬ])))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-detail__title')).toHaveText('Домашнее задание из урока 28.09')
}

test('привязанная часть не своя карточка списка — одна карточка на всю домашку', async ({ page }) => {
  await openHomework(page)

  // Список слева — ровно одна карточка (работа), а не работа плюс материал.
  await expect(page.locator('.hw-card')).toHaveCount(1)
  await expect(page.locator('.hw-card').getByText('Present Perfect · practice test')).toHaveCount(0)
  // Заголовок части виден — но только внутри детали работы, где она часть ленты.
  await expect(page.locator('.hw-detail').getByText('Present Perfect · practice test')).toBeVisible()
  // Счётчик частей на карточке подтверждает: это правда одна работа из двух частей.
  await expect(page.locator('.hw-card__parts')).toHaveText('2 частей')
})

test('часть-материал встаёт в ленте по времени выдачи — раньше пачки вопросов', async ({ page }) => {
  await openHomework(page)

  const заголовки = page.locator('.hw-block--exercises .hw-block__title, .hw-block--material .hw-block__title')
  await expect(заголовки).toHaveCount(2)
  await expect(заголовки.nth(0)).toHaveText('Present Perfect · practice test')
  await expect(заголовки.nth(1)).toHaveText('Урок 2')
})

test('у части нет своей кнопки сдачи — только «Открыть задание», сдаёт всю работу общая кнопка', async ({ page }) => {
  await openHomework(page)

  await expect(page.getByRole('button', { name: 'Открыть задание' })).toBeVisible()
  await expect(page.getByRole('button', { name: /сдать/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отправить на проверку' })).toBeVisible()
})

test('«Открыть задание» у части — та же рамка render-эндпоинта, что у отдельной выдачи', async ({ page }) => {
  await openHomework(page)
  await page.route('**/student/assignments/40/start', (r) => r.fulfill(json({ id: 99 })))

  await page.getByRole('button', { name: 'Открыть задание' }).click()

  const frame = page.locator('.hw-frame__iframe')
  await expect(frame).toBeVisible()
  const src = await frame.getAttribute('src')
  expect(src).toContain('/student/materials/14/render')
  expect(src).toContain('assignmentId=40')
  expect(src).toContain('sessionId=99')
})

test('одна «Отправить на проверку» сдаёт всю работу вместе с частью', async ({ page }) => {
  await openHomework(page)
  // Ответ уезжает по кнопке «Проверить» у каждого задания, но нажимать её
  // ученик не обязан — недосланное досылает сама сдача (HomeworkPage.handleSubmit).
  await page.route('**/admin/homework/7/exercises/1/answer', (r) => r.fulfill(json(РАБОТА)))
  await page.route('**/admin/homework/7/submit', (r) =>
    r.fulfill(json({ ...РАБОТА, status: 'SUBMITTED', exercises: [{ ...РАБОТА.exercises[0], studentAnswer: 'is' }] })))

  await page.locator('.hw-exercise').getByText('is', { exact: true }).click()
  await page.getByRole('button', { name: 'Отправить на проверку' }).click()

  await expect(page.getByText('Работа у преподавателя — ждём проверки')).toBeVisible()
})
