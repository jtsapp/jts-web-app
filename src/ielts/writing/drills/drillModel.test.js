import { describe, expect, it } from 'vitest'
import { buildPass, checkRound, drillCatalog, fillGap, normalizeTyped, roundsForTrack, scorePass, validateDrill } from './drillModel.js'
import { withRun } from './drillProgress.js'
import { SAMPLE_DRILLS, sampleDrill } from './sampleDrills.js'

const seq = (...xs) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

describe('drillModel — короткие тренировки Writing', () => {
  it('пробные дриллы — в форме, которую примет банк, и помечены как пробные', () => {
    expect(SAMPLE_DRILLS.length).toBeGreaterThanOrEqual(6)
    for (const d of SAMPLE_DRILLS) {
      expect(validateDrill(d), d.id).toEqual([])
      expect(d.sample).toBe(true)
      expect(d.id.startsWith('WD-SAMPLE-')).toBe(true)
      expect(d.rounds.length).toBeGreaterThanOrEqual(2)
    }
    expect(new Set(SAMPLE_DRILLS.map((d) => d.id)).size).toBe(SAMPLE_DRILLS.length)
    expect(sampleDrill('WD-SAMPLE-LINKING').title).toBe('Linking words')
  })

  it('у каждого трека свои дриллы: графики — Academic, регистр письма — General Training', () => {
    const ids = (track) => drillCatalog([], SAMPLE_DRILLS).filter((x) => x.module === 'both' || x.module === track).map((x) => x.id)
    expect(ids('academic')).toContain('WD-SAMPLE-T1-OVERVIEW')
    expect(ids('academic')).not.toContain('WD-SAMPLE-GT-REGISTER')
    expect(ids('general')).toContain('WD-SAMPLE-GT-REGISTER')
    expect(ids('general')).not.toContain('WD-SAMPLE-T1-TRENDS')
    // раунд про график внутри общего дрилла GT не видит
    const para = sampleDrill('WD-SAMPLE-PARAPHRASE')
    expect(roundsForTrack(para, 'academic')).toHaveLength(3)
    expect(roundsForTrack(para, 'general')).toHaveLength(2)
  })

  it('ошибки формы называются по пути: ключ вне вариантов, пропуск, корзина, html', () => {
    const base = { id: 'WD-X', kind: 'drill', module: 'both', title: 'X' }
    expect(validateDrill({ ...base, rounds: [] })).toEqual(['/rounds: нужен хотя бы один раунд'])
    const bad = validateDrill({
      ...base,
      rounds: [
        { kind: 'choice', options: ['a', 'b'], key: 'C' },
        { kind: 'gap', text: 'no gap', options: ['a', 'b'], key: 'A' },
        { kind: 'type', text: 'a ___ b', accept: [] },
        { kind: 'sort', bins: [{ key: 'f' }, { key: 'i' }], items: [{ text: 'x', bin: 'f' }, { text: 'y', bin: 'z' }] },
        { kind: 'html', html: ' ' },
        { kind: 'essay' },
      ],
    })
    expect(bad).toEqual([
      '/rounds/0/key: буква варианта A–B',
      '/rounds/1/text: ровно один пропуск ___',
      '/rounds/2/accept: нужен хотя бы один ответ',
      '/rounds/3/items/1: text и bin одной из корзин',
      '/rounds/4/html: нужна разметка упражнения',
      '/rounds/5/kind: choice | gap | weak | type | sort | html',
    ])
  })

  it('проход: show раундов вперемешку, порядок вариантов перемешан, а проверка — по букве исходного порядка', () => {
    const doc = { rounds: [1, 2, 3, 4].map((n) => ({ kind: 'choice', options: [`a${n}`, `b${n}`, `c${n}`], key: 'B' })), show: 2 }
    const pass = buildPass(doc, 'academic', seq(0, 0.99, 0.5))
    expect(pass).toHaveLength(2)
    for (const it of pass) expect([...it.order].sort()).toEqual([0, 1, 2])
    const { round } = pass[0]
    expect(checkRound(round, 1)).toEqual({ correct: true, expected: round.options[1] })
    expect(checkRound(round, 0).correct).toBe(false)
  })

  it('впиши ответ: регистр, пробелы и точка в конце не важны; иначе — неверно с эталоном', () => {
    const r = { kind: 'type', text: 'It ___ at 4%.', accept: ['remained stable', 'stayed the same'] }
    expect(checkRound(r, '  Remained   STABLE. ').correct).toBe(true)
    expect(checkRound(r, 'stayed the same').correct).toBe(true)
    expect(checkRound(r, 'rose')).toEqual({ correct: false, expected: 'remained stable' })
    expect(checkRound(r, '').correct).toBe(false)
    expect(normalizeTyped('Can’t')).toBe("can't")
    expect(fillGap(r.text, 'remained stable')).toBe('It remained stable at 4%.')
  })

  it('сортировка: верно, только если все фразы в своих корзинах; неверные — по индексу', () => {
    const r = sampleDrill('WD-SAMPLE-GT-REGISTER').rounds[0]
    const right = Object.fromEntries(r.items.map((it, i) => [i, it.bin]))
    expect(checkRound(r, right)).toEqual({ correct: true, expected: null, wrongItems: [] })
    expect(checkRound(r, { ...right, 1: 'formal' })).toMatchObject({ correct: false, wrongItems: [1] })
    expect(checkRound(r, {}).wrongItems).toHaveLength(r.items.length)
  })

  it('html-раунд: итог из сообщения страницы; без итога — не в счёт', () => {
    const r = { kind: 'html', html: '<p>x</p>' }
    expect(checkRound(r, { score: 3, total: 3 }).correct).toBe(true)
    expect(checkRound(r, { score: 2, total: 3 }).correct).toBe(false)
    expect(checkRound(r, null).correct).toBeNull()
    expect(scorePass([{ correct: true }, { correct: false }, { correct: null }])).toEqual({ score: 1, total: 2 })
  })

  it('каталог: дриллы банка вытесняют пробные; прогресс устройства — в attemptCount и лучшем счёте', () => {
    const bank = [{ id: 'WD-001', kind: 'drill', module: 'both', title: 'Real drill' }, { id: 'W-T2', kind: 'task2', module: 'both' }]
    expect(drillCatalog(bank, SAMPLE_DRILLS).map((x) => x.id)).toEqual(['WD-001'])
    const samples = drillCatalog([], SAMPLE_DRILLS)
    expect(samples.every((x) => x.sample && x.kind === 'drill')).toBe(true)
    let p = withRun({}, 'WD-001', 1, 3)
    p = withRun(p, 'WD-001', 3, 3)
    p = withRun(p, 'WD-001', 2, 3)
    expect(p['WD-001']).toMatchObject({ runs: 3, best: 3, total: 3 })
    expect(drillCatalog(bank, SAMPLE_DRILLS, p)[0]).toMatchObject({ attemptCount: 3, best: { score: 3, total: 3 } })
  })
})
