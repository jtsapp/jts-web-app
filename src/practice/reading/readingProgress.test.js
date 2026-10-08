// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Мост в домашку ходит на бэкенд — здесь важен только факт отчёта.
vi.mock('../practiceHomework.js', () => ({ countUnitTowardsHomework: vi.fn() }))

import { countUnitTowardsHomework } from '../practiceHomework.js'
import { mergeReadingState } from '../../lib/readingState.js'
import {
  readState,
  markExercise,
  markTextDone,
  textState,
  progressOf,
  levelProgress,
  levelDoneCount,
  loadReadingFromServer,
  flushReading,
  resetReadingMemory,
} from './readingProgress.js'
import { READING_KEY, READING_PROGRESS_EVENT } from '../practiceKeys.js'

const TOKEN_KEY = 'jts_access_token'
const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`
const r = (score, total) => ({ score, total })

const TEXT = {
  id: 'a1-sci-honey',
  exercises: [
    { type: 'tf', items: [{}, {}, {}, {}] }, // 4
    { type: 'order', items: ['a', 'b'] }, // 2
  ],
}
const OTHER = { id: 'a1-adv-snow', exercises: [{ type: 'tf', items: [{}, {}] }] } // 2

// Забитый localStorage, как у ученика из жалобы 05.10: запись бросает.
function fillStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
}

// Сервер в памяти с той же семантикой слияния, что у настоящего роута.
function fakeServer() {
  const s = { state: { texts: {} }, down: false, posts: [], hold: null }
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    if (s.down) throw new TypeError('Failed to fetch')
    if (opts.method === 'POST') {
      const body = JSON.parse(opts.body)
      s.posts.push(body)
      if (s.hold) await s.hold
      s.state = mergeReadingState(s.state, body.state)
      return { ok: true, json: async () => ({ configured: true, ok: true, state: s.state }) }
    }
    return { ok: true, json: async () => ({ configured: true, state: { reading: s.state } }) }
  })
  return s
}

beforeEach(() => {
  localStorage.clear()
  resetReadingMemory()
  vi.clearAllMocks()
  globalThis.fetch = vi.fn(async () => {
    throw new Error('гость не должен ходить в сеть')
  })
})
afterEach(() => vi.restoreAllMocks())

describe('readingProgress — гость', () => {
  it('пустой стейт читается без падения', () => {
    expect(readState()).toEqual({ texts: {} })
    expect(textState(TEXT.id)).toBeNull()
  })

  it('битый JSON не роняет чтение', () => {
    localStorage.setItem(READING_KEY, '{oops')
    expect(readState()).toEqual({ texts: {} })
  })

  it('markExercise пишет результат и черновик, но не ходит в сеть', () => {
    markExercise(TEXT.id, 0, 3, 4)
    expect(textState(TEXT.id).ex[0]).toEqual(r(3, 4))
    expect(JSON.parse(localStorage.getItem(READING_KEY)).texts[TEXT.id].ex[0]).toEqual(r(3, 4))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('пересдача хуже прежней не портит результат и не будит слушателей', () => {
    markExercise(TEXT.id, 0, 4, 4)
    const spy = vi.fn()
    window.addEventListener(READING_PROGRESS_EVENT, spy)
    markExercise(TEXT.id, 0, 1, 4)
    window.removeEventListener(READING_PROGRESS_EVENT, spy)
    expect(textState(TEXT.id).ex[0]).toEqual(r(4, 4))
    expect(spy).not.toHaveBeenCalled()
  })

  it('лучший результат перезаписывается', () => {
    markExercise(TEXT.id, 0, 1, 4)
    markExercise(TEXT.id, 0, 4, 4)
    expect(textState(TEXT.id).ex[0].score).toBe(4)
  })

  it('markTextDone повторно не пишет, но в домашку отчитывается каждый раз', () => {
    // Текст, дочитанный ДО того, как его задали на дом, иначе не засчитывался
    // в домашке никогда — сколько его ни проходи (ревью 08.10.2026). Повтор
    // бэкенд игнорирует; так же устроена грамматика (markUnitDone).
    markTextDone(TEXT.id)
    const spy = vi.fn()
    window.addEventListener(READING_PROGRESS_EVENT, spy)
    markTextDone(TEXT.id)
    window.removeEventListener(READING_PROGRESS_EVENT, spy)
    expect(textState(TEXT.id).done).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    expect(countUnitTowardsHomework).toHaveBeenCalledTimes(2)
    expect(countUnitTowardsHomework).toHaveBeenLastCalledWith('reading', 'a1', TEXT.id)
  })

  it('«дочитал» не стирает уже сохранённые упражнения', () => {
    markExercise(TEXT.id, 1, 2, 2)
    markTextDone(TEXT.id)
    expect(textState(TEXT.id)).toMatchObject({ done: true, ex: { 1: r(2, 2) } })
  })

  it('шлёт событие прогресса — по нему пересчитываются карточки каталога', () => {
    const spy = vi.fn()
    window.addEventListener(READING_PROGRESS_EVENT, spy)
    markExercise(TEXT.id, 0, 1, 4)
    window.removeEventListener(READING_PROGRESS_EVENT, spy)
    expect(spy).toHaveBeenCalled()
  })

  it('забитый localStorage не теряет результаты страницы', () => {
    fillStorage()
    markExercise(TEXT.id, 0, 4, 4)
    markExercise(TEXT.id, 1, 2, 2)
    expect(progressOf(TEXT)).toEqual({ got: 6, total: 6, pct: 100 })
  })

  it('flushReading у гостя — сразу из памяти', async () => {
    markExercise(TEXT.id, 0, 4, 4)
    const res = await flushReading()
    expect(res).toMatchObject({ ok: true, local: true })
    expect(res.state.texts[TEXT.id].ex[0]).toEqual(r(4, 4))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('progressOf считает проценты по всем упражнениям текста', () => {
    markExercise(TEXT.id, 0, 3, 4)
    expect(progressOf(TEXT)).toEqual({ got: 3, total: 6, pct: 50 })
  })

  it('levelProgress усредняет по очкам, а не по текстам', () => {
    markExercise(TEXT.id, 0, 3, 4) // 3 из 6
    markExercise(OTHER.id, 0, 1, 2) // 1 из 2
    expect(levelProgress([TEXT, OTHER])).toBe(50) // 4 из 8
  })

  it('levelDoneCount считает только дочитанные', () => {
    markTextDone(OTHER.id)
    expect(levelDoneCount([TEXT, OTHER])).toBe(1)
  })

  it('пустой уровень не делит на ноль', () => {
    expect(levelProgress([])).toBe(0)
    expect(levelDoneCount(null)).toBe(0)
  })
})

describe('readingProgress — вошедший', () => {
  let server
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, jwt('7'))
    resetReadingMemory()
    server = fakeServer()
  })

  it('«Проверить» шлёт одно задание и берёт ответ сервера', async () => {
    server.state = { texts: { [OTHER.id]: { ex: { 0: r(2, 2) }, done: true } } }
    markExercise(TEXT.id, 0, 3, 4)
    await flushReading()
    expect(server.posts[0]).toEqual({ module: 'reading', state: { texts: { [TEXT.id]: { ex: { 0: r(3, 4) } } } } })
    expect(textState(OTHER.id)).toEqual({ ex: { 0: r(2, 2) }, done: true })
  })

  it('забитый localStorage: на сервер уходят все задания, итог полный', async () => {
    fillStorage()
    markExercise(TEXT.id, 0, 4, 4)
    markExercise(TEXT.id, 1, 2, 2)
    const res = await flushReading()
    expect(res.ok).toBe(true)
    expect(res.state.texts[TEXT.id].ex).toEqual({ 0: r(4, 4), 1: r(2, 2) })
    expect(server.state.texts[TEXT.id].ex).toEqual({ 0: r(4, 4), 1: r(2, 2) })
  })

  it('одна отправка в полёте: следующая ждёт и не теряется', async () => {
    let release
    server.hold = new Promise((res) => {
      release = res
    })
    markExercise(TEXT.id, 0, 4, 4)
    markExercise(TEXT.id, 1, 2, 2)
    expect(server.posts).toHaveLength(1)
    // Ответ на первую дельту ещё не пришёл, но вторая уже видна странице.
    expect(textState(TEXT.id).ex[1]).toEqual(r(2, 2))
    server.hold = null
    release()
    const res = await flushReading()
    expect(server.posts).toHaveLength(2)
    expect(res.state.texts[TEXT.id].ex).toEqual({ 0: r(4, 4), 1: r(2, 2) })
  })

  it('сеть упала — итог из памяти, потом flush досылает', async () => {
    server.down = true
    markExercise(TEXT.id, 0, 4, 4)
    const bad = await flushReading()
    expect(bad.ok).toBe(false)
    expect(bad.state.texts[TEXT.id].ex[0]).toEqual(r(4, 4))
    server.down = false
    const good = await flushReading()
    expect(good.ok).toBe(true)
    expect(server.state.texts[TEXT.id].ex[0]).toEqual(r(4, 4))
  })

  it('смена ученика в той же вкладке — чужой прогресс не виден', () => {
    markExercise(TEXT.id, 0, 4, 4)
    // Вход другим аккаунтом: clearLocalPractice стирает черновик, меняется токен.
    localStorage.removeItem(READING_KEY)
    localStorage.setItem(TOKEN_KEY, jwt('8'))
    expect(textState(TEXT.id)).toBeNull()
  })

  it('открытие раздела подтягивает сервер и досылает недолетевшее', async () => {
    server.state = { texts: { [OTHER.id]: { ex: { 0: r(2, 2) }, done: true } } }
    // Черновик прошлого захода, до сервера не долетевший.
    localStorage.setItem(READING_KEY, JSON.stringify({ texts: { [TEXT.id]: { ex: { 0: r(4, 4) }, done: false } } }))
    resetReadingMemory()
    expect(await loadReadingFromServer()).toBe(true)
    expect(textState(OTHER.id).done).toBe(true)
    await flushReading()
    expect(server.state.texts[TEXT.id].ex[0]).toEqual(r(4, 4))
  })

  it('сервер недоступен при открытии — остаётся черновик', async () => {
    server.down = true
    markExercise(TEXT.id, 0, 4, 4)
    expect(await loadReadingFromServer()).toBe(false)
    expect(textState(TEXT.id).ex[0]).toEqual(r(4, 4))
  })
})
