import { test, expect } from '@playwright/test'

// Ревью 08.10.2026 (#79): цель перехода в Практику (юнит из домашки или
// диплинка) не сбрасывалась, когда ученик возвращался в Практику из зоны
// тьютора. Сайдбар тьютора открывал Практику своим списком переходов, мимо
// handleNav, и тот же юнит открывался снова — вчерашняя домашка выбрасывала
// ученика в себя при каждом заходе.

test('из зоны тьютора «Практика» открывает каталог, а не прошлый юнит', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'сайдбар на телефоне спрятан в меню — переход тот же')
  await page.addInitScript(() => {
    try {
      localStorage.setItem('jts_tours_off', '1')
    } catch {
      /* тур просто покажется */
    }
  })
  await page.goto('/?screen=practice&level=a2&unit=3')
  const unitTitle = page.getByRole('heading', { name: 'Present simple: negative & questions' })
  await expect(unitTitle).toBeVisible({ timeout: 60_000 })

  await page.getByRole('button', { name: 'Speaking Buddy', exact: true }).first().click()
  await expect(page).toHaveURL(/screen=tutor-/)

  await page.getByRole('button', { name: 'Практика', exact: true }).first().click()
  await expect(page.locator('.pk-skill').first()).toBeVisible({ timeout: 30_000 })
  await expect(unitTitle).toHaveCount(0)
})
