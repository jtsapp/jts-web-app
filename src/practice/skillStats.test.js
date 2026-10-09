// @vitest-environment jsdom
// Дельты навыков копятся локально и уходят на сервер через 800 мс. Сменился
// пользователь, пока они в пути, — ответ сервера не должен лечь в зеркало
// следующего, а неудача — вернуть чужие дельты в буфер (их отправили бы уже
// под новым токеном).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { recordSkill, flushSkillStats, clearLocalSkillStats, readLocalSkillStats } from './skillStats.js'

const TOKEN_KEY = 'jts_access_token'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TOKEN_KEY, 'TOK-A')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearLocalSkillStats()
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

// Ревью 08.10.2026: хранилище домена забивает кэш каталогов, запись буфера
// дельт молча падала, а флаш читал буфер оттуда же — прирост навыков не
// доходил до сервера никогда.
describe('skillStats — забитое хранилище', () => {
  function fillStorage() {
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
  }

  it('дельты, не влезшие в хранилище, всё равно уходят на сервер', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ stats: null }) }))
    vi.stubGlobal('fetch', fetchMock)
    const spy = fillStorage()
    recordSkill('grammar', true)
    recordSkill('grammar', false)
    flushSkillStats()
    spy.mockRestore()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.deltas.grammar).toEqual({ done: 2, firstTry: 1 })
  })

  it('отправленное из памяти второй раз не уходит', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ stats: null }) }))
    vi.stubGlobal('fetch', fetchMock)
    const spy = fillStorage()
    recordSkill('grammar', true)
    flushSkillStats()
    await vi.runAllTimersAsync()
    flushSkillStats()
    spy.mockRestore()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('сбой отправки при забитом хранилище не теряет дельты', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('offline')
      return { ok: true, json: async () => ({ stats: null }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    fillStorage()
    recordSkill('grammar', true)
    flushSkillStats()
    await vi.runAllTimersAsync()
    flushSkillStats()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).deltas.grammar).toEqual({ done: 1, firstTry: 1 })
  })

  it('прирост виден в сводке, даже когда зеркало не записалось', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    fillStorage()
    recordSkill('grammar', true)
    expect(readLocalSkillStats().grammar).toMatchObject({ done: 1, firstTry: 1 })
  })

  it('выход забывает и то, что жило только в памяти', () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const spy = fillStorage()
    recordSkill('grammar', true)
    spy.mockRestore()
    clearLocalSkillStats()
    expect(readLocalSkillStats().grammar).toMatchObject({ done: 0 })
    flushSkillStats()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
