// Переход в раздел так, как это делает человек на этой ширине: на телефоне (≤560) — вкладкой нижней панели или
// плиткой «Сервисов», на планшете — через бургер, на компьютере — пунктом сайдбара (спека 2026-10-26).
const TABS = { Главная: 'home', Практика: 'practice', 'AI-тьютор': 'tutor', Уроки: 'lessons' }

export async function openSection(page, label) {
  const tabBar = page.locator('.mtab')
  // Восстановление сессии сначала рисует спиннер — ждём, пока появится навигация хоть в каком-то виде. Именно
  // видимая: в DOM на любой ширине есть все три, лишние просто скрыты.
  await page.locator('.mtab:visible, .mtop__menu:visible, .sb__nav:visible').first().waitFor({ timeout: 15_000 })
  if (await tabBar.isVisible()) {
    if (TABS[label]) return page.locator(`.mtab [data-tab="${TABS[label]}"]`).click()
    await page.locator('.mtab [data-tab="services"]').click()
    return page.locator('.svc-tile', { hasText: label }).click()
  }
  const burger = page.locator('.mtop__menu')
  if (await burger.isVisible()) await burger.click()
  return page.locator('.sb__nav .sb__item', { hasText: label }).first().click()
}
