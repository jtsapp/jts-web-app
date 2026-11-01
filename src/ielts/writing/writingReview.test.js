import { describe, it, expect } from 'vitest'
import { annotate, capBanners, errorView, weakDrills } from './writingReview.js'

describe('разбор Writing: пометки, баннеры, тренировки', () => {
  const paras = ['People has many car. It is bad.', 'The goverment must act. It is bad.']

  it('пометка — в абзаце ошибки, не найденная и пересекающаяся — общим замечанием', () => {
    const errors = [
      { quote: 'It is bad.', para: 2, criterion: 'taskResponse', why: 'x', fix: 'y' },
      { quote: 'goverment', para: 2, criterion: 'lexicalResource', why: 'spelling', fix: 'government', quoteFound: true },
      { quote: 'People has', criterion: 'grammaticalRange', issue: 'agreement', correction: 'People have' }, // старый формат
      { quote: 'not there', para: 1, criterion: 'grammaticalRange', why: 'x', fix: 'y', quoteFound: false },
      { quote: 'has many', para: 1, criterion: 'lexicalResource', why: 'overlap', fix: 'z' },
    ]
    const { parts, placed } = annotate(paras, errors)
    expect([...placed].sort()).toEqual([0, 1, 2])
    expect(parts[0]).toEqual([{ text: 'People has', i: 2 }, { text: ' many car. It is bad.' }])
    expect(parts[1]).toEqual([{ text: 'The ' }, { text: 'goverment', i: 1 }, { text: ' must act. ' }, { text: 'It is bad.', i: 0 }])
    expect(errorView(errors[2])).toMatchObject({ why: 'agreement', fix: 'People have', para: 0 })
  })

  it('баннеры — только известные коды, в порядке экрана; у старых работ — ничего', () => {
    expect(capBanners(['copied_intro', 'off_topic', 'weird'])).toEqual(['off_topic', 'copied_intro'])
    expect(capBanners(undefined)).toEqual([])
  })

  it('тренировки — по критериям ниже 6.5, самый слабый первым, только своей части', () => {
    const c = { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 5.5, grammaticalRange: 6.5 }
    expect(weakDrills(c, 't2')).toEqual(['WD-T2-ACADEMIC', 'WD-T2-PARAPHRASE', 'WD-T2-PLAN', 'WD-T2-RELEVANT', 'WD-T2-TYPE'])
    expect(weakDrills(c, 't1gt')).toEqual(['WD-GT-PURPOSE', 'WD-GT-LETTER'])
    expect(weakDrills(c, 't1ac', new Set(['WD-T1-NOUN', 'WD-T1-OVERVIEW']))).toEqual(['WD-T1-NOUN', 'WD-T1-OVERVIEW'])
    expect(weakDrills(null, 't2')).toEqual([])
  })
})
