import { test, expect } from '@playwright/test'

test.describe('lesson workspace', () => {
  /**
   * Экран урока без id открывается показательным уроком, и тот идёт ДОКУМЕНТОМ:
   * в нём есть match-вопрос, а плеер такого типа не знает — значит очередь
   * экранов не собирается и показывается лента блоков со вкладками шагов
   * (см. liveSteps.js и LessonWorkspacePage).
   *
   * Здесь раньше проверялись три колонки, маршрут слева и чат справа — разметка
   * живого урока, которой этот экран не рисует. Тест падал с тех пор, как
   * самостоятельный урок отделили от живого, и держался за то, чего нет.
   */
  test('показательный урок открывается документом со вкладками шагов', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    const root = page.locator('[data-testid="lesson-workspace"]')
    await expect(root).toBeVisible({ timeout: 20000 })

    await expect(page.locator('.lw-doc')).toHaveCount(1)
    await expect(page.locator('.ls-tab')).toHaveCount(9)
    // Содержимое первого шага: правило, заметка и практика.
    await expect(page.locator('.lw-theory').first()).toBeVisible()
    await expect(page.locator('.lw-info').first()).toBeVisible()
    await expect(page.locator('.lw-practice').first()).toBeVisible()
    // match-вопрос — тот самый, из-за которого урок идёт документом.
    await expect(page.locator('.lw-q--match').first()).toBeVisible()

    // Переключение шага меняет содержимое: на третьем шаге практики нет вовсе,
    // одно правило — по этому и видно, что показывается другой шаг, а не тот же.
    await page.locator('.ls-tab').nth(2).click()
    await expect(page.locator('.ls-tab--active')).toHaveText('Правило Present Simple')
    await expect(page.locator('.lw-practice')).toHaveCount(0)
    await expect(page.locator('.lw-theory')).toHaveCount(1)
  })

  test('проверка практики красит ответы', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })

    // Берём заведомо НЕверный вариант (первый) и проверяем: подсветиться должны
    // оба — выбранный как неверный и правильный как верный.
    const firstChoice = page.locator('.lw-q--choice').first()
    await firstChoice.locator('.lw-opt').first().click()
    await page.locator('.lw-practice__check').first().click()

    // Классы `is-ok`/`is-no`, а не `is-correct`: тест держался за имена,
    // которых в разметке давно нет.
    await expect(firstChoice.locator('.lw-opt.is-ok')).toHaveCount(1)
    await expect(firstChoice.locator('.lw-opt.is-no')).toHaveCount(1)
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
