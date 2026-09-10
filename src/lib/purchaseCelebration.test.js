import { describe, it, expect, beforeEach } from 'vitest'
import { forgetDemoState, trackDemoState } from './purchaseCelebration.js'

// Своё хранилище вместо localStorage: модуль умеет принимать его параметром
// ровно ради этого — тест не зависит от окружения.
function fakeStore() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    size: () => map.size,
  }
}

let store
beforeEach(() => {
  store = fakeStore()
})

describe('переход «демо → полный доступ»', () => {
  it('пока аккаунт демо — поздравлять не с чем', () => {
    expect(trackDemoState(true, store)).toBe(false)
    expect(trackDemoState(true, store)).toBe(false)
  })

  it('снятие демо-флага после демо — повод поздравить', () => {
    trackDemoState(true, store)
    expect(trackDemoState(false, store)).toBe(true)
  })

  it('поздравляем ровно один раз', () => {
    trackDemoState(true, store)
    expect(trackDemoState(false, store)).toBe(true)
    expect(trackDemoState(false, store)).toBe(false)
    expect(trackDemoState(false, store)).toBe(false)
  })

  it('обычный аккаунт, который демо не был, окна не видит', () => {
    expect(trackDemoState(false, store)).toBe(false)
  })

  // Иначе следующий вход поймал бы чужой переход.
  it('выход из аккаунта стирает отметку', () => {
    trackDemoState(true, store)
    forgetDemoState(store)
    expect(trackDemoState(false, store)).toBe(false)
  })

  it('без хранилища (приватный режим) просто ничего не показываем', () => {
    expect(trackDemoState(false, null)).toBe(false)
    expect(trackDemoState(true, null)).toBe(false)
  })

  it('падающее хранилище не роняет приложение', () => {
    const broken = {
      getItem() {
        throw new Error('SecurityError')
      },
      setItem() {},
      removeItem() {},
    }
    expect(trackDemoState(false, broken)).toBe(false)
    expect(() => forgetDemoState(broken)).not.toThrow()
  })
})
