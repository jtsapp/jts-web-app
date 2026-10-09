import { describe, expect, it } from 'vitest'
import { config } from './proxy.js'

// matcher proxy — строка в стиле path-to-regexp; для этих путей она совпадает
// с обычным регэкспом, якорённым с двух сторон.
const matches = (path) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path))

describe('matcher proxy', () => {
  it('/api под proxy не попадает: иначе Next режет тело запроса на 10 МБ', () => {
    // Шэдоуинг и распознавание шлют записи до 30 МБ — длинная запись
    // приходила бы обрезанной и падала на formData().
    expect(matches('/api/shadowing/assess')).toBe(false)
    expect(matches('/api/transcribe')).toBe(false)
    expect(matches('/api/landing/lead')).toBe(false)
  })

  it('страницы и картинки лендинга — под proxy: на них развилка по домену', () => {
    expect(matches('/')).toBe(true)
    expect(matches('/landing')).toBe(true)
    expect(matches('/landing/img/dexter.webp')).toBe(true)
  })

  it('статика бандла — мимо', () => {
    expect(matches('/_next/static/chunks/a.js')).toBe(false)
  })
})
