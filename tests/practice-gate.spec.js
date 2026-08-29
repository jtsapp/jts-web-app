import { test, expect } from '@playwright/test'

// Замок на видимом контенте — это оффер, подменённый раздел — отток.
// Ученик с исчерпанным демо-лимитом обязан видеть раздел (что в нём есть),
// а не пустой экран «лимит исчерпан» вместо всего Аудирования/Шэдоуинга.
// Форма — та же, что у Грамматики (см. grammar.spec.js): каталог виден,
// замок стоит на попытке открыть/пройти конкретный контент.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.describe('Демо-лимит: замок на контенте, не на разделе', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
    await page.route('**/api/auth/me', (r) =>
      r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A1' } })))
    // Лимит исчерпан для любого модуля практики: allowed=false при limit=8, completed=8.
    await page.route('**/api/practice/entitlement**', (r) =>
      r.fulfill(json({ configured: true, allowed: false, limit: 8, completed: 8 })))
  })

  test('аудирование с исчерпанным лимитом показывает интро, а не пустой экран', async ({ page }) => {
    await page.goto('/?screen=listening')

    // Интро (маскот, описание, бейдж уровня, кнопка «Начать тренировку») —
    // это и есть каталог раздела: студент видит, чего лишился, до любого клика.
    await expect(page.getByText('Аудирование')).toBeVisible()
    await expect(page.locator('.lt-intro').first()).toBeVisible()
    await expect(page.locator('.lt-intro__title')).toBeVisible()
    // Замка ещё нет — лимит проверяется в момент старта задания, не раньше.
    await expect(page.locator('.pl-limit')).toHaveCount(0)

    // Попытка начать тренировку — та самая «попытка открыть юнит» из
    // грамматики: вот тут и появляется замок, а не при заходе в раздел.
    await page.locator('.lt-intro .lt-primary').click()
    await expect(page.locator('.pl-limit')).toBeVisible()
    await expect(page.locator('.pl-limit__title')).toContainText('🔒')
  })

  test('шэдоуинг с исчерпанным лимитом показывает список уроков, а не пустой экран', async ({ page }) => {
    await page.goto('/?screen=shadowing')

    // Табы уроков (спикеры) — каталог раздела; он остаётся на месте, замок
    // ставится только на само видео/скрипт (тренировку конкретного урока).
    await expect(page.getByText('Шэдоуинг')).toBeVisible()
    await expect(page.locator('.sh-tabs .pp-chip').first()).toBeVisible()
    await expect(await page.locator('.sh-tabs .pp-chip').count()).toBeGreaterThan(1)

    // Контент (видео/скрипт) заперт сразу — открыть урок и означает попасть
    // на этот экран (сюда идут по клику на карточку урока в Практике).
    await expect(page.locator('.pl-limit')).toBeVisible()
    await expect(page.locator('.sh-video')).toHaveCount(0)
  })
})
