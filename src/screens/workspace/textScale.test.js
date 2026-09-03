// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyStoredTextScale, readTextScale, setTextScale } from './textScale.js'

/**
 * Жалоба: пожилым ученикам с телефона мелко. Размеры урока заданы в пикселях,
 * системная настройка шрифта их не двигает — увеличивает только эта настройка.
 */
function fakeStore() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

describe('крупный текст', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-text-scale')
  })

  it('включение метит документ и запоминается', () => {
    const store = fakeStore()
    expect(setTextScale(true, document, store)).toBe(true)
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg')
    expect(readTextScale(store)).toBe('lg')
  })

  it('выключение снимает метку и забывает выбор', () => {
    const store = fakeStore()
    setTextScale(true, document, store)
    expect(setTextScale(false, document, store)).toBe(false)
    expect(document.documentElement.hasAttribute('data-text-scale')).toBe(false)
    expect(readTextScale(store)).toBeNull()
  })

  it('следующее открытие урока возвращает прежний размер', () => {
    const store = fakeStore()
    setTextScale(true, document, store)
    document.documentElement.removeAttribute('data-text-scale') // новая загрузка
    expect(applyStoredTextScale(document, store)).toBe(true)
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg')
  })

  // Приватный режим: хранилища нет. Настройка не сохранится, но падать нельзя —
  // без этого урок не открылся бы вовсе.
  it('без хранилища работает и не бросает', () => {
    expect(() => setTextScale(true, document, null)).not.toThrow()
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg')
    expect(readTextScale(null)).toBeNull()
    expect(applyStoredTextScale(document, null)).toBe(false)
  })
})
