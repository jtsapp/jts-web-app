import { test, expect } from '@playwright/test'

test.describe('lesson workspace', () => {
  test('рендерит 3 колонки, маршрут, практику, чат', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    const root = page.locator('[data-testid="lesson-workspace"]')
    await expect(root).toBeVisible({ timeout: 20000 })
    // маршрут: 9 шагов
    await expect(page.locator('.lw-route__step')).toHaveCount(9)
    // центр: теория + инфо-блок + практика присутствуют
    await expect(page.locator('.lw-theory').first()).toBeVisible()
    await expect(page.locator('.lw-info').first()).toBeVisible()
    await expect(page.locator('.lw-practice').first()).toBeVisible()
    // match-вопрос: рендерится с левыми строками (по числу пар)
    const match = page.locator('.lw-q--match').first()
    await expect(match).toBeVisible()
    await expect(match.locator('.lw-match__left')).toHaveCount(3)
    // правая колонка: чат сразу под звонком
    await expect(page.locator('.lw-topics')).toHaveCount(0)
    await expect(page.locator('.lw-chat')).toBeVisible()
    // отправка сообщения добавляет пузырь
    const before = await page.locator('.lw-chat__msg').count()
    await page.locator('.lw-chat__input').fill('привет')
    await page.locator('.lw-chat__send').click()
    await expect(page.locator('.lw-chat__msg')).toHaveCount(before + 1)
    // клик по другому шагу меняет контент
    await page.locator('.lw-route__step').nth(2).click()
    await expect(root).toBeVisible()
  })

  test('проверка практики красит ответы', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
    // выбрать неверный вариант в первом choice и проверить
    const firstChoice = page.locator('.lw-q--choice').first()
    await firstChoice.locator('.lw-opt').first().click()
    await page.locator('.lw-practice__check').first().click()
    await expect(firstChoice.locator('.lw-opt.is-correct')).toHaveCount(1)
  })

  test('match — выбор пары красится после проверки', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
    const match = page.locator('.lw-q--match').first()
    await expect(match.locator('.lw-match__left')).toHaveCount(3)
    // выбрать первое слово слева, затем первый вариант справа — пара сложилась
    await match.locator('.lw-match__left').first().click()
    await match.locator('.lw-match__right').first().click()
    await expect(match.locator('.lw-match__left').first()).toHaveClass(/is-selected|is-filled/)
    await page.locator('.lw-practice__check').first().click()
    // ровно одна левая строка окрашена (верно или неверно) — остальные пары не тронуты
    await expect(match.locator('.lw-match__left.is-correct, .lw-match__left.is-wrong')).toHaveCount(1)
  })
})

/**
 * Карточка урока, заданная на дом.
 *
 * Диплинк `?card=<адрес>` — то же, чем открывает задание домашняя работа
 * (App.jsx: handleNav('lesson-workspace', {catalogLessonId, cardId})), только
 * без урока каталога: показательный урок экрана годится ровно так же и не
 * требует ни токена, ни бэкенда. Проверяется вся проводка разом — адрес из URL,
 * состояние App, проп экрана, переезд на шаг карточки и подсветка.
 */
test.describe('карточка урока, заданная на дом', () => {
  // Адрес блока «Итог урока» — последний шаг показательного урока (s9).
  // Считается по содержимому (src/lib/lessonCardId.js): правка этого блока
  // адрес меняет, и тест об этом честно скажет.
  const ИТОГ_УРОКА = 'cd55aa29a'

  test('открывается шаг карточки, а не начало урока', async ({ page }) => {
    await page.goto(`/?screen=lesson-workspace&card=${ИТОГ_УРОКА}`)
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })

    await expect(page.locator('.ls-tab--active')).toHaveText('Итог урока')
    await expect(page.locator('.lw-q--live-here')).toHaveCount(1)
  })

  test('пропавшая карточка не подменяется соседней', async ({ page }) => {
    // Карточку переписали — говорим прямо. Молчаливое начало урока читалось бы
    // как «задание — вот это».
    await page.goto('/?screen=lesson-workspace&card=cdeadbeef')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })

    await expect(page.locator('.lw-sysbanner')).toContainText('в уроке его больше нет')
    await expect(page.locator('.lw-q--live-here')).toHaveCount(0)
  })
})
