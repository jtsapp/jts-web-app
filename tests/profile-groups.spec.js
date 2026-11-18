import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Профиль по ТЗ v2.0, 5.8 (задача 190): блока «Навыки» нет — навыки только на «Главной» (ТЗ 5.5), а «Правила школы»
// ведут во вкладку «Правила» «Уроков». Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником. На
// телефоне профиль — экраны дизайна приложения (ProfilePhone, классы pfm-*), на компьютере — страница .pf.
// PROFILE_SHOTS=<папка> — снять скриншоты.
const SHOTS = process.env.PROFILE_SHOTS

test.describe('профиль / группы и правила школы', () => {
  test('навыков нет, «Правила школы» открывают вкладку «Правила»', async ({ page, viewport }, info) => {
    await loginAsStudent(page, { level: 'B1' })
    await page.goto('/?screen=profile')
    const phone = (viewport?.width ?? 0) <= 560
    await expect(page.locator(phone ? '.pfm' : '.pf2')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.pf-skills, .pfm-skill')).toHaveCount(0)
    if (!phone) {
      // Раскладка задачи 214: Обучение · Настройки · Аккаунт и помощь; уровень — чипом звания в шапке.
      await expect(page.locator('.pf2-sect')).toHaveText(['Обучение', 'Настройки', 'Аккаунт и помощь'])
      await expect(page.locator('[data-section="goals"] .pf-row')).toHaveText([/Тест на уровень/])
      await expect(page.locator('.pf2-chip[data-chip="rank"]')).toHaveText('Барон · B1')
      // «Правила школы» — в окне строки «Правила школы и документы»
      await page.locator('[data-section="account"] [data-key="docs"]').click()
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/profile-${info.project.name}.png`, fullPage: true })
    await page.getByText('Правила школы', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Правила обучения' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ls-tab--active')).toHaveText('Правила')
  })
})
