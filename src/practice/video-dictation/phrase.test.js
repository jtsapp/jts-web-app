import { describe, expect, it } from 'vitest'
import { MAX_PHRASE_CHARS, parsePhrase, phrasesOf } from './phrase.js'

const cells = (p) => p.tokens.filter((t) => t.kind === 'cells').map((t) => t.size)
const words = (p) => p.tokens.filter((t) => t.kind === 'text').map((t) => t.text)

describe('фраза с пропусками', () => {
  it('пример спеки: набирается lovemuddy, ячейки двумя группами 4 + 5, остальное — текстом', () => {
    const p = parsePhrase('I [love] jumping in [muddy] puddles!')
    expect(p).toMatchObject({ ok: true, whole: false, target: 'lovemuddy', plain: 'I love jumping in muddy puddles!' })
    expect(p.tokens).toEqual([
      { kind: 'text', text: 'I', glue: false },
      { kind: 'cells', start: 0, size: 4, glue: false },
      { kind: 'text', text: 'jumping', glue: false },
      { kind: 'text', text: 'in', glue: false },
      { kind: 'cells', start: 4, size: 5, glue: false },
      { kind: 'text', text: 'puddles!', glue: false },
    ])
  })

  it('пропуск из двух слов — две группы ячеек подряд', () => {
    const p = parsePhrase('I [want  to] go home.')
    expect(p.target).toBe('wantto')
    expect(cells(p)).toEqual([4, 2])
    expect(words(p)).toEqual(['I', 'go', 'home.'])
  })

  it('апостроф и дефис не набираются; типографский апостроф вне пропуска — можно', () => {
    const p = parsePhrase("It's a [well-known] [kid's] song")
    expect(p.target).toBe('wellknownkids')
    expect(cells(p)).toEqual([9, 4])
    expect(parsePhrase('It’s [fun]')).toMatchObject({ ok: true, target: 'fun', plain: 'It’s fun' })
  })

  it('пробелы схлопываются, края обрезаются, содержимое пропуска тоже: [ love ] — можно', () => {
    expect(parsePhrase('  [Hi]   there  ')).toMatchObject({ ok: true, target: 'hi', plain: 'Hi there' })
    expect(parsePhrase('I [ love ] it')).toMatchObject({ ok: true, target: 'love', plain: 'I love it' })
  })
})

describe('фраза без скобок — пропуск вся фраза', () => {
  it('каждое слово — группа ячеек, знаки препинания не набираются и до ответа не видны', () => {
    const p = parsePhrase("Where's my teddy?")
    expect(p).toMatchObject({ ok: true, whole: true, target: 'wheresmyteddy', plain: "Where's my teddy?" })
    expect(cells(p)).toEqual([6, 2, 5])
    expect(words(p)).toEqual([])
  })

  it('слово без латинских букв ячеек не получает', () => {
    const p = parsePhrase('Wait — what?')
    expect(cells(p)).toEqual([4, 4])
    expect(p.target).toBe('waitwhat')
  })
})

describe('glue — слово стоит вплотную к предыдущему, без пробела', () => {
  const glues = (p) => p.tokens.map((t) => [t.kind === 'cells' ? `cells ${t.size}` : t.text, t.glue])

  it('пропуск внутри слова: un[believ]able — и ячейки, и хвост приклеены', () => {
    expect(glues(parsePhrase('un[believ]able'))).toEqual([
      ['un', false],
      ['cells 6', true],
      ['able', true],
    ])
  })

  it('знак после пропуска приклеен к ячейкам, слово после пробела — нет', () => {
    expect(glues(parsePhrase('I love [puddles].'))).toEqual([
      ['I', false],
      ['love', false],
      ['cells 7', false],
      ['.', true],
    ])
  })

  it('запятая после пропуска приклеена, следующее слово — нет', () => {
    expect(glues(parsePhrase('[Peppa], hi'))).toEqual([
      ['cells 5', false],
      [',', true],
      ['hi', false],
    ])
  })

  it('пробелы внутри скобок не склеивают: [ love ] it', () => {
    expect(glues(parsePhrase('I [ love ] it'))).toEqual([
      ['I', false],
      ['cells 4', false],
      ['it', false],
    ])
  })

  it('вся фраза: слова разделены пробелом — glue false; слово без латинских букв выпадает, а следующее после пробела не приклеено', () => {
    expect(glues(parsePhrase('Hello, George!'))).toEqual([
      ['cells 5', false],
      ['cells 6', false],
    ])
    expect(glues(parsePhrase('Wait — what?'))).toEqual([
      ['cells 4', false],
      ['cells 4', false],
    ])
  })

  it('вся фраза: glue считается по пробелу в тексте, а не по соседнему токену — знак перед словом без пробела клеит его к ячейкам', () => {
    expect(glues(parsePhrase('Wait —what?'))).toEqual([
      ['cells 4', false],
      ['cells 4', false],
    ])
    expect(glues(parsePhrase('Wait… what'))).toEqual([
      ['cells 4', false],
      ['cells 4', false],
    ])
  })
})

describe('буквы ячеек берутся из letters — он приводит к нижнему регистру до фильтра', () => {
  it('été: é не латиница, остаётся «t»', () => {
    const p = parsePhrase('été')
    expect(p.target).toBe('t')
    expect(cells(p)).toEqual([1])
  })

  it('İa (turkish dotted I): lowercase даёт «i̇a» с комбинирующей точкой, ячеек 2 — текущее поведение', () => {
    const p = parsePhrase('İa')
    expect(p.target).toBe('ia')
    expect(cells(p)).toEqual([2])
  })
})

describe('ошибки разметки', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    [null, 'empty'],
    ['a'.repeat(MAX_PHRASE_CHARS + 1), 'tooLong'],
    ['yes | no', 'pipe'],
    ['I have 2 cats', 'digits'],
    ['I [love [you]]', 'nested'],
    ['I love] you', 'unbalanced'],
    ['I [love you', 'unbalanced'],
    ['I [] you', 'emptyGap'],
    ['I [  ] you', 'emptyGap'],
    ['I [lové] you', 'gapChars'],
    ['I [love!] you', 'gapChars'],
    ['Please [don’t] go', 'gapChars'],
    ['I [ - ] you', 'gapNoLetters'],
    ['¡¿…!?', 'noLetters'],
    ['Привет, мир', 'noLetters'],
  ])('%j → %s', (text, error) => {
    expect(parsePhrase(text)).toEqual({ ok: false, error })
  })

  it('ровно 120 знаков — можно; длина считается после схлопывания пробелов', () => {
    expect(parsePhrase('a'.repeat(MAX_PHRASE_CHARS)).ok).toBe(true)
    expect(parsePhrase(`${'a'.repeat(59)}${' '.repeat(40)}${'b'.repeat(60)}`).ok).toBe(true)
  })
})

describe('фразы урока', () => {
  it('неверные времена и разметка пропущены, порядок и номера — по оставшимся', () => {
    const list = phrasesOf([
      [1.5, 3, 'I [love] it'],
      [4, 4, 'Same [start] and end'],
      [5, 7, 'I have 2 cats'],
      'not a segment',
      [-1, 2, '[Negative] start'],
      [8, 9.5, 'Where is my teddy?'],
    ])
    expect(list.map((p) => [p.n, p.start, p.end, p.target])).toEqual([
      [0, 1.5, 3, 'love'],
      [1, 8, 9.5, 'whereismyteddy'],
    ])
  })

  it('не массив — пусто', () => {
    expect(phrasesOf(null)).toEqual([])
  })
})
