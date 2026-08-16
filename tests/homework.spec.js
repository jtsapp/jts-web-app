import { test, expect } from '@playwright/test'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const TASK_FILE = { id: 1, fileName: 'unit3-task.pdf', url: 'https://files.example/unit3-task.pdf', kind: 'TASK' }
const ANSWER_FILE = { id: 9, fileName: 'answer.jpg', url: 'https://files.example/answer.jpg', kind: 'SUBMISSION' }

const ASSIGNED = {
  id: 7, studentId: 116, title: 'Unit 3 · Present Perfect', status: 'ASSIGNED',
  dueDate: '2026-08-22', createdByName: 'Адильжан Алимжанов', createdAt: '2026-08-15T10:00:00',
  exercises: [], materials: [TASK_FILE], submissions: [],
}
const REVIEWED = {
  id: 6, studentId: 116, title: 'Unit 2 · Daily routine', status: 'COMPLETED',
  dueDate: '2026-08-08', createdByName: 'Адильжан Алимжанов', createdAt: '2026-08-01T10:00:00',
  grade: 5, teacherComment: 'Отличная работа, следи за артиклями',
  exercises: [], materials: [], submissions: [{ ...ANSWER_FILE, id: 5 }],
}

/** Логин ученика + бэкенд, отвечающий заготовленными данными. */
async function signIn(page, homework) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json(homework)))
}

test('ученик скачивает задание, прикладывает файл и отправляет работу', async ({ page }) => {
  await signIn(page, [ASSIGNED, REVIEWED])
  await page.route('**/media/upload', (r) => r.fulfill(json({ url: 'https://files.example/answer.jpg', fileId: 'f1' })))
  await page.route('**/admin/homework/7/submission-materials', (r) =>
    r.fulfill(json({ ...ASSIGNED, submissions: [ANSWER_FILE] })))
  await page.route('**/admin/homework/7/submit', (r) =>
    r.fulfill(json({ ...ASSIGNED, status: 'SUBMITTED', submissions: [ANSWER_FILE] })))

  await page.goto('/?screen=homework')

  // Задание преподавателя видно и ведёт на файл.
  await expect(page.getByRole('link', { name: 'unit3-task.pdf' })).toHaveAttribute('href', TASK_FILE.url)
  // Пока файла нет — отправлять нечего.
  await expect(page.getByRole('button', { name: 'Отправить на проверку' })).toBeDisabled()

  await page.setInputFiles('.hw-upload__input', {
    name: 'answer.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg'),
  })

  await expect(page.getByRole('link', { name: 'answer.jpg' })).toBeVisible()
  await page.getByRole('button', { name: 'Отправить на проверку' }).click()
  await expect(page.getByText('Работа у преподавателя — ждём проверки')).toBeVisible()
})

test('проверенная работа показывает оценку и больше не принимает файлы', async ({ page }) => {
  await signIn(page, [REVIEWED])

  await page.goto('/?screen=homework')

  await expect(page.locator('.hw-grade__num')).toHaveText('5')
  await expect(page.getByText('Отличная работа, следи за артиклями')).toBeVisible()
  await expect(page.locator('.hw-upload__input')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отправить на проверку' })).toHaveCount(0)
})
