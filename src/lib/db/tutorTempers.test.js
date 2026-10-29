import { describe, expect, it } from 'vitest'
import { mergeTutorTempers, parseTutorTempers } from './tutorTempers.js'

describe('parseTutorTempers — тело запроса', () => {
  it('пропускает только calm/harsh у ключей тьютора', () => {
    expect(parseTutorTempers({ dexter: 'harsh', spark: 'calm' })).toEqual({ dexter: 'harsh', spark: 'calm' })
    expect(parseTutorTempers({ dexter: 'evil', 'x y': 'calm', Spark: 'calm', luna: null })).toEqual({})
  })
  it('мусор вместо объекта — пусто', () => {
    for (const raw of [null, undefined, 'harsh', ['harsh'], 5]) expect(parseTutorTempers(raw)).toEqual({})
  })
  it('не больше десяти тьюторов', () => {
    const many = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`t${'abcdefghijklmno'[i]}`, 'calm']))
    expect(Object.keys(parseTutorTempers(many))).toHaveLength(10)
  })
})

describe('mergeTutorTempers — чтение профиля', () => {
  it('старая колонка — запасной нрав только Спарка', () => {
    expect(mergeTutorTempers('harsh', [])).toEqual({ spark: 'harsh' })
    expect(mergeTutorTempers(null, [])).toEqual({})
  })
  it('строки таблицы важнее старой колонки', () => {
    const rows = [{ tutor: 'spark', temper: 'calm' }, { tutor: 'dexter', temper: 'harsh' }]
    expect(mergeTutorTempers('harsh', rows)).toEqual({ spark: 'calm', dexter: 'harsh' })
  })
  it('битая строка не попадает', () => {
    expect(mergeTutorTempers(null, [{ tutor: 'dexter', temper: 'rage' }])).toEqual({})
  })
})
