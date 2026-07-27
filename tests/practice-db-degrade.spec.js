import { test, expect } from '@playwright/test'

// Контракт мягкой деградации: без DATABASE_URL getSql() === null, поэтому чтение
// отдаёт дефолты, а запись — no-op (не бросает). Детерминированно, без Neon.
// Важно: getSql кэширует результат на первом вызове, а DATABASE_URL читает внутри
// вызова — поэтому чистим env ДО первого обращения (динамический импорт).

test.describe('practice db — деградация без DATABASE_URL', () => {
  test('load отдаёт дефолты, save не бросает', async () => {
    delete process.env.DATABASE_URL
    const { loadPracticeState, savePracticeState } = await import('../src/lib/db/practice.js')
    const state = await loadPracticeState('user-1')
    expect(state).toEqual({ vocab: {}, grammar: { done: [] }, listening: { done: [] } })
    await expect(savePracticeState('user-1', 'grammar', { done: ['a1:1'] })).resolves.toBeUndefined()
  })
})
