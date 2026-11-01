import { describe, expect, it } from 'vitest'
import {
  KIND_ORDER, buildPass, buildSession, checkRound, countFreeWords, drillCatalog, fillGap, filterByType, freeChecks, guideSection, normalizeTyped, overlap3,
  prepRound, resolveVisual, roundsForTrack, scorePass, sessionSummary, taskText, tasksForDrill, validateDrill, withRetry,
} from './drillModel.js'
import { importItems, progressFromServer, withRun } from './drillProgress.js'
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
      '/rounds/5/kind: choice | gap | weak | type | sort | html | order | match | spot | pick | free',
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

describe('drillModel — новые виды раундов и правила сессии (writing-dev-pack)', () => {
  const base = { id: 'WD-T1-X', kind: 'drill', module: 'both', title: 'X' }
  const order = { id: 'X-001', kind: 'order', items: ['a', 'b', 'c', 'd'] }
  const match = { id: 'X-002', kind: 'match', pairs: [['shows', 'illustrates'], ['rise', 'increase'], ['fall', 'decline']] }
  const spot = { id: 'X-003', kind: 'spot', tokens: ['rose', 'at', '2010'], wrong: 1, accept: ['in'] }
  const pick = { id: 'X-004', kind: 'pick', visual: { ref: 'W1-AC-010', sub: 0 }, answer: [0, 2] }
  const free = { id: 'X-005', kind: 'free', min: 5, max: 12, starts: ['The'], noDigits: true, checklist: [{ ru: 'Тип графика', en: 'Chart type' }] }

  it('валидатор принимает order / match / spot / pick / free и называет ошибки по пути', () => {
    expect(validateDrill({ ...base, rounds: [order, match, spot, pick, free, { ...free, id: 'X-006', model: 'The graph shows…' }] })).toEqual([])
    const bad = validateDrill({
      ...base,
      rounds: [
        { kind: 'order', items: ['a', 'a'] },
        { kind: 'match', pairs: [['a', 'x'], ['b', 'x']] },
        { kind: 'spot', tokens: ['a', 'b'], wrong: 5, accept: ['c'] },
        { kind: 'pick', answer: [1, 1] },
        { kind: 'free', min: 10, max: 5, checklist: [] },
        { ...order, visual: { ref: 'W1', series: ['x'] } },
        { ...order },
      ],
    })
    expect(bad).toEqual([
      '/rounds/0/items: строки повторяются',
      '/rounds/1/pairs: правые части повторяются',
      '/rounds/2/wrong: индекс слова с ошибкой',
      '/rounds/3/visual: нужен график',
      '/rounds/3/answer: номера точек x без повторов',
      '/rounds/4/max: число слов не меньше min',
      '/rounds/4/checklist: пункты самопроверки',
      '/rounds/5/visual: series — номера серий',
      '/rounds/6/id: повторяется',
    ])
  })

  it('order: перемешивание никогда не совпадает с верным порядком; проверка по позициям', () => {
    // rng 0.99 оставляет массив на месте — порядок всё равно сдвинут
    for (const rng of [() => 0.99, () => 0, Math.random]) {
      const o = prepRound(order, rng)
      expect([...o].sort()).toEqual([0, 1, 2, 3])
      expect(o.every((v, i) => v === i)).toBe(false)
    }
    expect(checkRound(order, [0, 1, 2, 3])).toMatchObject({ correct: true, wrongItems: [] })
    expect(checkRound(order, [1, 0, 2, 3])).toMatchObject({ correct: false, wrongItems: [0, 1] })
  })

  it('match / spot / pick: верно только целиком; spot — не то слово сразу неверно', () => {
    expect(checkRound(match, { 0: 0, 1: 1, 2: 2 }).correct).toBe(true)
    expect(checkRound(match, { 0: 0, 1: 2, 2: 1 })).toMatchObject({ correct: false, wrongItems: [1, 2] })
    expect(checkRound(match, { 0: 0, 1: 1 }).correct).toBe(false)
    expect(checkRound(spot, { hit: 0 })).toMatchObject({ correct: false, expected: 'at → in' })
    expect(checkRound(spot, { hit: 1, text: ' In. ' }).correct).toBe(true)
    expect(checkRound(spot, { hit: 1, text: 'on' }).correct).toBe(false)
    expect(checkRound(pick, [0, 2]).correct).toBe(true)
    expect(checkRound(pick, new Set([0, 1]))).toEqual({ correct: false, expected: null, marks: { 0: 'ok', 1: 'bad', 2: 'miss' } })
  })

  it('free: длина, совпадение с заданием по 3-словиям, цифры и начало', () => {
    const task = 'The graph below shows the number of visitors to a city zoo between 2015 and 2023.'
    expect(overlap3('The graph below shows the number of visitors', task)).toBe(1)
    expect(overlap3('The line chart illustrates how many people visited', task)).toBe(0)
    const ok = checkRound(free, { text: 'The line chart illustrates zoo visitor numbers over eight years.', taskText: task })
    expect(ok.correct).toBe(true)
    expect(ok.checks.map((c) => c.key)).toEqual(['length', 'overlap', 'digits', 'starts'])
    const bad = checkRound(free, { text: 'This graph below shows the number of visitors in 2015.', taskText: task })
    expect(bad.correct).toBe(false)
    expect(Object.fromEntries(bad.checks.map((c) => [c.key, c.ok]))).toEqual({ length: true, overlap: false, digits: false, starts: false })
    // без текста задания проверки совпадения нет
    expect(freeChecks(free, 'The chart', '').map((c) => c.key)).toEqual(['length', 'digits', 'starts'])
    expect(countFreeWords('  a  b c ')).toBe(3)
  })

  it('сессия: show (10 по умолчанию), не больше maxFree free, порядок по виду', () => {
    const many = (kind, n, extra = {}) => Array.from({ length: n }, (_, i) => ({ ...extra, kind, id: `${kind}-${i}` }))
    const doc = {
      ...base,
      rounds: [
        ...many('free', 6, free),
        ...many('order', 3, { items: ['a', 'b'] }),
        ...many('choice', 3, { options: ['a', 'b'], key: 'A' }),
        ...many('spot', 3, { tokens: ['a', 'b'], wrong: 0, accept: ['x'] }),
        ...many('match', 3, { pairs: [['a', 'x'], ['b', 'y']] }),
      ],
    }
    const s = buildSession(doc, 'academic', { rng: Math.random })
    expect(s.items).toHaveLength(10)
    expect(s.items.filter((x) => x.round.kind === 'free').length).toBeLessThanOrEqual(2)
    const ranks = s.items.map((x) => KIND_ORDER[x.round.kind])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(buildSession({ ...doc, show: 4, maxFree: 0 }, 'academic').items.every((x) => x.round.kind !== 'free')).toBe(true)
    expect(buildSession({ ...doc, show: 4 }, 'academic').items).toHaveLength(4)
    expect(buildSession(doc, 'academic', { all: true }).items).toHaveLength(14) // 12 не-free + 2 free
  })

  it('фильтр по типу: от 4 раундов типа — этот тип и ~25% общих; меньше — фильтр снят', () => {
    const r = (ty, i) => ({ kind: 'choice', id: `${ty || 'all'}-${i}`, ty, options: ['a', 'b'], key: 'A' })
    const doc = { ...base, show: 50, rounds: [...[0, 1, 2, 3].map((i) => r('line', i)), ...[0, 1].map((i) => r('bar', i)), ...[0, 1, 2, 3].map((i) => r(undefined, i))] }
    // rng 0.1 < 0.25 — общие раунды берутся все, раунды чужого типа — никогда
    const s = buildSession(doc, 'academic', { ty: 'line', rng: () => 0.1 })
    expect(s.ty).toBe('line')
    expect(s.items.map((x) => x.round.ty || 'all').sort()).toEqual(['all', 'all', 'all', 'all', 'line', 'line', 'line', 'line'])
    expect(buildSession(doc, 'academic', { ty: 'line', rng: () => 0.9 }).items.every((x) => x.round.ty === 'line')).toBe(true)
    const fallback = buildSession(doc, 'academic', { ty: 'bar', rng: () => 0.5 })
    expect(fallback.ty).toBeNull()
    expect(fallback.items).toHaveLength(10)
    expect(filterByType(doc.rounds, null).ty).toBeNull()
  })

  it('ошибка повторяется в конце сессии один раз; итог — по первой попытке, ids для сервера', () => {
    const q0 = [{ round: { ...spot } }, { round: { ...order }, order: [1, 0, 2, 3] }, { round: { ...free } }]
    const q = withRetry(q0, 1, { correct: false })
    expect(q).toHaveLength(4)
    expect(q[3]).toMatchObject({ retry: true, round: order })
    expect(withRetry(q, 3, { correct: false })).toBe(q) // повтор не повторяется
    expect(withRetry(q, 0, { correct: true })).toBe(q)
    expect(withRetry(q, 2, { correct: false })).toBe(q) // free — самопроверка, без повтора
    const results = [{ correct: true }, { correct: false }, { correct: false }, { correct: true }]
    expect(sessionSummary(q, results)).toEqual({ score: 1, total: 3, pct: 33, passed: false, wrong: ['X-001'], right: ['X-003'] })
    expect(sessionSummary(q, [{ correct: true }, { correct: true }, { correct: true }, null]).passed).toBe(true)
  })

  it('график раунда: свой как есть, ссылка — часть multi и выбранные серии', () => {
    const multi = { type: 'multi', charts: [{ type: 'line', x: ['a'], series: [{ name: 'A', values: [1] }, { name: 'B', values: [2] }] }] }
    expect(resolveVisual({ type: 'bar', x: [] }, null)).toEqual({ type: 'bar', x: [] })
    expect(resolveVisual({ ref: 'W1' }, null)).toBeNull()
    expect(resolveVisual({ ref: 'W1', sub: 0, series: [1] }, multi).series).toEqual([{ name: 'B', values: [2] }])
    expect(taskText({ question: 'Q.', bullets: ['one', 'two'] })).toBe('Q. one two')
  })

  it('теория и «применить в задании» — по типу задания', () => {
    expect(guideSection({ guide: 't1ac' }, 'line')).toBe('t1ac.line')
    expect(guideSection({ guide: 't2' }, 'opinion')).toBe('t2.opinion')
    expect(guideSection({ guide: 't1gt' }, 'formal')).toBe('t1gt.formal')
    expect(guideSection({ guide: 't2' }, null)).toBe('t2')
    const items = [
      { id: 'W1-AC-1', kind: 'task1', module: 'academic', category: 'line', attemptCount: 2 },
      { id: 'W1-AC-2', kind: 'task1', module: 'academic', category: 'line' },
      { id: 'W1-AC-3', kind: 'task1', module: 'academic', category: 'bar' },
      { id: 'W1-GT-1', kind: 'task1', module: 'general', category: 'formal' },
      { id: 'W2-1', kind: 'task2', module: 'both', category: 'opinion' },
      { id: 'WD-1', kind: 'drill', module: 'both', category: 'task1' },
    ]
    const drill = { category: 'task1', types: ['line', 'bar'] }
    expect(tasksForDrill(items, drill, 'line', 'academic').map((x) => x.id)).toEqual(['W1-AC-2', 'W1-AC-1'])
    expect(tasksForDrill(items, drill, null, 'academic').map((x) => x.id)).toEqual(['W1-AC-2', 'W1-AC-3', 'W1-AC-1'])
    expect(tasksForDrill(items, { part: 'T2', types: 'all' }, null, 'academic').map((x) => x.id)).toEqual(['W2-1'])
  })

  it('прогресс: строки сервера в проценты, импорт устройства без пробных', () => {
    expect(progressFromServer([{ testId: 'WD-T1-TPL', best: 80, runs: 3, at: 'x' }])).toEqual({ 'WD-T1-TPL': { runs: 3, best: 80, total: 100, at: 'x' } })
    const local = { 'WD-SAMPLE-LINKING': { runs: 1, best: 2, total: 3 }, 'WD-T1-TPL': { runs: 2, best: 3, total: 4, at: 'y' } }
    expect(importItems(local)).toEqual([{ testId: 'WD-T1-TPL', runs: 2, best: 75, at: 'y' }])
  })
})
