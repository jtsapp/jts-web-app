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

const IN_REVIEW = {
  id: 8, studentId: 116, title: 'Unit 5 · Modals', status: 'IN_REVIEW',
  // Срок уже прошёл: до починки такая работа читалась ученику как «Просрочено»,
  // хотя опаздывать ему не с чем — она на столе у преподавателя.
  dueDate: '2026-08-10', createdByName: 'Адильжан Алимжанов', createdAt: '2026-08-05T10:00:00',
  exercises: [], materials: [], submissions: [{ ...ANSWER_FILE, id: 4 }],
}

/** Логин ученика + бэкенд, отвечающий заготовленными данными. */
async function signIn(page, homework, assignments = []) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json(homework)))
  // Задания с живых уроков (назначенные материалы) — вторая половина списка.
  await page.route('**/student/assignments', (r) => r.fulfill(json(assignments)))
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

test('задание с живого урока видно в списке и открывается кнопкой', async ({ page }) => {
  await signIn(page, [REVIEWED], [{
    id: 5, materialId: 12, materialTitle: 'Present Perfect · practice test',
    materialType: 'INTERACTIVE_HTML', isGraded: true, fileUrl: 'https://files.example/m.html',
    dueDate: '2026-08-25', teacherScore: null, teacherFeedback: null, gradedAt: null,
  }])

  await page.goto('/?screen=homework')

  // Назначенный материал стоит выше проверенной работы (ждёт действий ученика).
  await expect(page.getByText('Present Perfect · practice test').first()).toBeVisible()
  await expect(page.getByText('Задание с урока').first()).toBeVisible()
  await page.getByText('Present Perfect · practice test').first().click()
  await expect(page.getByRole('button', { name: 'Открыть задание' })).toBeVisible()
})

// Регрессия: пятый статус бэкенда (преподаватель взял работу в проверку) клиент
// не разбирал вовсе — бейдж читался «Задано», а с прошедшим сроком «Просрочено»,
// и ни слова о том, почему в работе ничего нельзя сделать.
test('взятая преподавателем работа читается как «На проверке» и ничего не просит', async ({ page }) => {
  await signIn(page, [IN_REVIEW])

  await page.goto('/?screen=homework')

  await expect(page.locator('.hw-detail .hw-badge')).toHaveText('На проверке')
  await expect(page.getByText('Работа у преподавателя — ждём проверки')).toBeVisible()
  await expect(page.locator('.hw-upload__input')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отправить на проверку' })).toHaveCount(0)
  // Присланный файл остаётся виден — его просто нельзя убрать.
  await expect(page.getByRole('link', { name: 'answer.jpg' })).toBeVisible()
  await expect(page.locator('.hw-file__remove')).toHaveCount(0)
})
