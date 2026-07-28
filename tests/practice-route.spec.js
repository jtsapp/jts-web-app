import { test, expect } from '@playwright/test'

// Гейт аутентификации проверяется ДО наличия БД, поэтому 401 детерминирован и не
// требует Neon. Happy-path (200 + запись) требует токен + БД → ручная проверка в
// плане (Task 3, Step 6).
test.describe('/api/practice/state — гейт аутентификации', () => {
  test('POST без Bearer → 401', async ({ request }) => {
    const res = await request.post('/api/practice/state', {
      data: { module: 'grammar', state: { done: [] } },
    })
    expect(res.status()).toBe(401)
  })

  test('GET без Bearer → 401', async ({ request }) => {
    const res = await request.get('/api/practice/state')
    expect(res.status()).toBe(401)
  })
})
