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

// LearningPage — остров-карта: открываем королевство A1 по подписи узла.
// Раньше брали «первый доступный», но после сдвига уровней на карте первым
// идёт A0, а контента у него нет — тесты про уроки A1 уходили в пустую тропу.
async function openKingdomA1(page) {
  const kingdom = page.locator('.lp-node', { hasText: 'Уровень A1' }).first()
  await expect(kingdom).toBeVisible({ timeout: 15000 })
  await kingdom.click()
}

test.describe('нативный урок «Обучения»', () => {
  test('тропа → плеер → задание → продолжить', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)

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
    await openKingdomA1(page)
    // Первый узел A1 (L00) начинается с задания-choice → зелёная печенька-лист.
    const cookie = page.locator('.kt-trail .kt-node__cookie').first()
    await expect(cookie).toBeVisible({ timeout: 15000 })
    await expect(cookie).toHaveClass(/is-choice/)
  })

  test('тропа разбита на юниты', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
    await expect(page.locator('.kt-unit').first()).toBeVisible({ timeout: 15000 })
    // A1: 8 юнитов + отдельная секция финального экзамена (kt-exam).
    await expect(page.locator('.kt-unit')).toHaveCount(8)
    await expect(page.locator('.kt-exam')).toHaveCount(1)
    await expect(page.locator('.kt-unit__head').first()).toContainText('Юнит 1')
    // Печенька экзамена — красная (final) даже закрытой.
    await expect(page.locator('.kt-exam .kt-node__cookie.is-final')).toHaveCount(1)
  })

  test('выход из незаконченного урока спрашивает подтверждение', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
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
