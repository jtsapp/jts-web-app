import { describe, it, expect } from 'vitest'
import { briefLines, hasBrief } from './scenarioBrief.js'

// t() из словаря: на известный ключ отдаёт строку, на неизвестный — сам ключ.
function fakeT(table) {
  return (key) => (key in table ? table[key] : key)
}

describe('briefLines', () => {
  it('режет строку словаря по переводам строки', () => {
    const t = fakeT({ 'scen.brief.x': 'Первое\nВторое\nТретье' })
    expect(briefLines(t, 'x')).toEqual(['Первое', 'Второе', 'Третье'])
  })
  it('выкидывает пустые строки и пробелы по краям', () => {
    const t = fakeT({ 'scen.brief.x': '  Первое  \n\n  Второе\n' })
    expect(briefLines(t, 'x')).toEqual(['Первое', 'Второе'])
  })
  it('нет ключа — нет брифинга (t вернул сам ключ)', () => {
    expect(briefLines(fakeT({}), 'x')).toEqual([])
  })
  it('пустой вход не роняет', () => {
    expect(briefLines(fakeT({}), '')).toEqual([])
    expect(briefLines(null, 'x')).toEqual([])
  })
})

describe('hasBrief', () => {
  it('у сцены без флага брифинга нет', () => {
    expect(hasBrief('hotel-check-in')).toBe(false)
  })
  it('на неизвестный слаг отдаёт false', () => {
    expect(hasBrief('nope')).toBe(false)
  })
})
