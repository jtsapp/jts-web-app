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

  // Access-токен того же ученика может смениться по refresh, пока запрос в
  // пути. Это не смена пользователя: ответ сервера обязан лечь в зеркало, а
  // при сбое дельты — вернуться в буфер. Сравнение строк токенов теряло бы и
  // то и другое.
  const jwtFor = (userId, salt) => `h.${btoa(JSON.stringify({ userId, salt })).replace(/=+$/, '')}.s`

  it('обновлённый токен того же ученика — не смена пользователя', async () => {
    localStorage.setItem(TOKEN_KEY, jwtFor(41, 'old'))
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)
    recordSkill('grammar', true)
    flushSkillStats()

    localStorage.setItem(TOKEN_KEY, jwtFor(41, 'refreshed'))
    fetchMock.settle().resolve({ ok: true, json: async () => ({ stats: { grammar: { done: 7, firstTry: 5 } } }) })
    await vi.runAllTimersAsync()
    expect(JSON.parse(localStorage.getItem('jts_skill_stats')).grammar.done).toBe(7)
  })

  it('сбой при обновлённом токене того же ученика возвращает дельты в буфер', async () => {
    localStorage.setItem(TOKEN_KEY, jwtFor(41, 'old'))
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    recordSkill('grammar', true)
    flushSkillStats()

    localStorage.setItem(TOKEN_KEY, jwtFor(41, 'refreshed'))
    fetchMock.settle().reject(new Error('offline'))
    // Только микрозадачи, без таймеров: через 800 мс отложенный флаш из
    // recordSkill заберёт возвращённые дельты в новую отправку, и буфер снова
    // окажется пуст — уже законно.
    await vi.advanceTimersByTimeAsync(0)
    expect(JSON.parse(localStorage.getItem('jts_skill_stats_pending')).grammar.done).toBe(1)
  })

  it('другой ученик с настоящим токеном — смена пользователя', async () => {
    localStorage.setItem(TOKEN_KEY, jwtFor(41, 'a'))
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)
    recordSkill('grammar', true)
    flushSkillStats()

    clearLocalSkillStats()
    localStorage.setItem(TOKEN_KEY, jwtFor(42, 'b'))
    fetchMock.settle().resolve({ ok: true, json: async () => ({ stats: { grammar: { done: 99, firstTry: 99 } } }) })
    await vi.runAllTimersAsync()
    expect(localStorage.getItem('jts_skill_stats')).toBeNull()
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
