import { test, expect } from '@playwright/test'

// listeningProgress трогает localStorage/window, но логика чистая — тестируем в
// node с минимальным shim глобалей (браузерный dynamic import из /src в Next не
// резолвится). pushModule без токена — no-op, поэтому сеть не задействована.
test.describe('listeningProgress — отметка пройденных заданий', () => {
  test('markTaskDone добавляет id, игнорирует дубли, фильтрует по уровню', async () => {
    const store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
    globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} }

    const m = await import('../src/practice/listening/listeningProgress.js')
    m.markTaskDone('a1_001')
    m.markTaskDone('a1_001') // дубль игнорируется
    m.markTaskDone('a2_005')

    expect(JSON.parse(store.jts_listening_done).sort()).toEqual(['a1_001', 'a2_005'])
    expect(m.isTaskDone('a1_001')).toBe(true)
    expect([...m.getListeningDone('a1')]).toEqual(['a1_001'])
  })
})
