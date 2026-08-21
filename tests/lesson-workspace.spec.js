import { test, expect } from '@playwright/test'

test.describe('lesson workspace', () => {
  test('рендерит 3 колонки, маршрут, практику, чат', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    const root = page.locator('[data-testid="lesson-workspace"]')
    await expect(root).toBeVisible({ timeout: 20000 })
    // Шаги урока: панель маршрута (.lw-route__step) осталась только у
    // преподавателя в живом уроке — на этом экране её осознанно заменили
    // вкладками (коммит 8dd3c6b). Шагов по-прежнему девять, селектор другой.
    await expect(page.locator('.ls-tab')).toHaveCount(9)
    // центр: теория + инфо-блок + практика присутствуют
    await expect(page.locator('.lw-theory').first()).toBeVisible()
    await expect(page.locator('.lw-info').first()).toBeVisible()
    await expect(page.locator('.lw-practice').first()).toBeVisible()
    // match-вопрос: рендерится с левыми строками (по числу пар)
    const match = page.locator('.lw-q--match').first()
    await expect(match).toBeVisible()
    await expect(match.locator('.lw-match__left')).toHaveCount(3)
    // правая колонка: топики + чат
    await expect(page.locator('.lw-topics')).toBeVisible()
    await expect(page.locator('.lw-chat')).toBeVisible()
    // отправка сообщения добавляет пузырь
    const before = await page.locator('.lw-chat__msg').count()
    await page.locator('.lw-chat__input').fill('привет')
    await page.locator('.lw-chat__send').click()
    await expect(page.locator('.lw-chat__msg')).toHaveCount(before + 1)
    // клик по другому шагу меняет контент
    await page.locator('.ls-tab').nth(2).click()
    await expect(root).toBeVisible()
  })

  test('проверка практики красит ответы', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
    // выбрать неверный вариант в первом choice и проверить
    const firstChoice = page.locator('.lw-q--choice').first()
    await firstChoice.locator('.lw-opt').first().click()
    await page.locator('.lw-practice__check').first().click()
    // Верный вариант компонент метит классом is-ok (ChoiceQuestion.jsx:52);
    // is-correct понимает только CSS, разметка его не ставит — тест искал
    // класс, которого на экране нет.
    await expect(firstChoice.locator('.lw-opt.is-ok')).toHaveCount(1)
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
