import { test, expect } from '@playwright/test'

// Регрессия: ответы и отметки «проверено» — свои у каждого материала (и пишутся
// отдельной строкой прогресса), а id шагов внутри урока сквозные: s1, s2…,
// карточки s1:0. Пока смена вкладки материала состояние не трогала, второй
// материал открывался уже «проверенным»: варианты в его первой карточке
// выключены до того, как ученик их увидел, а под совпавшими id подставлены
// ответы первого.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 116 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

const FILE_A = 'https://files-dev.justtostudy.kz/course-catalog/L01.html?mode=self'
const FILE_B = 'https://files-dev.justtostudy.kz/course-catalog/L02.html?mode=self'

const OCC = [
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-02T03:00:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
]

const SECTIONS = [
  {
    id: 1,
    title: 'Раздел 1',
    position: 0,
    materials: [
      { id: 5, materialId: 5, title: 'Материал A', fileUrl: FILE_A },
      { id: 6, materialId: 6, title: 'Материал B', fileUrl: FILE_B },
    ],
  },
]

const CATALOG = [
  { id: 1, title: 'A1', units: [{ id: 1, title: 'Unit 1', lessons: [
    { id: 101, title: 'Lesson A', fileUrl: FILE_A },
    { id: 102, title: 'Lesson B', fileUrl: FILE_B },
  ] }] },
]

// У обоих уроков первый шаг называется одинаково — s1: id шагов внутри урока
// сквозные, это и есть причина коллизии.
const lessonContent = (title, optionPrefix) => ({
  title,
  steps: [
    {
      id: 's1',
      title: 'Шаг 1',
      blocks: [
        {
          type: 'practice',
          questions: [
            {
              id: 's1-c0',
              type: 'choice',
              prompt: title,
              options: [`${optionPrefix} один`, `${optionPrefix} два`],
              answer: `${optionPrefix} один`,
            },
          ],
        },
      ],
    },
  ],
})

// Прогресс материала A: ответ дан и шаг проверен. У B прогресса нет вовсе.
const PROGRESS_A = JSON.stringify({
  shape: 'lesson-steps',
  answers: { 's1-c0': 'A один' },
  checked: ['s1:0'],
  stepId: 's1',
})

async function openLesson(page) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt('STUDENT'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 })))
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json(SECTIONS)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', participants: [] })))
  await page.route('**/mobile/course-catalog', (r) => r.fulfill(json(CATALOG)))
  await page.route('**/mobile/course-catalog/lessons/101/content', (r) =>
    r.fulfill(json({ id: 101, title: 'Lesson A', fileUrl: FILE_A, content: lessonContent('Lesson A', 'A') })))
  await page.route('**/mobile/course-catalog/lessons/102/content', (r) =>
    r.fulfill(json({ id: 102, title: 'Lesson B', fileUrl: FILE_B, content: lessonContent('Lesson B', 'B') })))
  await page.route('**/student/lessons/14/materials/5/progress', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json({ eventsJson: PROGRESS_A })) : r.fulfill(json({})))
  await page.route('**/student/lessons/14/materials/6/progress', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json({ eventsJson: null })) : r.fulfill(json({})))

  await page.goto('/')
  const menuButton = page.locator('.mtop__menu')
  await menuButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await menuButton.isVisible()) await menuButton.click()
  await page.getByText('Уроки', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Присоединиться к уроку' }).first().click()
  await expect(page.getByText('Живой урок')).toBeVisible()
}

test('переход на второй материал не тащит за собой ответы и «проверено» первого', async ({ page }) => {
  await openLesson(page)

  // Материал A: прогресс восстановлен — карточка проверена, варианты закрыты.
  await expect(page.getByText('Lesson A').first()).toBeVisible()
  const optsA = page.locator('.lw-opt')
  await expect(optsA.first()).toBeDisabled()

  await page.getByRole('button', { name: 'Материал B' }).click()

  // Материал B: свой урок, свои варианты — и они живые.
  await expect(page.getByText('Lesson B').first()).toBeVisible()
  const optsB = page.locator('.lw-opt')
  await expect(optsB.first()).toBeEnabled()
  // Ответа материала A под тем же id s1-c0 здесь быть не должно.
  await expect(page.locator('.lw-opt.is-selected')).toHaveCount(0)
})
