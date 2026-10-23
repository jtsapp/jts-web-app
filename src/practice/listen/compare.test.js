import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compareSentence, containsTarget, enMain, first, forms, letters, lev, missingWords, toks } from './compare.js'

// Оракул — прогон ПРОТОТИПНЫХ функций (scripts/extract-listen-oracle.js).
// Красный тест значит, что порт разъехался с исходником: чинить порт.
const O = JSON.parse(readFileSync(new URL('./__fixtures__/oracle.json', import.meta.url), 'utf8'))

describe('сверка с оракулом прототипа', () => {
  it('toks: разбор ответа на слова', () => {
    for (const [s, want] of O.toks) expect(toks(s), s).toEqual(want)
  })

  it('containsTarget: целевое слово в ответе с формами', () => {
    for (const [raw, en, want] of O.contains) expect(containsTarget(raw, en), `${en} ← ${raw}`).toBe(want)
  })

  it('compareSentence: ошибок в словах до ближайшего варианта', () => {
    for (const [raw, refs, want] of O.compare) expect(compareSentence(raw, refs).d, raw).toBe(want)
  })

  it('missingWords: чего не хватает до образца', () => {
    for (const [raw, ref, want] of O.missing) expect(missingWords(raw, ref), raw).toEqual(want)
  })

  it('lev: опечатки слова', () => {
    for (const [a, b, want] of O.lev) expect(lev(a, b), `${a}/${b}`).toBe(want)
  })
})

describe('мелочи разбора', () => {
  it('буквы, главный вариант, первый перевод', () => {
    expect(letters("O'Clock-Tower 2")).toBe('oclocktower')
    expect(enMain('get up|wake up')).toBe('get up')
    expect(first('мама/мать')).toBe('мама')
  })

  it('неправильные формы и удвоение согласной', () => {
    expect(forms('buy').has('bought')).toBe(true)
    expect(forms('stop').has('stopped')).toBe(true)
    expect(forms('study').has('studies')).toBe(true)
  })

  it('унаследованные ключи не ломают сверку (прототип падал на «constructor»)', () => {
    expect(toks('the constructor')).toEqual(['the', 'constructor'])
    expect(containsTarget('The constructor sets the values.', 'constructor')).toBe(true)
    expect(forms('toString').has('toStrings')).toBe(true)
  })
})
