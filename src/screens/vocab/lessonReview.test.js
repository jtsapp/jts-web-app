import { describe, it, expect } from 'vitest'
import {
  cycleQuestionCount,
  planCycle,
  shouldOfferCycle4,
  foldResults,
  answersMatch,
  writeTranslationOk,
  buildChoiceOptions,
  uniqueByKey,
  meaningOf,
  fitTasks,
} from './lessonReview.js'

const words = (n) =>
  Array.from({ length: n }, (_, i) => ({ key: `w${i + 1}`, word: `w${i + 1}` }))

const rng = () => {
  let t = 42
  return () => {
    t = (t * 1664525 + 1013904223) >>> 0
    return t / 2 ** 32
  }
}

describe('lesson vocab cycles', () => {
  it('цикл 1: вопросов столько, сколько слов', () => {
    expect(cycleQuestionCount(12, 1)).toBe(12)
    const tasks = planCycle(words(10), 1, null, rng())
    const q = tasks.reduce((n, t) => n + t.wordKeys.length, 0)
    expect(q).toBe(10)
  })

  it('цикл 1 личного словаря спрашивает только новые слова', () => {
    const tasks = planCycle(words(5), 1, null, rng(), new Set(['w1', 'w2', 'w3']))
    const keys = tasks.flatMap((t) => t.wordKeys)
    expect(keys.sort()).toEqual(['w4', 'w5'])
  })

  it('цикл 2: N+20% и больше вопросов на ошибки', () => {
    expect(cycleQuestionCount(10, 2)).toBe(12)
    const prev = {
      w1: false, w2: false, w3: true, w4: true, w5: true,
      w6: true, w7: true, w8: true, w9: true, w10: true,
    }
    const tasks = planCycle(words(10), 2, prev, rng())
    const keys = tasks.flatMap((t) => t.wordKeys)
    expect(keys).toHaveLength(12)
    const wrongHits = keys.filter((k) => k === 'w1' || k === 'w2').length
    expect(wrongHits).toBeGreaterThanOrEqual(Math.round(12 * 0.8) - 1)
  })

  it('цикл 4 только если остались ошибки, 4–5 вопросов', () => {
    expect(shouldOfferCycle4({ a: true, b: false })).toBe(true)
    expect(shouldOfferCycle4({ a: true, b: true })).toBe(false)
    const tasks = planCycle(words(10), 4, { w1: false, w2: false }, rng())
    const q = tasks.reduce((n, t) => n + t.wordKeys.length, 0)
    expect(q).toBeGreaterThanOrEqual(4)
    expect(q).toBeLessThanOrEqual(5)
    expect(tasks.flatMap((t) => t.wordKeys).every((k) => k === 'w1' || k === 'w2')).toBe(true)
  })

  it('foldResults: ошибка по слову перекрывает поздний успех', () => {
    expect(foldResults([
      { key: 'awkward', ok: true },
      { key: 'awkward', ok: false },
      { key: 'interrupt', ok: true },
    ])).toEqual({ awkward: false, interrupt: true })
  })

  it('сравнение ответов нечувствительно к регистру и пунктуации', () => {
    expect(answersMatch('Awkward!', 'awkward')).toBe(true)
    expect(writeTranslationOk('Неловкий', { translationRu: 'неловкий', translationKz: 'ыңғайсыз' })).toBe(true)
    expect(writeTranslationOk('ыңғайсыз', { translationRu: 'неловкий', translationKz: 'ыңғайсыз' })).toBe(true)
    expect(writeTranslationOk('нет', { translationRu: 'неловкий' })).toBe(false)
  })

  it('choice не повторяет «и» и не дублирует один отвлекающий', () => {
    const word = { key: 'work', word: 'work', translationRu: 'Работайте сверху вниз' }
    const bank = [
      word,
      { key: 'and', word: 'and', translationRu: 'и' },
      { key: 'in', word: 'in', translationRu: 'в' },
    ]
    const opts = buildChoiceOptions(word, bank, 'ru', rng())
    const texts = opts.map((o) => o.text)
    expect(texts.filter((t) => t === 'Работайте сверху вниз')).toHaveLength(1)
    expect(texts).not.toContain('и')
    expect(texts).not.toContain('в')
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts.length).toBeGreaterThanOrEqual(2)
  })

  it('match не троится одно слово и несёт только разные ключи', () => {
    const one = planCycle(words(1), 4, { w1: false }, rng())
    expect(one.some((t) => t.type === 'match')).toBe(false)
    expect(one.every((t) => new Set(t.wordKeys).size === t.wordKeys.length)).toBe(true)

    const many = planCycle(words(10), 1, null, rng())
    const matches = many.filter((t) => t.type === 'match')
    expect(matches.length).toBeGreaterThan(0)
    for (const t of matches) {
      expect(t.wordKeys.length).toBeGreaterThanOrEqual(3)
      expect(new Set(t.wordKeys).size).toBe(t.wordKeys.length)
    }
  })

  // Ниже — случаи из каталога, где знающий ученик получал ошибку
  // (жалоба 17.09.2026 «правильные ответы засчитывает за неправильные»).

  it('апостроф с телефона равен апострофу в данных — в обе стороны', () => {
    // iOS по умолчанию ставит типографский ’; в каталоге встречаются оба.
    expect(answersMatch('What’s your name?', "What's your name?")).toBe(true)
    expect(answersMatch("don't like", 'don’t like')).toBe(true)
    expect(answersMatch('whats your name', "What's your name?")).toBe(false)
  })

  it('знак между словами не склеивает их', () => {
    expect(answersMatch('country/countries', 'Country / countries')).toBe(true)
    expect(answersMatch('numbers 0-20', 'Numbers 0–20')).toBe(true)
    expect(answersMatch('this is', 'This is…')).toBe(true)
  })

  it('слово через дефис принимается раздельно и слитно, прочие слова — нет', () => {
    expect(answersMatch('full time', 'full-time')).toBe(true)
    expect(answersMatch('tshirt', 'T-shirt')).toBe(true)
    expect(answersMatch('look-at', 'look at')).toBe(true)
    expect(answersMatch('alot', 'a lot')).toBe(false)
  })

  it('кириллические двойники латиницы в диктанте не считаются ошибкой', () => {
    expect(answersMatch('саt', 'cat')).toBe(true) // «са» — кириллица
    expect(answersMatch('dog', 'cat')).toBe(false)
  })

  it('перевод из нескольких вариантов принимает каждый', () => {
    const born = { word: 'born', translationRu: 'родился / родилась', translationKz: 'туылған' }
    expect(writeTranslationOk('родился', born)).toBe(true)
    expect(writeTranslationOk('родилась', born)).toBe(true)
    expect(writeTranslationOk('родился / родилась', born)).toBe(true)
    expect(writeTranslationOk('родители', born)).toBe(false)

    const taste = { word: 'taste', translationRu: 'вкус; иметь вкус' }
    expect(writeTranslationOk('иметь вкус', taste)).toBe(true)
    const name = { word: 'name', translationRu: 'имя, фамилия' }
    expect(writeTranslationOk('имя', name)).toBe(true)
  })

  it('запятая внутри фразы — не разделитель вариантов', () => {
    // «спасибо» — не перевод «I'm fine, thanks».
    const fine = { word: "I'm fine, thanks", translationRu: 'У меня всё хорошо, спасибо' }
    expect(writeTranslationOk('спасибо', fine)).toBe(false)
    expect(writeTranslationOk('у меня всё хорошо, спасибо', fine)).toBe(true)
  })

  it('ё и е — одна буква, часть в скобках необязательна', () => {
    expect(writeTranslationOk('партнер', { word: 'partner', translationRu: 'партнёр' })).toBe(true)
    expect(writeTranslationOk('одолжить', { word: 'lend', translationRu: 'одолжить (дать)' })).toBe(true)
    expect(writeTranslationOk('официантка', { word: 'waitress', translationRu: 'официант(ка)' })).toBe(true)
    expect(writeTranslationOk('официант', { word: 'waiter', translationRu: 'официант(ка)' })).toBe(true)
  })

  it('значение слова без перевода — английское определение', () => {
    const awkward = { key: 'awkward', word: 'awkward', translationRu: '', translationKz: '', def: 'making you feel embarrassed' }
    expect(meaningOf(awkward, 'ru')).toBe('making you feel embarrassed')
    expect(meaningOf({ word: 'cat', translationRu: 'кошка', def: 'a small animal' }, 'ru')).toBe('кошка')
  })

  it('choice у слова без перевода строится из определений, а не пропадает', () => {
    const bank = [
      { key: 'awkward', word: 'awkward', def: 'making you feel embarrassed or uncomfortable' },
      { key: 'offend', word: 'offend', def: 'to make somebody upset or angry' },
      { key: 'gesture', word: 'gesture', def: 'a movement that expresses an idea' },
      { key: 'curl', word: 'curl', def: 'to form a curved shape' },
    ]
    const opts = buildChoiceOptions(bank[0], bank, 'ru', rng())
    expect(opts).not.toBeNull()
    expect(opts.filter((o) => o.ok).map((o) => o.text)).toEqual(['making you feel embarrassed or uncomfortable'])
    // русских «запасных» отвлекающих среди английских определений быть не должно
    expect(opts.every((o) => /^[a-z ]+$/i.test(o.text))).toBe(true)
    expect(opts).toHaveLength(4)
  })

  it('choice не подсовывает отвлекающий с тем же переводом', () => {
    const doWord = { key: 'do', word: 'do', translationRu: 'делать' }
    const bank = [
      doWord,
      { key: 'make', word: 'make', translationRu: 'делать / готовить' },
      { key: 'go', word: 'go', translationRu: 'идти' },
      { key: 'big', word: 'big', translationRu: 'Делать' },
    ]
    const texts = buildChoiceOptions(doWord, bank, 'ru', rng()).map((o) => o.text)
    expect(texts).not.toContain('делать / готовить')
    expect(texts).not.toContain('Делать')
    expect(texts.filter((x) => x === 'делать')).toHaveLength(1)
  })

  it('казахский вариант добивается казахскими, а не русскими словами', () => {
    // Русское «время» среди казахских вариантов — подсказка: его отбросит любой.
    const word = { key: 'house', word: 'house', translationRu: 'дом', translationKz: 'үй' }
    const texts = buildChoiceOptions(word, [word], 'kk', rng()).map((o) => o.text)
    expect(texts).toContain('үй')
    expect(texts).toHaveLength(4)
    for (const ru of ['время', 'друг', 'дом', 'говорить', 'сделать', 'идти', 'книга', 'урок']) {
      expect(texts).not.toContain(ru)
    }
  })

  it('fitTasks: слово без значения не попадает в match и choice', () => {
    const byKey = {
      a: { key: 'a', word: 'a1', translationRu: 'один' },
      b: { key: 'b', word: 'b1', translationRu: 'два' },
      c: { key: 'c', word: 'c1', translationRu: 'три' },
      d: { key: 'd', word: 'd1' },
      e: { key: 'e', word: 'e1' },
    }
    const out = fitTasks([
      { type: 'match', wordKeys: ['a', 'b', 'c', 'd'] },
      { type: 'choice', wordKeys: ['e'] },
      { type: 'match', wordKeys: ['a', 'd', 'e'] },
    ], byKey, 'ru')
    expect(out).toEqual([
      { type: 'match', wordKeys: ['a', 'b', 'c'] },
      { type: 'write', wordKeys: ['d'] },
      { type: 'write', wordKeys: ['e'] },
      { type: 'choice', wordKeys: ['a'] },
      { type: 'write', wordKeys: ['d'] },
      { type: 'write', wordKeys: ['e'] },
    ])
  })

  it('uniqueByKey оставляет первое вхождение, planCycle не плодит одно слово', () => {
    expect(uniqueByKey([
      { key: 'work', word: 'work' },
      { key: 'work', word: 'work' },
      { key: 'from', word: 'from' },
    ])).toEqual([{ key: 'work', word: 'work' }, { key: 'from', word: 'from' }])

    const dupes = Array.from({ length: 8 }, () => ({ key: 'work', word: 'work' }))
    const tasks = planCycle(dupes, 1, null, rng())
    const keys = tasks.flatMap((t) => t.wordKeys)
    expect(keys).toEqual(['work'])
    expect(tasks.some((t) => t.type === 'match')).toBe(false)
  })
})

// Сокращения с точками: в словаре «p.m.», ученик набирает «pm» — буквы те же,
// а точки на слух не слышны. Раньше точка резалась в пробел, и «p m» не
// сходилось с «pm».
describe('answersMatch — сокращения с точками', () => {
  it('p.m. == pm, a.m. == am, U.S. == US', () => {
    expect(answersMatch('pm', 'p.m.')).toBe(true)
    expect(answersMatch('p.m.', 'pm')).toBe(true)
    expect(answersMatch('am', 'a.m.')).toBe(true)
    expect(answersMatch('US', 'U.S.')).toBe(true)
  })

  it('точка в конце фразы по-прежнему не мешает', () => {
    expect(answersMatch('I like it', 'I like it.')).toBe(true)
  })

  it('другие слова не склеиваются', () => {
    expect(answersMatch('alot', 'a lot')).toBe(false)
    // Склейка — только вокруг точки: буква «p» и соседние символы без точки
    // остаются как были.
    expect(answersMatch('pen', 'p en')).toBe(false)
    expect(answersMatch('top', 'to')).toBe(false)
  })
})
