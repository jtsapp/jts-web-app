// @vitest-environment jsdom
// Дельты навыков копятся локально и уходят на сервер через 800 мс. Сменился
// пользователь, пока они в пути, — ответ сервера не должен лечь в зеркало
// следующего, а неудача — вернуть чужие дельты в буфер (их отправили бы уже
// под новым токеном).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { recordSkill, flushSkillStats, clearLocalSkillStats } from './skillStats.js'

const TOKEN_KEY = 'jts_access_token'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TOKEN_KEY, 'TOK-A')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function deferredFetch() {
  let settle
  const fn = vi.fn(() => new Promise((resolve, reject) => { settle = { resolve, reject } }))
  fn.settle = () => settle
  return fn
}

describe('skillStats — смена пользователя во время отправки', () => {
  it('ответ сервера для прежнего пользователя не пишется в зеркало нового', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)
    recordSkill('grammar', true)
    flushSkillStats()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Выход и вход другого ученика, пока запрос в пути.
    clearLocalSkillStats()
    localStorage.setItem(TOKEN_KEY, 'TOK-B')

    fetchMock.settle().resolve({ ok: true, json: async () => ({ stats: { grammar: { done: 99, firstTry: 99 } } }) })
    await vi.runAllTimersAsync()
    expect(localStorage.getItem('jts_skill_stats')).toBeNull()
  })

  it('неудача после смены пользователя не возвращает чужие дельты в буфер', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    recordSkill('grammar', true)
    flushSkillStats()

    clearLocalSkillStats()
    localStorage.setItem(TOKEN_KEY, 'TOK-B')

    fetchMock.settle().reject(new Error('offline'))
    await vi.runAllTimersAsync()
    expect(localStorage.getItem('jts_skill_stats_pending')).toBeNull()
  })

  it('отложенная отправка после выхода не уходит вовсе', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    recordSkill('grammar', true) // debounce 800 мс
    clearLocalSkillStats()
    localStorage.setItem(TOKEN_KEY, 'TOK-B')
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
