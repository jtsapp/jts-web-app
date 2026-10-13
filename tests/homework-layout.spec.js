import { test, expect } from '@playwright/test'

/**
 * Раскладка «Домашней работы»: задание не должно жить в маленьком окне.
 *
 * - Рамка открытого задания разворачивается во весь экран (HomeworkFrame) —
 *   поверх кабинета, без перезагрузки урока: решённое в нём не теряется.
 * - На телефоне список и задание — два экрана: сразу открыто задание, к списку
 *   ведёт «Все задания». Раньше это была простыня «весь список, под ним
 *   задание», и рамка с уроком стояла где-то внизу шириной меньше 300px.
 *
 * Прогоняется в обоих проектах playwright.config.js (390×844 и 1440×900);
 * проверки, которые есть только у одной ширины, разведены по viewport.
 */
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const ЧАСТЬ = {
  id: 40, materialId: 14, materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML', isGraded: true, fileUrl: 'https://files.example/m.html',
  stageTitlesSnapshot: 'Урок 1 · целиком',
  createdAt: '2026-09-28T08:00:00', status: 'ASSIGNED', isOverdue: false,
  homeworkAssignmentId: 7, files: [], teacherScore: null, teacherFeedback: null, gradedAt: null,
  closedWithoutSubmission: false,
}

const работа = (id, title, parts = []) => ({
  id, studentId: 116, title, status: 'ASSIGNED',
  dueDate: '2026-12-31', createdByName: 'Адильжан Алимжанов', createdAt: '2026-09-28T08:00:00',
  materials: [], submissions: [], exercises: [], materialParts: parts,
})

const РАБОТЫ = [
  работа(7, 'Домашнее задание из урока 28.09', [ЧАСТЬ]),
  работа(8, 'Домашнее задание из урока 21.09', [{ ...ЧАСТЬ, id: 41, homeworkAssignmentId: 8 }]),
]

const УРОК = '<!doctype html><html><body><h1>Unit 3</h1><button>has been</button></body></html>'

const узкий = (viewport) => viewport.width <= 900

async function openHomework(page) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', phone: '77001234567', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json(РАБОТЫ)))
  await page.route('**/student/assignments', (r) => r.fulfill(json([])))
  await page.route('**/student/assignments/*/start', (r) => r.fulfill(json({ id: 99 })))
  await page.route((url) => url.pathname.includes('/student/materials/'),
    (r) => r.fulfill({ status: 200, contentType: 'text/html', body: УРОК }))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-detail__title')).toHaveText(РАБОТЫ[0].title)
}

test('«Во весь экран» закрывает весь вьюпорт и не перезагружает урок', async ({ page, viewport }) => {
  await openHomework(page)
  await page.getByRole('button', { name: 'Открыть задание' }).click()
  const рамка = page.locator('.hw-frame__iframe')
  await expect(page.frameLocator('.hw-frame__iframe').getByRole('heading', { name: 'Unit 3' })).toBeVisible()

  // Метка в документе урока: перезагрузись рамка при развороте — она пропадёт.
  const урок = await (await рамка.elementHandle()).contentFrame()
  await урок.evaluate(() => { window.__jtsMark = 'решено' })

  await page.getByRole('button', { name: 'Во весь экран' }).click()

  const обёртка = await page.locator('.hw-frame--full').boundingBox()
  expect(обёртка).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  // Рамке — всё, кроме шапки с «Свернуть»: заметно больше, чем было на странице.
  const развёрнута = await рамка.boundingBox()
  expect(развёрнута.width).toBe(viewport.width)
  expect(развёрнута.height).toBeGreaterThan(viewport.height - 100)
  await expect(page.getByRole('button', { name: 'Свернуть' })).toBeInViewport()
  expect(await урок.evaluate(() => window.__jtsMark)).toBe('решено')

  await page.getByRole('button', { name: 'Свернуть' }).click()
  await expect(page.locator('.hw-frame--full')).toHaveCount(0)
  expect(await урок.evaluate(() => window.__jtsMark)).toBe('решено')
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('Esc сворачивает развёрнутую рамку', async ({ page }) => {
  await openHomework(page)
  await page.getByRole('button', { name: 'Открыть задание' }).click()
  await page.getByRole('button', { name: 'Во весь экран' }).click()
  await expect(page.locator('.hw-frame--full')).toHaveCount(1)

  await page.keyboard.press('Escape')

  await expect(page.locator('.hw-frame--full')).toHaveCount(0)
})

test('телефон: сразу задание, «Все задания» — список, выбор — снова задание', async ({ page, viewport }) => {
  test.skip(!узкий(viewport), 'список и задание — два экрана только на узкой ширине')
  await openHomework(page)

  // Экран задания: списка не видно, зато есть дорога к нему.
  await expect(page.locator('.hw-list')).toBeHidden()
  const назад = page.getByRole('button', { name: /Все задания/ })
  await expect(назад).toBeVisible()
  await expect(назад).toContainText('2')

  await назад.click()
  await expect(page.locator('.hw-list')).toBeVisible()
  await expect(page.locator('.hw-detail')).toBeHidden()

  await page.locator('.hw-card', { hasText: РАБОТЫ[1].title }).click()
  await expect(page.locator('.hw-detail__title')).toHaveText(РАБОТЫ[1].title)
  await expect(page.locator('.hw-list')).toBeHidden()
})

test('телефон: рамка задания занимает почти всю ширину экрана', async ({ page, viewport }) => {
  test.skip(!узкий(viewport), 'про узкую ширину')
  await openHomework(page)
  await page.getByRole('button', { name: 'Открыть задание' }).click()

  const рамка = await page.locator('.hw-frame__iframe').boundingBox()
  // Было 290px из 390 — три вложенные карточки съедали по 16–18px с каждого края.
  expect(рамка.width).toBeGreaterThanOrEqual(viewport.width - 90)
  // И страница не уезжает вбок.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
})

test('десктоп: список и задание рядом, «Все задания» не нужна', async ({ page, viewport }) => {
  test.skip(узкий(viewport), 'про широкую раскладку')
  await openHomework(page)

  await expect(page.locator('.hw-list')).toBeVisible()
  await expect(page.locator('.hw-detail')).toBeVisible()
  await expect(page.getByRole('button', { name: /Все задания/ })).toBeHidden()
})
