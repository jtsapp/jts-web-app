// @vitest-environment jsdom
//
// flushModule — досыл отложенной отметки. Появился из-за демо-лимитов: право на
// новую сессию (/api/practice/entitlement) сервер считает по строкам в БД, а
// pushModule копит отметки с debounce в 600 мс. Без гарантии «отметка принята
// раньше, чем спросили право» лимит не удерживал бы ровно ту сессию, которая
// его добила, — и дефект стал бы плавающим вместо стабильного.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pushModule, flushModule, PUSH_DELAY_MS, clearLocalPractice, hydratePractice } from './practiceSync.js'
import { createProgressStore, doneListOptions } from './progressStore.js'
import { READING_KEY, WORDS_KEY, VERBS_KEY, LISTENCHOOSE_KEY, LISTENCHOOSE_RUN_KEY } from './practiceKeys.js'

// Управляемый fetch: тест сам решает, когда сервер ответит.
function deferredFetch() {
  const calls = []
  const fn = vi.fn((url, init) => {
    let settle
    const p = new Promise((resolve) => { settle = () => resolve({ ok: true, json: async () => ({ ok: true }) }) })
    calls.push({ url, body: JSON.parse(init.body), settle })
    return p
  })
  fn.calls = calls
  return fn
}

beforeEach(() => {
  localStorage.setItem('jts_access_token', 'TOK')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('flushModule', () => {
  it('досылает отложенную отметку немедленно, не дожидаясь debounce', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('listening', new Set(['a1_001']))
    expect(fetchMock).not.toHaveBeenCalled() // ещё в debounce

    const flushed = flushModule('listening')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.calls[0].url).toBe('/api/practice/state')
    expect(fetchMock.calls[0].body).toEqual({ module: 'listening', state: { done: ['a1_001'] } })

    fetchMock.calls[0].settle()
    await flushed
    // Таймер debounce снят — второго POST с той же отметкой не будет.
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS * 2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('не отпускает вызывающего, пока сервер не принял отметку', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('grammar', new Set(['g1']))
    let done = false
    const flushed = flushModule('grammar').then(() => { done = true })

    await Promise.resolve()
    expect(done).toBe(false) // ответа ещё нет — ждём

    fetchMock.calls[0].settle()
    await flushed
    expect(done).toBe(true)
  })

  it('дожидается и УЖЕ улетевшего POST (debounce успел сработать сам)', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('shadowing', new Set(['sg_000']))
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    let done = false
    const flushed = flushModule('shadowing').then(() => { done = true })
    await Promise.resolve()
    expect(done).toBe(false)

    fetchMock.calls[0].settle()
    await flushed
    expect(done).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1) // повторно не шлём
  })

  it('без отложенных отметок — ни одного запроса', async () => {
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    await flushModule('situations')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('гость (без токена) на сервер не пишет и flush его не ждёт', async () => {
    localStorage.removeItem('jts_access_token')
    const fetchMock = deferredFetch()
    vi.stubGlobal('fetch', fetchMock)

    pushModule('workbooks', new Set(['a0']))
    await flushModule('workbooks')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// Ответ сервера должен попасть в память разделов, даже когда localStorage
// забит (кэш каталогов): раньше applyHydratedState писал только в хранилище,
// запись падала, и раздел поднимал устаревший черновик.
describe('hydratePractice → память разделов', () => {
  const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

  it('серверное попадает в память хранилища при забитом localStorage', async () => {
    const token = jwt('7')
    localStorage.setItem('jts_access_token', token)
    const store = createProgressStore({ module: 'grammar', key: 'test_hydr', event: 'test-hydr', ...doneListOptions })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ state: { grammar: { done: ['a1:3'] } } }) })))
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    await hydratePractice(token)
    spy.mockRestore()
    expect(store.read()).toEqual(['a1:3'])
  })

  it('clearLocalPractice забывает память разделов', () => {
    const store = createProgressStore({ module: 'listening', key: 'test_clear', event: 'test-clear', ...doneListOptions })
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    store.write(['a1_001'])
    spy.mockRestore()
    expect(store.read()).toEqual(['a1_001'])
    clearLocalPractice()
    expect(store.read()).toEqual([])
  })
})

// Выход из аккаунта стирает локальный прогресс разделов: на общей машине он
// иначе достаётся следующему ученику. Новый раздел, забытый в списке, — ровно
// эта утечка (так было со «Словами в картинках»).
describe('clearLocalPractice', () => {
  it('стирает прогресс чтения, «Слов в картинках», глаголов и «Слушай и выбирай»', () => {
    const keys = [READING_KEY, WORDS_KEY, VERBS_KEY, LISTENCHOOSE_KEY, LISTENCHOOSE_RUN_KEY]
    for (const k of keys) localStorage.setItem(k, '{"x":1}')
    clearLocalPractice()
    for (const k of keys) expect(localStorage.getItem(k)).toBeNull()
  })
})

// Ревью 08.10.2026 (#78): ответ сервера не проверялся — 500 или обрыв сети
// терялись молча, и раздел-объект при следующей загрузке проигрывал серверному.
describe('pushModule — ответ сервера', () => {
  const jwtFor = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

  function scriptedFetch(statuses) {
    const fn = vi.fn(async (url, init) => {
      const status = statuses.length ? statuses.shift() : 200
      fn.bodies.push({ auth: init.headers.Authorization, body: JSON.parse(init.body) })
      return { ok: status >= 200 && status < 300, status, json: async () => ({ ok: true }) }
    })
    fn.bodies = []
    return fn
  }

  it('ack — только когда сервер принял', async () => {
    vi.stubGlobal('fetch', scriptedFetch([200]))
    const ack = vi.fn()
    pushModule('writing', { tasks: { a: 1 } }, ack)
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    expect(ack).toHaveBeenCalledTimes(1)
  })

  it('500 — отправка повторяется сама, ack после успешной', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = scriptedFetch([500, 200])
    vi.stubGlobal('fetch', fetchMock)
    const ack = vi.fn()
    pushModule('writing', { tasks: { a: 1 } }, ack)
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(ack).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.bodies[1].body).toEqual({ module: 'writing', state: { tasks: { a: 1 } } })
    expect(ack).toHaveBeenCalledTimes(1)
  })

  it('обрыв сети — тоже повтор', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new TypeError('Failed to fetch')
      return { ok: true, status: 200, json: async () => ({}) }
    }))
    const ack = vi.fn()
    pushModule('words', { scenes: {} }, ack)
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS + 60_000)
    expect(calls).toBe(2)
    expect(ack).toHaveBeenCalledTimes(1)
  })

  it('400 — не повторяется: такой же запрос получит тот же отказ', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = scriptedFetch([400])
    vi.stubGlobal('fetch', fetchMock)
    pushModule('writing', { tasks: {} })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS + 120_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('новая запись, пока ждёт повтор, — уходит она, а не старая', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = scriptedFetch([500, 200])
    vi.stubGlobal('fetch', fetchMock)
    pushModule('writing', { tasks: { a: 1 } })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    pushModule('writing', { tasks: { a: 1, b: 1 } })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.bodies[1].body.state).toEqual({ tasks: { a: 1, b: 1 } })
  })

  it('повтор не уходит под токеном другого ученика', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('jts_access_token', jwtFor('7'))
    const fetchMock = scriptedFetch([500, 200])
    vi.stubGlobal('fetch', fetchMock)
    pushModule('writing', { tasks: { mine: 1 } })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    localStorage.setItem('jts_access_token', jwtFor('8'))
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('выход отменяет отложенную отправку и забывает неотправленное', async () => {
    const fetchMock = scriptedFetch([])
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('jts_practice_unsynced', JSON.stringify({ owner: 'user:7', modules: { writing: {} } }))
    pushModule('writing', { tasks: { mine: 1 } })
    clearLocalPractice()
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS * 2)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('jts_practice_unsynced')).toBeNull()
  })
})

// Ревью 08.10.2026 (#36): загрузка с сервера затирала черновик «Чтения». В нём
// лежат результаты, не долетевшие в прошлую загрузку (их «Чтение» досылает при
// открытии) — после затирания досылать было уже нечего.
describe('hydratePractice — черновик «Чтения»', () => {
  const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

  it('серверное сливается с черновиком лучшим результатом, а не затирает его', async () => {
    const token = jwt('7')
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem(READING_KEY, JSON.stringify({ texts: {
      t1: { ex: { 0: { score: 2, total: 2 } }, done: true },
      t2: { ex: { 0: { score: 3, total: 4 } }, done: false },
    } }))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ state: { reading: { texts: {
      t2: { ex: { 0: { score: 1, total: 4 } }, done: true },
      t3: { ex: { 0: { score: 5, total: 5 } }, done: true },
    } } } }) })))
    await hydratePractice(token)
    expect(JSON.parse(localStorage.getItem(READING_KEY))).toEqual({ texts: {
      t1: { ex: { 0: { score: 2, total: 2 } }, done: true },
      t2: { ex: { 0: { score: 3, total: 4 } }, done: true },
      t3: { ex: { 0: { score: 5, total: 5 } }, done: true },
    } })
  })

  it('черновик с битой записью задания не роняет гидратацию остальных разделов', async () => {
    const token = jwt('7')
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem(READING_KEY, JSON.stringify({ texts: { t1: { ex: { 0: null } } } }))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ state: {
      reading: { texts: { t1: { ex: { 0: { score: 1, total: 1 } }, done: true } } },
      verbs: { saved: { go: true }, progress: {} },
    } }) })))
    await hydratePractice(token)
    expect(JSON.parse(localStorage.getItem(VERBS_KEY))).toEqual({ saved: { go: true }, progress: {} })
  })

  it('битый черновик — просто серверное', async () => {
    const token = jwt('7')
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem(READING_KEY, '{не json')
    const server = { texts: { t3: { ex: { 0: { score: 5, total: 5 } }, done: true } } }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ state: { reading: server } }) })))
    await hydratePractice(token)
    expect(JSON.parse(localStorage.getItem(READING_KEY))).toEqual(server)
  })
})

// Независимое ревью PR: повтор старой отправки мог уйти после новой, уже
// принятой, — сервер хранит раздел заменой и откатился бы к старому.
describe('pushModule — порядок отправок', () => {
  function manualFetch() {
    const calls = []
    const fn = vi.fn((url, init) => new Promise((resolve, reject) => {
      calls.push({ body: JSON.parse(init.body), ok: () => resolve({ ok: true, status: 200, json: async () => ({}) }), fail: () => reject(new TypeError('Failed to fetch')) })
    }))
    fn.calls = calls
    return fn
  }

  it('старая упала, новая принята — старая больше не уходит', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = manualFetch()
    vi.stubGlobal('fetch', fetchMock)
    pushModule('writing', { tasks: { a: 1 } })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    pushModule('writing', { tasks: { a: 1, b: 1 } })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    // Новая ждёт, пока старая ответит: две отправки раздела разом не летят.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.calls[0].fail()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.calls[1].body.state).toEqual({ tasks: { a: 1, b: 1 } })
    fetchMock.calls[1].ok()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('выход: отправка прошлой сессии в очереди не уходит, даже если вернулся тот же ученик', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = manualFetch()
    vi.stubGlobal('fetch', fetchMock)
    pushModule('writing', { tasks: { a: 1 } })
    await vi.advanceTimersByTimeAsync(PUSH_DELAY_MS)
    clearLocalPractice()
    localStorage.setItem('jts_access_token', 'TOK')
    fetchMock.calls[0].fail()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('hydratePractice — сбой и чужой ответ', () => {
  const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

  it('сбой загрузки повторяется сам', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const token = jwt('7')
    localStorage.setItem('jts_access_token', token)
    const store = createProgressStore({ module: 'grammar', key: 'test_hydr_retry', event: 'test-hydr-retry', ...doneListOptions })
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      if (calls === 1) return { ok: false, status: 502, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ state: { grammar: { done: ['a1:3'] } } }) }
    }))
    await hydratePractice(token)
    expect(store.read()).toEqual([])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toBe(2)
    expect(store.read()).toEqual(['a1:3'])
  })

  it('ответ пришёл, когда вошёл другой ученик, — его прогресс не трогаем', async () => {
    localStorage.setItem('jts_access_token', jwt('7'))
    let answer
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { answer = resolve })))
    const done = hydratePractice(jwt('7'))
    localStorage.setItem('jts_access_token', jwt('8'))
    answer({ ok: true, status: 200, json: async () => ({ state: { reading: { texts: { his: { ex: {}, done: true } } } } }) })
    await done
    expect(localStorage.getItem(READING_KEY)).toBeNull()
  })
})

// Повторное ревью PR: отправки идут по одной, и зависший запрос останавливал
// раздел — вместе с проверкой права на сессию, которая ждёт flushModule.
describe('pushModule — зависший запрос', () => {
  it('обрывается по таймауту и повторяется; flushModule не ждёт вечно', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let calls = 0
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      calls += 1
      if (calls === 1) {
        return new Promise((resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    }))
    const ack = vi.fn()
    pushModule('writing', { tasks: { a: 1 } }, ack)
    const flushed = flushModule('writing')
    let released = false
    flushed.then(() => { released = true })
    await vi.advanceTimersByTimeAsync(11_000)
    expect(released).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toBe(2)
    expect(ack).toHaveBeenCalledTimes(1)
  })
})
