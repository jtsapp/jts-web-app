import { test, expect } from '@playwright/test'

// Тропа и урок уровня A1 (public/learning/a1.json). Бэкенд-вызовы мокаем,
// чтобы приложение догрузилось до «Обучения» без сервера. A1 играется новым
// пошаговым плеером (.cp-*), старый плеер заданий остался у B2/C1.
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
    const node = page.locator('.kt-step:not([disabled])').first()
    await expect(node).toBeVisible({ timeout: 15000 })
    await node.click()

    // Пошаговый плеер: шапка со стадией, полоса прогресса, кнопка снизу.
    // Сердец у урока нет с develop: ошибка стоит монет и процента в итогах, но
    // не выбрасывает из урока (см. комментарий в CourseStepPlayer).
    await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.km-frame')).toHaveCount(0)
    await expect(page.locator('.cp-hud__track')).toBeVisible()
    await expect(page.locator('.cp-cta')).toBeVisible()

    // Первое задание: если это выбор — отвечаем и ждём плашку результата;
    // иначе (правило/чек-лист) просто «Продолжить».
    const opt = page.locator('.cp-choice').first()
    if (await opt.count()) {
      await opt.click()
      await page.locator('.cp-cta:not([disabled])').click() // «Проверить»
      await expect(page.locator('.cp-fb')).toBeVisible()
    }
    await page.locator('.cp-cta:not([disabled])').click() // «Продолжить»

    // Урок либо продвинулся (прогресс > 0), либо завершился экраном итогов.
    const advanced = await page
      .locator('.cp-hud__fill')
      .evaluate((el) => parseFloat(el.style.width) > 0)
      .catch(() => false)
    const ended = await page.locator('.le-over').count()
    expect(advanced || ended > 0).toBeTruthy()
  })

  test('узлы тропы: доступен только первый, остальные закрыты', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
    // Печеньки из макета: доступная — зелёная со звездой, закрытые — серые.
    // Цвет по типу урока ушёл вместе со старой тропой.
    const first = page.locator('.kt-step').first()
    await expect(first).toBeVisible({ timeout: 15000 })
    await expect(first).toHaveClass(/is-active/)
    await expect(page.locator('.kt-unit').first().locator('.kt-step').nth(1)).toHaveClass(/is-inactive/)
  })

  test('тропа разбита на юниты', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
    await expect(page.locator('.kt-unit').first()).toBeVisible({ timeout: 15000 })
    // A1 (собственный курс уровня, public/learning/a1.json) — 8 юнитов.
    await expect(page.locator('.kt-unit')).toHaveCount(8)
    await expect(page.locator('.kt-unit__head').first()).toContainText('Юнит 1')
    // Последний узел юнита — золотая печенька с кубком.
    await expect(page.locator('.kt-unit').first().locator('.kt-step.is-last')).toHaveCount(1)
  })

  test('выход из незаконченного урока спрашивает подтверждение', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
    const node = page.locator('.kt-step:not([disabled])').first()
    await expect(node).toBeVisible({ timeout: 15000 })
    await node.click()
    await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })

    // «Выйти» из урока → модалка подтверждения выхода.
    await page.locator('.cp-bar__exit').click()
    await expect(page.locator('.lx-over')).toBeVisible()
    await page.locator('.lx-continue').click()
    await expect(page.locator('.lx-over')).toHaveCount(0)
    await expect(page.locator('.cp-step')).toBeVisible()
  })

  test('на экране итогов урока под ними нет — и выходить из него нечем', async ({ page }) => {
    await bootLearning(page)
    await openKingdomA1(page)
    const node = page.locator('.kt-step:not([disabled])').first()
    await expect(node).toBeVisible({ timeout: 15000 })
    await node.click()
    await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })

    // Прощёлкиваем урок до итогов.
    for (let i = 0; i < 40; i++) {
      if (await page.locator('.le-over').isVisible().catch(() => false)) break
      const cta = page.locator('.cp-cta, button', { hasText: /Продолжить|Завершить урок|Проверить/ }).first()
      if (!(await cta.isVisible().catch(() => false))) break
      await cta.click()
      await page.waitForTimeout(150)
    }

    // Раньше плеер оставался под итогами: страница прокручивалась к живому
    // уроку, а его «Выйти» уводил в пустой экран.
    await expect(page.locator('.le-over')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.cp-bar')).toHaveCount(0)
    await expect(page.locator('.cp-step')).toHaveCount(0)
  })
})
