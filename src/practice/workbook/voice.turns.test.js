// @vitest-environment jsdom
// Тире в реплике воркбука — смена говорящего (так записаны диалоги), и это
// должно остаться. Чтение озвучивает прозу через тот же движок и помечает
// реплику solo: там тире вставочное (ревью 08.10.2026).
import { describe, it, expect } from 'vitest'
import { sonioxPlan, turns } from './voice.js'

const LINE = 'Its heart is big too — like a small car!'

describe('turns / sonioxPlan', () => {
  it('диалог воркбука: тире делит реплику на двух дикторов', () => {
    expect(turns('Hi, Tom! — Hello, Ann!')).toEqual([
      { t: 'Hi, Tom!', v: 'A' },
      { t: 'Hello, Ann!', v: 'B' },
    ])
  })

  it('solo: реплика целиком у одного диктора', () => {
    expect(turns(LINE, 'A', true)).toEqual([{ t: LINE, v: 'A' }])
  })

  it('sonioxPlan берёт solo из объекта реплики', () => {
    expect(sonioxPlan([{ t: LINE, solo: true }]).map((c) => [c.t, c.v])).toEqual([[LINE, 'A']])
    expect(sonioxPlan([LINE]).map((c) => c.v)).toEqual(['A', 'B'])
  })
})
