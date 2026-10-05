// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Сеть хранилищу не нужна — оно отдаёт состояние в pushModule; здесь важно, ЧТО
// уходит и когда.
const pushModule = vi.fn()
vi.mock('./practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { createProgressStore, doneListOptions, adoptHydratedState, resetPracticeStores, ownerOf } = await import('./progressStore.js')

const TOKEN_KEY = 'jts_access_token'
const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`
const login = (sub) => localStorage.setItem(TOKEN_KEY, jwt(sub))

const LIST_KEY = 'test_list_done'
const OBJ_KEY = 'test_obj_state'
const list = createProgressStore({ module: 'grammar', key: LIST_KEY, event: 'test-list', ...doneListOptions })
const obj = createProgressStore({
  module: 'writing',
  key: OBJ_KEY,
  event: 'test-obj',
  empty: () => ({ tasks: {} }),
  normalize: (raw) => ({ tasks: raw && typeof raw.tasks === 'object' && raw.tasks ? raw.tasks : {} }),
})

// Забитый localStorage, как у ученика из жалобы 05.10: запись бросает.
function fillStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
}

beforeEach(() => {
  localStorage.clear()
  resetPracticeStores()
  pushModule.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('progressStore — запись и чтение', () => {
  it('гость: память и черновик, без отправки', () => {
    list.write(['a1:1'])
    expect(list.read()).toEqual(['a1:1'])
    expect(JSON.parse(localStorage.getItem(LIST_KEY))).toEqual(['a1:1'])
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('вошедший: на сервер уходит полное состояние из памяти', () => {
    login('7')
    list.write(['a1:1'])
    list.write(['a1:1', 'a1:2'])
    expect(pushModule).toHaveBeenLastCalledWith('grammar', ['a1:1', 'a1:2'])
  })

  it('забитый localStorage: память держит всё, сервер получает всё', () => {
    login('7')
    fillStorage()
    obj.write({ tasks: { a: 1 } })
    obj.write({ ...obj.read(), tasks: { ...obj.read().tasks, b: 2 } })
    expect(obj.read()).toEqual({ tasks: { a: 1, b: 2 } })
    expect(pushModule).toHaveBeenLastCalledWith('writing', { tasks: { a: 1, b: 2 } })
  })

  it('sync:false — без отправки', () => {
    login('7')
    obj.write({ tasks: { a: 1 } }, { sync: false })
    expect(pushModule).not.toHaveBeenCalled()
    expect(obj.read()).toEqual({ tasks: { a: 1 } })
  })

  it('запись шлёт событие раздела', () => {
    const spy = vi.fn()
    window.addEventListener('test-list', spy)
    list.write(['a1:1'])
    window.removeEventListener('test-list', spy)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('смена владельца — память перечитывается, чужое не видно', () => {
    login('7')
    list.write(['a1:1'])
    localStorage.removeItem(LIST_KEY) // clearLocalPractice при входе другим
    login('8')
    expect(list.read()).toEqual([])
  })

  it('черновик поменял кто-то другой (вкладка, уборка) — перечитываем', () => {
    list.write(['a1:1'])
    localStorage.setItem(LIST_KEY, JSON.stringify(['b1:9']))
    expect(list.read()).toEqual(['b1:9'])
  })

  it('пока хранилище не пишет, главная — память, а не устаревший черновик', () => {
    localStorage.setItem(LIST_KEY, JSON.stringify(['old']))
    expect(list.read()).toEqual(['old'])
    fillStorage()
    list.write(['old', 'new'])
    expect(list.read()).toEqual(['old', 'new'])
  })

  it('битый черновик — пустое состояние', () => {
    localStorage.setItem(OBJ_KEY, '{oops')
    expect(obj.read()).toEqual({ tasks: {} })
  })
})

describe('progressStore — сведение с сервером', () => {
  it('«галочки»: объединение, и то, чего нет на сервере, досылается', () => {
    login('7')
    localStorage.setItem(LIST_KEY, JSON.stringify(['a1:1']))
    list.read()
    adoptHydratedState({ grammar: { done: ['a1:2'] } }, ownerOf(jwt('7')))
    expect(list.read()).toEqual(['a1:2', 'a1:1'])
    expect(pushModule).toHaveBeenCalledWith('grammar', ['a1:2', 'a1:1'])
  })

  it('«галочки»: сервер знает всё — отправки нет', () => {
    login('7')
    list.read()
    adoptHydratedState({ grammar: { done: ['a1:2'] } }, ownerOf(jwt('7')))
    expect(list.read()).toEqual(['a1:2'])
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('объект без действий в этой загрузке — побеждает сервер, раздел будится', () => {
    login('7')
    localStorage.setItem(OBJ_KEY, JSON.stringify({ tasks: { stale: 1 } }))
    obj.read()
    const spy = vi.fn()
    window.addEventListener('test-obj', spy)
    adoptHydratedState({ writing: { tasks: { server: 1 } } }, ownerOf(jwt('7')))
    window.removeEventListener('test-obj', spy)
    expect(obj.read()).toEqual({ tasks: { server: 1 } })
    expect(spy).toHaveBeenCalled()
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('объект с действиями до ответа сервера — память остаётся и отправляется', () => {
    login('7')
    obj.write({ tasks: { mine: 1 } })
    pushModule.mockClear()
    adoptHydratedState({ writing: { tasks: { server: 1 } } }, ownerOf(jwt('7')))
    expect(obj.read()).toEqual({ tasks: { mine: 1 } })
    expect(pushModule).toHaveBeenCalledWith('writing', { tasks: { mine: 1 } })
  })

  it('забитый localStorage: серверное всё равно попадает в память', () => {
    login('7')
    localStorage.setItem(OBJ_KEY, JSON.stringify({ tasks: { stale: 1 } }))
    obj.read()
    fillStorage()
    adoptHydratedState({ writing: { tasks: { server: 1 } } }, ownerOf(jwt('7')))
    expect(obj.read()).toEqual({ tasks: { server: 1 } })
  })

  it('хранилище, созданное после ответа сервера, берёт снимок', () => {
    login('7')
    adoptHydratedState({ verbs: { saved: { go: true } } }, ownerOf(jwt('7')))
    fillStorage() // черновик записать не вышло — снимок всё равно в памяти
    const late = createProgressStore({
      module: 'verbs',
      key: 'test_late',
      event: 'test-late',
      empty: () => ({ saved: {} }),
      normalize: (raw) => ({ saved: raw && raw.saved ? raw.saved : {} }),
    })
    expect(late.read()).toEqual({ saved: { go: true } })
  })

  it('снимок другого ученика не применяется', () => {
    login('8')
    adoptHydratedState({ grammar: { done: ['a1:2'] } }, ownerOf(jwt('7')))
    expect(list.read()).toEqual([])
  })

  it('resetPracticeStores забывает снимок и память', () => {
    login('7')
    fillStorage()
    adoptHydratedState({ grammar: { done: ['a1:2'] } }, ownerOf(jwt('7')))
    expect(list.read()).toEqual(['a1:2'])
    vi.restoreAllMocks()
    resetPracticeStores()
    expect(list.read()).toEqual([])
  })
})
