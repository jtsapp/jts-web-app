// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rememberPendingScreen, consumePendingScreen, clearPendingScreen } from './pendingScreen.js'

const KEY = 'jts_pending_screen'

beforeEach(() => window.sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('намерение открыть экран переживает вход', () => {
  it('запомненный экран возвращается', () => {
    rememberPendingScreen('homework')
    expect(consumePendingScreen()).toBe('homework')
  })

  // Главное свойство: намерение живёт до ПЕРВОГО применения. Не съедая его, мы
  // возвращали бы человека на присланный экран при каждом следующем входе в
  // этой вкладке — в том числе под другим аккаунтом.
  it('читается один раз', () => {
    rememberPendingScreen('reading')

    expect(consumePendingScreen()).toBe('reading')
    expect(consumePendingScreen()).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('пустое намерение стирает прежнее, а не дописывается к нему', () => {
    rememberPendingScreen('reading')
    rememberPendingScreen('')
    expect(consumePendingScreen()).toBeNull()
  })

  it('не-строку не запоминаем', () => {
    rememberPendingScreen('reading')
    rememberPendingScreen(null)
    expect(consumePendingScreen()).toBeNull()
  })

  it('выход из аккаунта снимает чужое намерение', () => {
    rememberPendingScreen('homework')
    clearPendingScreen()
    expect(consumePendingScreen()).toBeNull()
  })

  it('пустого хранилища достаточно, чтобы ответить «намерения нет»', () => {
    expect(consumePendingScreen()).toBeNull()
  })
})

// Приватный режим и переполненная квота: sessionStorage там бросает на любой
// вызов. Потерять намерение в этом случае не жалко — уронить приложение на
// экране входа нельзя.
describe('недоступное хранилище', () => {
  const бросает = () => {
    throw new Error('SecurityError')
  }

  it('запись не бросает наружу', () => {
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(бросает)
    expect(() => rememberPendingScreen('homework')).not.toThrow()
  })

  it('чтение отвечает «нет намерения», а не падает', () => {
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(бросает)
    expect(consumePendingScreen()).toBeNull()
  })

  it('очистка не бросает наружу', () => {
    vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(бросает)
    expect(() => clearPendingScreen()).not.toThrow()
  })
})
