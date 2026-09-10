import { test, expect } from '@playwright/test'

// Виджет «Словарь» в правой колонке Практики. Новая логика: показываем только
// сохранённые слова, у каждого — корзина для удаления; вкладки «Изучено» и
// кнопки «Практика по словарю» больше нет. Данные и авторизация замоканы.

const WORDS = [
  { id: 1, word: 'window', translation: 'окно', learned: false },
  { id: 2, word: 'green', translation: 'зелёный', learned: true },
]

async function mockAuthAndWords(page, deleted) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A2' },
      }),
    }),
  )
  const handler = (route) => {
    if (route.request().method() === 'DELETE') {
      deleted.push(route.request().url())
      return route.fulfill({ status: 200, body: '' })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(WORDS),
    })
  }
  await page.route('**/mobile/saved-words', handler)
  await page.route('**/mobile/saved-words/**', handler)
}

test.describe('Практика — виджет «Словарь»', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'правая колонка — на десктопе')

  test('только сохранённые слова с корзиной; без «Изучено» и «Практика по словарю»', async ({
    page,
  }) => {
    const deleted = []
    await mockAuthAndWords(page, deleted)
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const side = page.locator('.pp__side')
    await expect(side).toBeVisible({ timeout: 15000 })

    // Убрано: вкладка «Изучено» и кнопка «Практика по словарю».
    await expect(page.locator('.pp-voc__cta')).toHaveCount(0)
    await expect(side).not.toContainText('Изучено')

    // Счётчик сохранённых + оба слова, у каждого — корзина.
    await expect(side.locator('.pp-voc__count')).toContainText('Сохранено')
    await expect(page.locator('.pp-word')).toHaveCount(2, { timeout: 10000 })
    await expect(page.locator('.pp-word__del')).toHaveCount(2)

    // Удаление первого слова: пропадает из списка + DELETE уходит на бэкенд.
    await page.locator('.pp-word__del').first().click()
    await expect(page.locator('.pp-word')).toHaveCount(1)
    await expect(page.locator('.pp-word__text b')).toHaveText('green')
    expect(deleted.some((u) => u.endsWith('/mobile/saved-words/1'))).toBeTruthy()
  })
})
