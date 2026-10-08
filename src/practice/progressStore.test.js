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
  it('гость: память и черновик; pushModule зовётся, но гостю он сам ничего не шлёт', () => {
    list.write(['a1:1'])
    expect(list.read()).toEqual(['a1:1'])
    expect(JSON.parse(localStorage.getItem(LIST_KEY))).toEqual(['a1:1'])
    expect(pushModule).toHaveBeenCalledWith('grammar', ['a1:1'])
  })

  it('вошедший: на сервер уходит полное состояние из памяти', () => {
    login('7')
    list.write(['a1:1'])
    list.write(['a1:1', 'a1:2'])
    expect(pushModule).toHaveBeenLastCalledWith('grammar', ['a1:1', 'a1:2'])
  })

  it('забитый localStorage: память держит всё, сервер получает всё', () => {
    login('7')
    adoptHydratedState({}, ownerOf(jwt('7')))
    fillStorage()
    obj.write({ tasks: { a: 1 } })
    obj.write({ ...obj.read(), tasks: { ...obj.read().tasks, b: 2 } })
    expect(obj.read()).toEqual({ tasks: { a: 1, b: 2 } })
    expect(pushModule).toHaveBeenLastCalledWith('writing', { tasks: { a: 1, b: 2 } }, expect.any(Function))
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

  // Ревью 08.10.2026 (#78): раньше здесь побеждала память — серверное
  // { server: 1 } стиралось, хотя ученик его не трогал.
  it('объект с действиями до ответа сервера — серверное плюс правки ученика', () => {
    login('7')
    obj.write({ tasks: { mine: 1 } })
    adoptHydratedState({ writing: { tasks: { server: 1 } } }, ownerOf(jwt('7')))
    expect(obj.read()).toEqual({ tasks: { server: 1, mine: 1 } })
    expect(pushModule).toHaveBeenLastCalledWith('writing', { tasks: { server: 1, mine: 1 } }, expect.any(Function))
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

// Ревью 08.10.2026 (#78). Разделы-объекты сервер хранит заменой: что пришло,
// то и лежит. Запись до ответа сервера уходила целиком и стирала прогресс с
// другого устройства, а неотправленное после перезагрузки молча проигрывало
// серверному.
describe('progressStore — разделы-объекты: правки не стирают серверное', () => {
  const me = () => ownerOf(jwt('7'))

  it('запись до ответа сервера на сервер не уходит', () => {
    login('7')
    obj.write({ tasks: { mine: 1 } })
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('снятое учеником до ответа сервера не воскресает', () => {
    login('7')
    localStorage.setItem(OBJ_KEY, JSON.stringify({ tasks: { a: 1 } }))
    obj.write({ tasks: {} })
    adoptHydratedState({ writing: { tasks: { a: 1, s: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { s: 1 } })
  })

  it('неотправленное переживает перезагрузку и ложится поверх серверного', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { mine: 1 } }) // отправка не дошла: ack не пришёл
    resetPracticeStores() // перезагрузка страницы: память пуста, хранилище — нет
    pushModule.mockClear()
    adoptHydratedState({ writing: { tasks: { server: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { server: 1, mine: 1 } })
    expect(pushModule).toHaveBeenCalledWith('writing', { tasks: { server: 1, mine: 1 } }, expect.any(Function))
  })

  it('принятое сервером больше не накладывается: сервер снова главный', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { mine: 1 } })
    const ack = pushModule.mock.calls.at(-1)[2]
    ack()
    resetPracticeStores()
    adoptHydratedState({ writing: { tasks: { other: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { other: 1 } })
  })

  it('ack старой отправки не снимает правку, сделанную после неё', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { a: 1 } })
    const first = pushModule.mock.calls.at(-1)[2]
    obj.write({ tasks: { a: 1, b: 1 } })
    first() // сервер принял { a: 1 } — вторая отправка не дошла
    resetPracticeStores()
    adoptHydratedState({ writing: { tasks: { a: 1, s: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { a: 1, s: 1, b: 1 } })
  })

  it('раздела нет на сервере — отложенная запись уходит как есть', () => {
    login('7')
    localStorage.setItem(OBJ_KEY, JSON.stringify({ tasks: { old: 1 } }))
    obj.write({ ...obj.read(), tasks: { old: 1, mine: 1 } })
    adoptHydratedState({ grammar: { done: [] } }, me())
    expect(pushModule).toHaveBeenCalledWith('writing', { tasks: { old: 1, mine: 1 } }, expect.any(Function))
  })

  it('чужая неотправленная правка не ложится на другого ученика', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { mine: 1 } })
    resetPracticeStores()
    localStorage.removeItem(OBJ_KEY)
    login('8')
    adoptHydratedState({ writing: { tasks: { his: 1 } } }, ownerOf(jwt('8')))
    expect(obj.read()).toEqual({ tasks: { his: 1 } })
  })

  it('«галочки» по-прежнему уходят сразу: сервер их объединяет сам', () => {
    login('7')
    list.write(['a1:1'])
    expect(pushModule.mock.calls.at(-1).slice(0, 2)).toEqual(['grammar', ['a1:1']])
  })
})

// Независимое ревью PR: общий ключ неподтверждённого у вкладок, поздний ответ
// прежнего ученика, битая запись патча.
describe('progressStore — вкладки, чужие ответы, битый патч', () => {
  const me = () => ownerOf(jwt('7'))
  const stored = () => JSON.parse(localStorage.getItem('jts_practice_unsynced'))

  it('подтверждение этой вкладки не стирает неподтверждённое соседней', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { a: 1 } })
    const ack = pushModule.mock.calls.at(-1)[2]
    // Соседняя вкладка тем временем положила свою правку в общий ключ.
    const all = stored()
    all.modules.writing.tasks.sub.b = { set: 1 }
    localStorage.setItem('jts_practice_unsynced', JSON.stringify(all))
    ack()
    resetPracticeStores()
    adoptHydratedState({ writing: { tasks: { a: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { a: 1, b: 1 } })
  })

  it('поздний ответ прежнего ученика не отнимает снимок у нового', () => {
    login('8')
    adoptHydratedState({ writing: { tasks: {} } }, ownerOf(jwt('8')))
    adoptHydratedState({ writing: { tasks: { his: 1 } } }, me()) // ответ ученику 7 пришёл после выхода
    obj.write({ tasks: { mine: 1 } })
    expect(pushModule).toHaveBeenLastCalledWith('writing', { tasks: { mine: 1 } }, expect.any(Function))
  })

  it('битая запись неподтверждённого не роняет раздел', () => {
    login('7')
    localStorage.setItem('jts_practice_unsynced', JSON.stringify({ owner: me(), modules: { writing: { tasks: {} } } }))
    adoptHydratedState({ writing: { tasks: { s: 1 } } }, me())
    expect(obj.read()).toEqual({ tasks: { s: 1 } })
  })

  it('раздел не открывали, а неподтверждённое есть — уходит со снимком без строки на сервере', () => {
    login('7')
    localStorage.setItem(OBJ_KEY, JSON.stringify({ tasks: { mine: 1 } }))
    localStorage.setItem('jts_practice_unsynced', JSON.stringify({ owner: me(), modules: { writing: { tasks: { sub: { mine: { set: 1 } } } } } }))
    adoptHydratedState({ grammar: { done: [] } }, me())
    expect(pushModule).toHaveBeenCalledWith('writing', { tasks: { mine: 1 } }, expect.any(Function))
  })
})

// Повторное ревью PR: подтверждение могло не дойти, а патч — жить вечно;
// поздний ответ прежнего ученика стирал неподтверждённое нового.
describe('progressStore — потерянный ответ и чужой ack', () => {
  const me = () => ownerOf(jwt('7'))

  it('сервер уже принял правку, а ответ потерялся — патч не откатывает позднейшее', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { a: 1 } }) // ушло, ответа не было
    resetPracticeStores()
    pushModule.mockClear()
    adoptHydratedState({ writing: { tasks: { a: 1 } } }, me()) // сервер уже знает
    expect(pushModule).not.toHaveBeenCalled()
    resetPracticeStores()
    adoptHydratedState({ writing: { tasks: { a: 5 } } }, me()) // потом другое устройство
    expect(obj.read()).toEqual({ tasks: { a: 5 } })
  })

  it('поздний ack прежнего ученика не стирает неподтверждённое нового', () => {
    login('7')
    adoptHydratedState({ writing: { tasks: {} } }, me())
    obj.write({ tasks: { a: 1 } })
    const lateAck = pushModule.mock.calls.at(-1)[2]
    resetPracticeStores()
    localStorage.removeItem('jts_practice_unsynced')
    login('8')
    adoptHydratedState({ writing: { tasks: {} } }, ownerOf(jwt('8')))
    obj.write({ tasks: { b: 1 } })
    lateAck()
    const stored = JSON.parse(localStorage.getItem('jts_practice_unsynced'))
    expect(stored.owner).toBe(ownerOf(jwt('8')))
    expect(Object.keys(stored.modules)).toEqual(['writing'])
  })
})
