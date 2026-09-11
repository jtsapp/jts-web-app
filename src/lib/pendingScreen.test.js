// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rememberPendingScreen, consumePendingScreen, clearPendingScreen, pendingScreenAfterLogin } from './pendingScreen.js'

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

/**
 * Куда вести после входа.
 *
 * Отдельно от самого хранилища: запомнить намерение и принять его — разные
 * решения, и второе умеет отказывать.
 */
describe('намерение после входа', () => {
  const умеетПоАдресу = (screen) => ['homework', 'reading', 'lessons'].includes(screen)

  it('обычный экран возвращается, если открывается по адресу', () => {
    expect(pendingScreenAfterLogin('reading', { persists: умеетПоАдресу })).toBe('reading')
  })

  /**
   * Значение могло лечь ещё прошлой версией приложения, где экран назывался
   * иначе, — человек получил бы пустоту вместо кабинета.
   */
  it('незнакомый экран отбрасывается', () => {
    expect(pendingScreenAfterLogin('старое-имя', { persists: умеетПоАдресу })).toBeNull()
    expect(pendingScreenAfterLogin(null, { persists: умеетПоАдресу })).toBeNull()
    expect(pendingScreenAfterLogin('', { persists: умеетПоАдресу })).toBeNull()
  })

  /**
   * ГЛАВНОЕ. Урок в PERSISTABLE_SCREENS не входит намеренно — без своего id он
   * открылся бы демонстрационным уроком. Но ссылка на карточку, заданную на
   * дом, — это ровно та присланная ссылка, ради которой человек и логинится:
   * открыл домашку с телефона, вкладка попросила войти, и после входа он обязан
   * оказаться на карточке, а не на «Главной».
   */
  it('урок с адресом карточки переживает вход', () => {
    expect(pendingScreenAfterLogin('lesson-workspace', { persists: умеетПоАдресу, hasCardAddress: true }))
      .toBe('lesson-workspace')
  })

  it('урок БЕЗ адреса карточки не возвращается: открылся бы чужим демо-уроком', () => {
    expect(pendingScreenAfterLogin('lesson-workspace', { persists: умеетПоАдресу, hasCardAddress: false })).toBeNull()
    expect(pendingScreenAfterLogin('lesson-workspace', { persists: умеетПоАдресу })).toBeNull()
  })
})
