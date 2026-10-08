// @vitest-environment jsdom
// Словарь Сказок был один на устройство: на общем компьютере второй ученик
// видел слова первого (ревью 08.10.2026). Теперь у каждого свой список.
import { describe, it, expect, beforeEach } from 'vitest'
import { DICT_KEY, dictOwnerOf, scopeFairytaleDict } from './dictOwner.js'

const words = (...w) => JSON.stringify(w.map((x) => ({ w: x })))
const dict = () => JSON.parse(localStorage.getItem(DICT_KEY) || '[]').map((x) => x.w)

// Токен без подписи — payloadOf читает только среднюю часть.
const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId }))}.s`

beforeEach(() => localStorage.clear())

describe('dictOwnerOf', () => {
  it('вошедший — по id, гость — guest', () => {
    expect(dictOwnerOf(tokenFor(7))).toBe('user:7')
    expect(dictOwnerOf(null)).toBe('guest')
  })
})

describe('scopeFairytaleDict', () => {
  it('второй ученик не видит слова первого, первый свои получает обратно', () => {
    scopeFairytaleDict('user:1')
    localStorage.setItem(DICT_KEY, words('snow', 'ice'))

    scopeFairytaleDict('user:2')
    expect(dict()).toEqual([])
    localStorage.setItem(DICT_KEY, words('wolf'))

    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow', 'ice'])

    scopeFairytaleDict('user:2')
    expect(dict()).toEqual(['wolf'])
  })

  it('гость после выхода ученика — с пустым списком, а не с чужим', () => {
    scopeFairytaleDict('user:1')
    localStorage.setItem(DICT_KEY, words('snow'))
    scopeFairytaleDict('guest')
    expect(dict()).toEqual([])
  })

  it('тот же ученик — список на месте, ничего не переставляется', () => {
    scopeFairytaleDict('user:1')
    localStorage.setItem(DICT_KEY, words('snow'))
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow'])
  })

  it('словарь до разведения достаётся первому, кто откроет Сказки', () => {
    localStorage.setItem(DICT_KEY, words('snow'))
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow'])
    scopeFairytaleDict('user:2')
    expect(dict()).toEqual([])
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow'])
  })

  it('хранилище забито: чужой список не стирается, его не удалось отложить', () => {
    scopeFairytaleDict('user:1')
    localStorage.setItem(DICT_KEY, words('snow'))
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function (k, v) {
      if (String(k).startsWith(DICT_KEY + '@')) throw new DOMException('full', 'QuotaExceededError')
      return set.call(this, k, v)
    }
    try {
      scopeFairytaleDict('user:2')
    } finally {
      Storage.prototype.setItem = set
    }
    // Отложить не вышло — список первого остаётся где был, а не пропадает.
    expect(dict()).toEqual(['snow'])
  })
})

describe('scopeFairytaleDict — гость и сбои записи', () => {
  it('гость вошёл в аккаунт — его слова уезжают с ним, а не прячутся', () => {
    scopeFairytaleDict('guest')
    localStorage.setItem(DICT_KEY, words('snow'))
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow'])
    scopeFairytaleDict('guest')
    expect(dict()).toEqual([])
  })

  it('слова гостя сливаются со списком ученика', () => {
    scopeFairytaleDict('user:1')
    localStorage.setItem(DICT_KEY, words('ice'))
    scopeFairytaleDict('guest')
    localStorage.setItem(DICT_KEY, words('snow', 'ice'))
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['ice', 'snow'])
  })

  it('сессия истекла, первым Сказки открыл гость — хозяин после входа видит свой список', () => {
    localStorage.setItem(DICT_KEY, words('snow'))
    scopeFairytaleDict('guest')
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['snow'])
  })

  it('свой список не вернулся, ученик добавил слово — при смене старые слова не теряются', () => {
    // Состояние после неудачного возврата: владелец user:1, его прежний
    // список отложен, а в ключе уже новое слово.
    localStorage.setItem('jts.fairytale.dict.owner', 'user:1')
    localStorage.setItem(DICT_KEY + '@user:1', words('a', 'b', 'c'))
    localStorage.setItem(DICT_KEY, words('d'))
    scopeFairytaleDict('user:2')
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('тот же ученик, отложенный список: сливается с новым, а не ждёт пустого ключа', () => {
    localStorage.setItem('jts.fairytale.dict.owner', 'user:1')
    localStorage.setItem(DICT_KEY + '@user:1', words('a'))
    localStorage.setItem(DICT_KEY, words('d'))
    scopeFairytaleDict('user:1')
    expect(dict()).toEqual(['a', 'd'])
    expect(localStorage.getItem(DICT_KEY + '@user:1')).toBeNull()
  })
})
