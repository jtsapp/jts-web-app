import { describe, it, expect } from 'vitest'
import { briefLines, hasBrief } from './scenarioBrief.js'
import { SCENARIOS } from './scenarios.js'
import { DICT, LANGS } from '../i18n/dict.js'

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

describe('911-call', () => {
  it('помечен как сцена с брифингом и своими часами', () => {
    const s = SCENARIOS.find((x) => x.id === '911-call')
    expect(s.brief).toBe(true)
    expect(s.timeLimitSec).toBe(300)
  })
})

describe('neighbour-noise', () => {
  it('помечен как сцена с брифингом и без своих часов', () => {
    // Брифинг обязателен: поворот сцены в том, что сверлит квартира 16, а не
    // ученик, и узнать это ему больше неоткуда — соседка пришла ругаться.
    // Часов нет: 22:40 и «тишина с 23:00» — время внутри сцены, не таймер.
    const s = SCENARIOS.find((x) => x.id === 'neighbour-noise')
    expect(s.brief).toBe(true)
    expect(s.timeLimitSec).toBeUndefined()
  })
})

describe('реестр и словарь не разъезжаются', () => {
  // Три правды на одну карточку: флаг brief в реестре, ключ scen.brief.<id> и
  // ключ scen.desc.<id> в словаре. Разъедутся — гейт покажет пустую плашку без
  // кнопки (сцену не начать), а карточка — сырой ключ вместо описания. Проверка
  // общая по реестру, а не по конкретному слагу: ровно так следующая новая
  // сцена и уезжает в прод наполовину подключённой.
  for (const s of SCENARIOS) {
    it(`${s.id}: описание есть во всех трёх языках`, () => {
      for (const lang of LANGS) {
        expect(DICT[lang][`scen.desc.${s.id}`]).toBeTruthy()
      }
    })
    if (s.brief) {
      it(`${s.id}: брифинг есть во всех трёх языках`, () => {
        expect(hasBrief(s.id)).toBe(true)
        for (const lang of LANGS) {
          expect(DICT[lang][`scen.brief.${s.id}`]).toBeTruthy()
        }
      })
    }
  }
})

describe('hasBrief', () => {
  it('у сцены без флага брифинга нет', () => {
    expect(hasBrief('hotel-check-in')).toBe(false)
  })
  it('на неизвестный слаг отдаёт false', () => {
    expect(hasBrief('nope')).toBe(false)
  })
})
