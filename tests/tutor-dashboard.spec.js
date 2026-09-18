import { test, expect } from '@playwright/test'

// Дашборд тьютора: виджет «План уроков» (хардкод-заглушка) убран, остались
// герой (орб-лицо + кнопка «Начать разговор») и превью сценариев. На мобилке
// раньше десктопные две колонки сжимались в кашу — контракт ниже фиксирует
// вертикальную раскладку.

test.describe('дашборд тьютора — контент', () => {
  test('плана уроков нет, сценарии на месте', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')

    // Герой: микрофон и подсказка занятия.
    await expect(page.locator('.t-dash__orb')).toBeVisible()
    await expect(page.locator('.t-dash__talk')).toBeVisible()

    // Секция в панели ровно одна — «Сценарии»; от плана уроков не осталось следов.
    await expect(page.locator('.t-panel__section')).toHaveCount(1)
    await expect(page.locator('.t-lessons')).toHaveCount(0)
    await expect(page.locator('.t-progress')).toHaveCount(0)
    await expect(page.locator('.t-scenarios .t-scenario').first()).toBeAttached()
  })

  test('совет дня — реальный сценарий, а не хардкод', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    // Без прогресса предлагается первая сцена сюжетной цепочки.
    await expect(page.locator('.t-dash__suggesttext b')).toHaveText('U.S. Visa Interview')
  })
})

test.describe('дашборд тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('вертикальная раскладка без горизонтального скролла', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-dashboard')
    await expect(page.locator('.t-dash__orb')).toBeVisible()
    await expect(page.locator('.t-dash__talk')).toBeVisible()

    // Страница не расползается вширь (раньше десктопная сетка давала overflow).
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1)

    // Панель сценариев встаёт под героем и доступна по вертикальному скроллу.
    const scenarios = page.locator('.t-scenarios')
    await scenarios.scrollIntoViewIfNeeded()
    await expect(scenarios).toBeInViewport()
  })
})

test.describe('дашборд тьютора — витрина эмоций', () => {
  // Видимая эмоция — ключ из класса t-face--<ключ> у набора с is-on.
  const shownEmotion = (page) =>
    page
      .locator('.t-dash__face .t-face__stack.is-on')
      .evaluate((el) => [...el.classList].find((c) => c.startsWith('t-face--')).slice(8))

  test('лицо в орбе листает эмоции по кругу', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    const first = await shownEmotion(page)
    // Смена раз в 2 с; запас — на подгрузку картинок следующего набора.
    await expect.poll(() => shownEmotion(page), { timeout: 10_000 }).not.toBe(first)
  })

  test('смена плавная: уходящее гаснет, новое — неподвижный кадр до конца смены', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    await expect(page.locator('.t-dash__face')).toHaveClass(/is-morph/)
    // Смена держится ~0.6 с на каждом шаге круга — за пару шагов она обязана
    // попасться.
    const entering = page.locator('.t-dash__face .t-face__stack.is-entering')
    await expect(entering).toHaveCount(1, { timeout: 6_000 })
    await expect(page.locator('.t-dash__face .t-face__stack.is-leaving')).toHaveCount(1)
    // Собственное движение нового стоит на паузе, пока идёт смена: иначе его
    // прыжок или петля рисовали бы второй контур из-под общей позы.
    const states = await entering.evaluate((el) =>
      el.querySelector('.t-face__rig').getAnimations().map((a) => a.playState)
    )
    expect(states.length).toBeGreaterThan(0)
    expect(states.every((s) => s === 'paused')).toBe(true)
  })

  test('при «уменьшить движение» лицо стоит на родной эмоции', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?screen=tutor-dashboard')
    const first = await shownEmotion(page)
    // Дольше одного шага круга: будь витрина включена, лицо бы уже сменилось.
    await page.waitForTimeout(4_000)
    expect(await shownEmotion(page)).toBe(first)
  })
})
