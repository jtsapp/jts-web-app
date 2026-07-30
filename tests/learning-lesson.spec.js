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

// LearningPage по умолчанию в режиме «Карта»; переключаемся в «Список» и
// открываем первое (A1 — всегда разблокировано) королевство.
async function openFirstKingdom(page) {
  await expect(page.locator('.lp-viewtoggle__btn').last()).toBeVisible({ timeout: 15000 })
  await page.locator('.lp-viewtoggle__btn').last().click()
  const kingdom = page.locator('.lp-card').first()
  await expect(kingdom).toBeVisible()
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
