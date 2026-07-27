import { test, expect } from '@playwright/test'

// Интеграция проводки App: при живой сессии (restoreSession → setToken) App
// вызывает hydratePractice, который тянет /api/practice/state и раскладывает
// прогресс по localStorage. Стабаем сеть, чтобы не зависеть от бэкенда/OTP.
test.describe('App wiring — гидратация прогресса практики при входе', () => {
  test('восстановление сессии прогружает пройденные юниты грамматики в localStorage', async ({ page }) => {
    await page.route('**/api/auth/me', (r) =>
      r.fulfill({ json: { user: { userId: 1, name: 'T', phone: null, role: null, languageLevel: 'A1' } } }),
    )
    await page.route('**/api/profile**', (r) => r.fulfill({ json: { configured: true, profile: {} } }))
    await page.route('**/api/practice/state**', (r) =>
      r.fulfill({ json: { configured: true, state: { vocab: {}, grammar: { done: ['a1:3'] }, listening: { done: [] } } } }),
    )
    await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
    await page.goto('/')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('jts_grammar_done')))
      .toContain('a1:3')
  })
})
