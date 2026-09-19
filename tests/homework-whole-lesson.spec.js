import { test, expect } from '@playwright/test'

/**
 * Урок каталога, заданный на дом ЦЕЛИКОМ.
 *
 * Жалоба с урока: «когда даю это на дз, аудиозапись воспроизводится, но сами
 * задания не нажимаются». Такое назначение приходит ссылкой на файл урока, и
 * ученик открывал именно файл, в новой вкладке. В файле курса скрипта заданий
 * нет — варианты там просто кнопки без обработчиков, а запись, обычный
 * <audio>, играет. Живые задания у урока есть только в кабинете.
 *
 * Здесь проходится путь ученика: открыл задание → попал в урок кабинета, а не
 * в файл → запись на месте, вариант нажимается → «Назад» ведёт в домашку.
 */
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const FILE = 'https://files.example/production/course-catalog/a1/lessons/L01.html?mode=solo'

/** Материал целиком: ни карточки, ни id урока — только ссылка на файл. */
const УРОК = {
  id: 9,
  materialId: 12,
  materialTitle: 'My biography',
  materialType: 'LINK',
  isGraded: false,
  fileUrl: FILE,
  catalogLessonId: null,
  cardId: null,
  cardTitle: null,
  dueDate: '2026-12-31',
  files: [],
}

/**
 * Разбор урока — в той форме, что кладёт экстрактор админки: запись карточки
 * аудирования лежит полем блока и относительно файла урока. Колода слов — как в
 * любом настоящем уроке: без неё урок ушёл бы в очередь экранов плеера.
 */
const РАЗБОР = {
  title: 'My biography',
  steps: [
    { id: 's1', title: 'Words', blocks: [{ type: 'vocab', cards: [{ word: 'born', translationRu: 'родиться' }] }] },
    {
      id: 's2',
      title: 'Grammar',
      blocks: [{
        type: 'practice',
        title: 'Grammar',
        audio: { src: '../audio/A1_L1_6_2.mp3#t=3.59', title: 'Track 6.2' },
        questions: [{ id: 's2-c0', type: 'choice', prompt: 'Was it easy for them to practise?', options: ["No, it wasn't.", 'Yes, it was.'], answer: "No, it wasn't." }],
      }],
    },
  ],
}

const КАТАЛОГ = [{
  id: 1, code: 'A1', label: 'A1',
  units: [{ id: 1, name: 'Unit 1', lessons: [{ id: 314, code: 'L01-1TO1', title: 'My biography', type: 'def', mode: 'solo', fileUrl: FILE, hasContent: true }] }],
}]

async function openHomework(page) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Зере', role: 'STUDENT', languageLevel: 'A1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([УРОК])))
  await page.route('**/mobile/course-catalog', (r) => r.fulfill(json(КАТАЛОГ)))
  await page.route('**/mobile/course-catalog/lessons/314/content', (r) => r.fulfill(json({ id: 314, title: 'My biography', fileUrl: FILE, content: РАЗБОР, complete: true })))
  await page.route('**/mobile/course-catalog/lessons/314/answers', (r) => r.fulfill(json({ progressJson: null })))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-detail__title')).toHaveText('My biography')
}

test('урок целиком открывается в кабинете, а не файлом без живых заданий', async ({ page, context }) => {
  await openHomework(page)

  const вкладки = []
  context.on('page', (p) => вкладки.push(p))
  await page.getByRole('button', { name: 'Открыть задание' }).click()

  await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Grammar', exact: true }).click()

  // Запись карточки на месте и смотрит в хранилище урока, а не в кабинет.
  await expect(page.locator('.lw-content audio')).toHaveAttribute(
    'src', 'https://files.example/production/course-catalog/a1/audio/A1_L1_6_2.mp3#t=3.59')

  // Вариант нажимается — ради этого урок и открыт здесь.
  const вариант = page.locator('.lw-content .lw-opt', { hasText: "No, it wasn't." })
  await вариант.click()
  await expect(вариант).toHaveAttribute('aria-pressed', 'true')

  expect(вкладки).toHaveLength(0)
})

test('«Назад» из урока возвращает в домашнюю работу', async ({ page }) => {
  await openHomework(page)
  await page.getByRole('button', { name: 'Открыть задание' }).click()
  await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })

  await page.locator('.lw-doc__back').click()
  await expect(page.locator('.hw-detail__title')).toHaveText('My biography')
})
