// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

/**
 * Сторож vitest.setup.js. Без него на Node 25 `localStorage` в jsdom-тестах —
 * пустышка рантайма без методов, и падают 208 тестов по 23 файлам, каждый со
 * своей невнятной ошибкой. Здесь та же поломка ловится одним падением с
 * понятным названием.
 */
describe('Web Storage в jsdom-тестах', () => {
  for (const name of ['localStorage', 'sessionStorage']) {
    it(`${name} — рабочее хранилище jsdom, а не заглушка Node`, () => {
      const storage = globalThis[name]
      expect(storage).toBe(globalThis.jsdom.window[name])

      storage.clear()
      storage.setItem('k', 'v')
      expect(storage.getItem('k')).toBe('v')
      expect(storage.length).toBe(1)

      storage.clear()
      expect(storage.getItem('k')).toBeNull()
    })
  }
})
