import { describe, it, expect } from 'vitest'
import { INFO_PAGES, infoUrl, ru, kz } from './info.js'
import { groupOffers } from './InfoContent.jsx'

// Структура словаря без самих строк: [путь, тип] для каждого листа.
const shape = (o, path = '') =>
  Array.isArray(o) ? [[path, 'array:' + o.length], ...o.flatMap((v, i) => shape(v, `${path}[${i}]`))]
    : o && typeof o === 'object' ? Object.keys(o).sort().flatMap((k) => shape(o[k], `${path}.${k}`))
      : [[path, typeof o]]

describe('страницы для покупателя', () => {
  it('казахский словарь повторяет русский по структуре', () => {
    expect(shape(kz)).toEqual(shape(ru))
  })
  it('у каждой страницы есть название в меню и заголовок', () => {
    for (const p of INFO_PAGES) {
      expect(ru.nav[p]).toBeTruthy()
      expect(ru[p].title).toBeTruthy()
    }
  })
  it('язык в адресе — только казахский, русский по умолчанию', () => {
    expect(infoUrl('refund', 'ru')).toBe('/info/refund')
    expect(infoUrl('refund', 'en')).toBe('/info/refund')
    expect(infoUrl('refund', 'kz')).toBe('/info/refund?lang=kz')
  })
  it('прайс разбит по разделам витрины, неизвестное — в «Другие», ничего не теряется', () => {
    const offers = [
      { code: 'self-1m', kind: 'SELF_STUDY', price: 16500 },
      { code: 'ind-60-8', kind: 'INDIVIDUAL', category: 'GENERAL', price: 60000 },
      { code: 'min-60', kind: 'TUTOR_MINUTES', price: 5000 },
    ]
    const groups = groupOffers(offers)
    expect(groups.map(([cat]) => cat)).toEqual(['SELF', 'GENERAL', 'OTHER'])
    expect(groups.flatMap(([, list]) => list)).toHaveLength(offers.length)
  })
})
