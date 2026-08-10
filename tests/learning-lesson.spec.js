import { test, expect } from '@playwright/test'

// Нативный урок «Обучения» без iframe. Контент — статические public/learning/*.json;
// бэкенд-вызовы (auth/me, lesson-modules) мокаем, чтобы приложение догрузилось до
// экрана «Обучение» без реального сервера, а тропа/плеер рисовались из статики.
async function bootLearning(page) {
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A1' } }) }),
  )
  // Список модулей уровня (для moduleId) — пустой: прогресс уходит в localStorage,
  // тропа и уроки полностью статические.
  await page.route('**/mobile/lesson-modules', (r) =>
    r.fulfill({ contentType: 'application/json', body: '[]' }),
  )
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=kingdom')
}

// LearningPage — остров-карта: открываем первый доступный узел.
// Первый город на карте — A0 (KINGDOMS[0] в src/kingdoms.js), он открыт
// всегда, независимо от уровня студента.
async function openFirstKingdom(page) {
  const kingdom = page.locator('.lp-node:not([disabled])').first()
  await expect(kingdom).toBeVisible({ timeout: 15000 })
  await kingdom.click()
}

test.describe('нативный урок «Обучения»', () => {
  test('тропа → плеер → задание → продолжить', async ({ page }) => {
    await bootLearning(page)
    await openFirstKingdom(page)

    // Нативная тропа (не iframe): первый доступный урок.
    const node = page.locator('.kt-node__btn:not([disabled])').first()
    await expect(node).toBeVisible({ timeout: 15000 })
    await node.click()

    // Плеер урока: HUD (3 сердца), задание, футер-кнопка. Никакого iframe.
    await expect(page.locator('.kl-task')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.km-frame')).toHaveCount(0)
    await expect(page.locator('.kl__hearts')).toContainText('3')
    await expect(page.locator('.kl-btn')).toBeVisible()

    // Прогресс-бар в начале урока — нулевой.
    const fillWidth = () => page.locator('.kl__bar-fill').evaluate((el) => el.style.width)
    expect(await fillWidth()).toBe('0%')

    // Первое задание: если это выбор — отвечаем и ждём фидбэк; иначе (инфо/видео)
    // просто «Продолжить». Затем убеждаемся, что урок продвинулся.
    const opt = page.locator('.kl-opt').first()
    if (await opt.count()) {
      await opt.click()
      await page.locator('.kl-btn:not([disabled])').click() // «Проверить»
      await expect(page.locator('.kl-fb')).toBeVisible()
    }
    await page.locator('.kl-btn:not([disabled])').click() // «Продолжить»

    // Урок либо продвинулся (прогресс > 0), либо завершился экраном итогов.
    const advanced = await page.locator('.kl__bar-fill').evaluate((el) => parseFloat(el.style.width) > 0).catch(() => false)
    const ended = await page.locator('.le-over').count()
    expect(advanced || ended > 0).toBeTruthy()
  })

  test('узел тропы — печенька по типу урока', async ({ page }) => {
    await bootLearning(page)
    const first = page.locator('.lp-node:not([disabled])').first()
    await expect(first).toBeVisible({ timeout: 15000 })
    await first.click()
    // Первый узел A0 (L01-1) начинается с задания-choice → зелёная печенька-лист.
    const cookie = page.locator('.kt-trail .kt-node__cookie').first()
    await expect(cookie).toBeVisible({ timeout: 15000 })
    await expect(cookie).toHaveClass(/is-choice/)
  })

  test('тропа разбита на юниты', async ({ page }) => {
    await bootLearning(page)
    const first = page.locator('.lp-node:not([disabled])').first()
    await expect(first).toBeVisible({ timeout: 15000 })
    await first.click()
    await expect(page.locator('.kt-unit').first()).toBeVisible({ timeout: 15000 })
    // A0: 8 юнитов. В self-study-курсах юнит-тест (REVIEWS) — обычный узел
    // тропы своего юнита (unit = номер юнита), не отдельный курсовой экзамен:
    // в старых данных A1 был выделенный узел FINAL_TEST с unit:0, из-за
    // которого KingdomInteriorPage рисовал отдельную секцию kt-exam — у
    // self-study-контента такого отдельного узла нет, kt-exam не появляется.
    await expect(page.locator('.kt-unit')).toHaveCount(8)
    await expect(page.locator('.kt-exam')).toHaveCount(0)
    await expect(page.locator('.kt-unit__head').first()).toContainText('Юнит 1')
    // Печенька юнит-теста всё равно красная (final) — просто внутри своего юнита.
    const finalCookies = await page.locator('.kt-node__cookie.is-final').count()
    expect(finalCookies).toBeGreaterThan(0)
  })

  test('выход из незаконченного урока спрашивает подтверждение', async ({ page }) => {
    await bootLearning(page)
    await openFirstKingdom(page)
    const node = page.locator('.kt-node__btn:not([disabled])').first()
    await expect(node).toBeVisible({ timeout: 15000 })
    await node.click()
    await expect(page.locator('.kl-task')).toBeVisible({ timeout: 15000 })

    // «Назад» из урока → модалка подтверждения выхода.
    await page.locator('.kl__back').click()
    await expect(page.locator('.lx-over')).toBeVisible()
    await page.locator('.lx-continue').click()
    await expect(page.locator('.lx-over')).toHaveCount(0)
    await expect(page.locator('.kl-task')).toBeVisible()
  })
})
