import { test, expect } from '@playwright/test'

/**
 * Карточка урока, заданная на дом, закрывается ВЛОЖЕНИЕМ.
 *
 * Проверяемых заданий в теории нет, сессии она не заводит, а срок выдача
 * получает по умолчанию — без файла такая работа краснела у ученика
 * просроченной и оставалась такой навсегда: снять это могла только ручная
 * оценка преподавателя.
 *
 * Здесь проходится весь путь ученика целиком: увидел просрочку → приложил файл
 * → просрочка ушла, работа у преподавателя.
 */
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

/** Срок в прошлом: без вложения такая карточка обязана быть просроченной. */
const КАРТОЧКА = {
  id: 5,
  materialId: 12,
  materialTitle: 'Unit 3 · Seasons',
  materialType: 'LINK',
  catalogLessonId: 314,
  cardId: 'cad401560',
  cardTitle: 'Итог урока',
  dueDate: '2020-01-01',
  files: [],
}

const ВЛОЖЕНИЕ = { id: 77, fileName: 'answer.pdf', url: 'https://files.example/answer.pdf' }

async function openHomework(page, { assignment = КАРТОЧКА } = {}) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([assignment])))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-detail__title')).toHaveText('Итог урока')
}

test('без вложения карточка просрочена, и приложить файл — единственный выход', async ({ page }) => {
  await openHomework(page)

  await expect(page.locator('.hw-detail .hw-badge--overdue')).toBeVisible()
  // Кнопки «Отправить на проверку» у назначения нет вовсе — об этом и сказано
  // подсказкой, иначе ученик ищет её глазами.
  await expect(page.locator('.hw-detail')).toContainText('приложите фото или PDF')
  await expect(page.locator('.hw-upload__input')).toBeAttached()
})

test('приложенный файл снимает просрочку и уходит на назначение', async ({ page }) => {
  await openHomework(page)

  let телоЗапроса = null
  await page.route('**/media/upload', (r) => r.fulfill(json({ url: ВЛОЖЕНИЕ.url, fileId: 'f1' })))
  await page.route('**/student/assignments/5/files', (r) => {
    телоЗапроса = r.request().postDataJSON()
    return r.fulfill(json({ ...КАРТОЧКА, files: [ВЛОЖЕНИЕ] }))
  })

  await page.locator('.hw-upload__input').setInputFiles({
    name: 'answer.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4'),
  })

  // Файл виден, бейдж сменился на «на проверке», просрочки больше нет.
  await expect(page.locator('.hw-file__name')).toHaveText('answer.pdf')
  await expect(page.locator('.hw-detail .hw-badge--submitted')).toBeVisible()
  await expect(page.locator('.hw-detail .hw-badge--overdue')).toHaveCount(0)
  expect(телоЗапроса).toEqual({ fileName: 'answer.pdf', url: ВЛОЖЕНИЕ.url })
})

test('свой файл можно снять, пока работу не проверили', async ({ page }) => {
  await openHomework(page, { assignment: { ...КАРТОЧКА, files: [ВЛОЖЕНИЕ] } })

  await page.route('**/student/assignments/5/files/77', (r) => r.fulfill(json({ ...КАРТОЧКА, files: [] })))
  await page.locator('.hw-file__remove').click()

  await expect(page.locator('.hw-file__name')).toHaveCount(0)
  await expect(page.locator('.hw-detail .hw-badge--overdue')).toBeVisible()
})

/**
 * Оценка уже стоит под тем составом файлов, который преподаватель открывал, —
 * менять его ученику больше нельзя. То же правило, что и у домашки.
 */
test('проверенную работу ученик не дополняет', async ({ page }) => {
  await openHomework(page, {
    assignment: { ...КАРТОЧКА, files: [ВЛОЖЕНИЕ], teacherScore: 5, gradedAt: '2026-09-11T10:00:00' },
  })

  await expect(page.locator('.hw-file__name')).toHaveText('answer.pdf')
  await expect(page.locator('.hw-upload__input')).toHaveCount(0)
  await expect(page.locator('.hw-file__remove')).toHaveCount(0)
})

/** У материала целиком свой цикл — вложения ему не предлагаем. */
test('у материала без карточки вложений не спрашивают', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([
    { ...КАРТОЧКА, cardId: null, cardTitle: null, catalogLessonId: null },
  ])))
  await page.goto('/?screen=homework')

  await expect(page.locator('.hw-detail__title')).toHaveText('Unit 3 · Seasons')
  await expect(page.locator('.hw-upload__input')).toHaveCount(0)
})
