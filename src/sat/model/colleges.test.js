import { describe, expect, it } from 'vitest'
import colleges from '../data/colleges.json'
import { byCountry, countriesIn, countryOf } from './colleges.js'
import { rankColleges } from './profile.js'

/** Фильтр вузов по стране в главе 3 онбординга («NEW 2», 17:366). */
describe('страны вузов SAT', () => {
  it('у каждого вуза выгрузки есть страна', () => {
    expect(colleges.rows.filter((c) => !countryOf(c)).map((c) => c.id)).toEqual([])
  })

  it('чипы — только страны из данных, в порядке макета', () => {
    expect(countriesIn(colleges.rows)).toEqual(['US', 'CA', 'KZ', 'SG'])
    expect(countriesIn([{ id: 'x', country: 'FR' }, { id: 'uoft' }])).toEqual(['CA', 'FR'])
  })

  it('«N из M в досягаемости» считается по выбранной стране', () => {
    const kz = byCountry(colleges.rows, 'KZ')
    expect(kz.map((c) => c.id).sort()).toEqual(['kimep', 'nazarbayev'])
    expect(byCountry(colleges.rows, 'all')).toHaveLength(colleges.rows.length)
    const ranked = rankColleges(1350, kz)
    expect(ranked).toHaveLength(2)
    expect(ranked.filter((c) => c.band !== 'below')).toHaveLength(2)
  })
})
