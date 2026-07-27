import { test, expect } from '@playwright/test'

// Node-context регрессия импурных обёрток sync: инварианты, живущие только в
// practiceSync.js — гость не шлёт сеть, hydrate не стирает localStorage при
// ошибке, debounce схлопывает частые записи. Стабы глобалей ставим ДО импорта.

function installStubs() {
  const store = {}
  const setCalls = []
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); setCalls.push(k) },
    removeItem: (k) => { delete store[k] },
  }
  globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} }
  return { store, setCalls }
}

const TOKEN_KEY = 'jts_access_token'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

test.describe('practiceSync — импурные обёртки', () => {
  test('гость (нет токена): pushModule не шлёт запрос', async () => {
    installStubs()
    let fetchCalls = 0
    globalThis.fetch = async () => { fetchCalls += 1; return { ok: true, json: async () => ({}) } }
    const { pushModule } = await import('../src/practice/practiceSync.js')
    pushModule('grammar', new Set(['a1:1']))
    await wait(750)
    expect(fetchCalls).toBe(0)
  })

  test('hydratePractice при ошибке сети не трогает localStorage', async () => {
    const { setCalls } = installStubs()
    globalThis.fetch = async () => { throw new Error('network down') }
    const { hydratePractice } = await import('../src/practice/practiceSync.js')
    await hydratePractice('test-token')
    expect(setCalls).toEqual([])
  })

  test('hydratePractice при ответе не-ok не трогает localStorage', async () => {
    const { setCalls } = installStubs()
    globalThis.fetch = async () => ({ ok: false, json: async () => ({}) })
    const { hydratePractice } = await import('../src/practice/practiceSync.js')
    await hydratePractice('test-token')
    expect(setCalls).toEqual([])
  })

  test('pushModule дебаунсит: два вызова → один POST с последним состоянием', async () => {
    const { store } = installStubs()
    store[TOKEN_KEY] = 'test-token'
    const bodies = []
    globalThis.fetch = async (_url, opts) => { bodies.push(JSON.parse(opts.body)); return { ok: true, json: async () => ({}) } }
    const { pushModule } = await import('../src/practice/practiceSync.js')
    pushModule('vocab', { level: 'A1' })
    await wait(100)
    pushModule('vocab', { level: 'B1' })
    await wait(750)
    expect(bodies.length).toBe(1)
    expect(bodies[0].module).toBe('vocab')
    expect(bodies[0].state).toEqual({ level: 'B1' })
  })
})
