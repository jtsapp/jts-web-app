import { test, expect } from '@playwright/test'

/**
 * Прогон по ВСЕМ типам заданий, которые умеет урок.
 *
 * Домашняя работа рисует задания теми же компонентами, что и живой урок
 * (HomeworkExercises заворачивает снимок вопроса в practice-блок и отдаёт его
 * PracticeBlock), поэтому один экран проверяет весь набор — и делает это
 * настоящими кликами в настоящем браузере, а не мока́ми.
 *
 * Проверяем не «отрисовалось», а то, на что жаловались: можно ли ОТВЕТИТЬ и
 * можно ли ПОМЕНЯТЬ ответ. Именно вторая половина и была сломана у пар.
 */
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const вопрос = (id, extra) => ({ id, ...extra })

/** Одно упражнение домашней работы = один снимок вопроса урока. */
const задание = (id, question) => ({
  id, title: `Задание ${id}`, question,
  batchId: 'batch-1', addedAt: '2026-09-01T10:00:00', lessonTitle: 'Все типы',
  orderIndex: id, hiddenFromStudent: false, needsAttention: false, completed: false,
})

const РАБОТА = {
  id: 7, studentId: 116, title: 'Все типы заданий', status: 'ASSIGNED',
  dueDate: '2026-12-31', createdByName: 'Адильжан Алимжанов', createdAt: '2026-09-01T10:00:00',
  materials: [], submissions: [],
  exercises: [
    задание(1, вопрос('q-choice', { type: 'choice', prompt: 'He ___ ready.', options: ['is', 'are'], answer: 'is' })),
    задание(2, вопрос('q-multi', { type: 'multi', prompt: 'Отметь глаголы', options: ['run', 'table', 'swim'], answers: ['run', 'swim'] })),
    задание(3, вопрос('q-pick', { type: 'pick', prompt: 'Как часто читаешь?', options: ['каждый день', 'иногда'] })),
    задание(4, вопрос('q-gap', { type: 'gap', gapBefore: 'I ', gapAfter: ' a student.', answers: ['am'] })),
    задание(5, вопрос('q-match', {
      type: 'match',
      pairs: [{ left: 'occasional', right: 'sometimes' }, { left: 'develop', right: 'to grow' }],
    })),
    задание(6, вопрос('q-order', { type: 'order', prompt: 'Собери', words: ['am', 'I', 'here'], answer: ['I', 'am', 'here'] })),
    задание(7, вопрос('q-chips', { type: 'chips', gapBefore: '', gapAfter: ' she busy?', bank: ['Is', 'Are'], answer: 'Is' })),
  ],
}

async function openHomework(page) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([РАБОТА])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([])))
  // Ответы уходят на сервер по «Проверить» — принимаем и возвращаем работу как есть.
  await page.route('**/admin/homework/7/exercises/**', (r) => r.fulfill(json(РАБОТА)))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-exercise')).toHaveCount(7)
}

/** Карточка одного задания: они идут в порядке exercises. */
const карточка = (page, n) => page.locator('.hw-exercise').nth(n - 1)

test('choice: можно ответить и переменить ответ', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 1)

  await q.getByText('are', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveText('are')

  await q.getByText('is', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveText('is')
})

test('multi: отмечается несколько и снимается повторным нажатием', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 2)

  await q.getByText('run', { exact: true }).click()
  await q.getByText('swim', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveCount(2)

  await q.getByText('run', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveCount(1)
})

test('pick: опрос про себя отвечается и переменяется', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 3)

  await q.getByText('иногда', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveText('иногда')

  await q.getByText('каждый день', { exact: true }).click()
  await expect(q.locator('.lw-opt.is-selected')).toHaveText('каждый день')
})

test('gap: пропуск набирается и переписывается', async ({ page }) => {
  await openHomework(page)
  const поле = карточка(page, 4).locator('input')

  await поле.fill('is')
  await expect(поле).toHaveValue('is')

  await поле.fill('am')
  await expect(поле).toHaveValue('am')
})

// То, с чего всё началось: пару можно было поставить, но нельзя переставить.
test('match: пара ставится, меняется и возвращается в банк', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 5)

  await q.locator('.lw-match__left').first().click()
  await q.getByRole('button', { name: 'sometimes' }).click()
  await expect(q.locator('.lw-match__left').first()).toContainText('sometimes')

  // Клик по слову с ответом возвращает определение в банк.
  await q.locator('.lw-match__left').first().click()
  await expect(q.locator('.lw-match__left').first()).toContainText('—')

  // И его можно отдать другому слову.
  await q.locator('.lw-match__left').nth(1).click()
  await q.getByRole('button', { name: 'sometimes' }).click()
  await expect(q.locator('.lw-match__left').nth(1)).toContainText('sometimes')
})

test('order: слова расставляются и снимаются', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 6)

  await q.locator('.lw-order__bank .lw-ochip').filter({ hasText: 'I' }).first().click()
  await q.locator('.lw-order__bank .lw-ochip').filter({ hasText: 'am' }).first().click()
  await expect(q.locator('.lw-ochip--placed')).toHaveCount(2)

  await q.locator('.lw-ochip--placed').first().click()
  await expect(q.locator('.lw-ochip--placed')).toHaveCount(0)
})

test('chips: слово из банка встаёт в пропуск', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 7)

  await q.locator('.lw-bank').getByText('Is', { exact: true }).click()
  await expect(q.locator('.lw-q__sentence')).toContainText('Is')
})

// «Проверить» есть у каждого задания и не уводит экран в ошибку.
test('каждое задание проверяется своей кнопкой', async ({ page }) => {
  await openHomework(page)
  await expect(page.getByRole('button', { name: 'Проверить' })).toHaveCount(7)

  await карточка(page, 1).getByText('is', { exact: true }).click()
  await карточка(page, 1).getByRole('button', { name: 'Проверить' }).click()
  await expect(page.locator('.hw-exercise__error')).toHaveCount(0)
})

// Вторая половина функциональности: что происходит ПОСЛЕ ответа.
test('«Проверить» недоступна, пока не ответили', async ({ page }) => {
  await openHomework(page)

  // Опрос и пропуск — типы, где нечего «выбрать по умолчанию».
  await expect(карточка(page, 3).getByRole('button', { name: 'Проверить' })).toBeDisabled()
  await expect(карточка(page, 4).getByRole('button', { name: 'Проверить' })).toBeDisabled()

  await карточка(page, 3).getByText('иногда', { exact: true }).click()
  await expect(карточка(page, 3).getByRole('button', { name: 'Проверить' })).toBeEnabled()
})

test('после «Проверить» задание закрывается и не притворяется живым', async ({ page }) => {
  await openHomework(page)
  const q = карточка(page, 1)

  await q.getByText('is', { exact: true }).click()
  await q.getByRole('button', { name: 'Проверить' }).click()

  // Закрыто по-настоящему...
  await expect(q.locator('.lw-opt').first()).toBeDisabled()
  // ...и выглядит закрытым: курсор-рука на неработающем варианте звал жать ещё.
  expect(await q.locator('.lw-opt').first().evaluate((e) => getComputedStyle(e).cursor)).toBe('default')
})
