import { describe, it, expect } from 'vitest'
import { parseLrc, buildLyrics, parseVocabFile, fillSkeleton, parseTextFile } from './lrc.js'
import { normalizeLyrics } from '../../src/practice/karaoke/karaokeShape.js'

// LRC пишут руками и выгружают редакторы, поэтому здесь проверяется не столько
// «формат разобрался», сколько что из него выходит разметка, которую плеер
// примет: у LRC нет концов строк, нет длительности и нет запрета на повторы.

const SIMPLE = `[ti:Test Song]
[ar:JTS Originals]
[00:01.00]First line here
[00:05.00]Second line here
[00:09.00]
[00:12.00]Third after a pause
`

describe('разбор', () => {
  it('читает метаданные и строки', () => {
    const { meta, entries } = parseLrc(SIMPLE)
    expect(meta.ti).toBe('Test Song')
    expect(meta.ar).toBe('JTS Originals')
    expect(entries).toHaveLength(4)
    expect(entries[0]).toMatchObject({ start: 1, text: 'First line here' })
    // Пустая метка — маркер паузы, а не мусор: без неё вторая строка тянулась
    // бы до третьей через весь проигрыш.
    expect(entries[2].text).toBe('')
  })

  it('доли секунды: .5 и .50 — это полсекунды, .500 тоже', () => {
    expect(parseLrc('[00:10.5]a').entries[0].start).toBe(10.5)
    expect(parseLrc('[00:10.50]a').entries[0].start).toBe(10.5)
    expect(parseLrc('[00:10.500]a').entries[0].start).toBe(10.5)
  })

  it('одна строка с несколькими метками разворачивается в повторы', () => {
    const { entries } = parseLrc('[00:10.00][01:20.00]Chorus line')
    expect(entries.map((e) => e.start)).toEqual([10, 80])
    expect(entries.every((e) => e.text === 'Chorus line')).toBe(true)
  })

  it('расширенный LRC даёт пословные таймкоды', () => {
    const { entries } = parseLrc('[00:12.40]<00:12.40>I <00:12.62>woke <00:12.95>up')
    expect(entries[0].text).toBe('I woke up')
    expect(entries[0].words).toEqual([
      { w: 'I', t: 12.4 },
      { w: 'woke', t: 12.62 },
      { w: 'up', t: 12.95 },
    ])
  })
})

describe('сборка', () => {
  it('конец строки — начало следующей записи', () => {
    const doc = buildLyrics({ lrc: SIMPLE, duration: 30 })
    expect(doc.lines).toHaveLength(3)
    expect(doc.lines[0]).toMatchObject({ start: 1, end: 5 })
    // Вторая заканчивается на пустой метке паузы, а не на третьей строке.
    expect(doc.lines[1]).toMatchObject({ start: 5, end: 9 })
    expect(doc.duration).toBe(30)
  })

  it('строка не тянется дольше --max-line', () => {
    const lrc = '[00:00.00]Alone for a long while\n[02:00.00]Next one\n'
    const doc = buildLyrics({ lrc, duration: 150, maxLineSec: 8 })
    expect(doc.lines[0].end).toBe(8)
  })

  it('длительность — из фонограммы, а не из последней строки', () => {
    // Иначе на песне с проигрышем в конце маски метрик считались бы по
    // укороченной шкале и завышали балл.
    const doc = buildLyrics({ lrc: SIMPLE, duration: 245 })
    expect(doc.duration).toBe(245)
    expect(doc.lines.at(-1).end).toBeLessThan(245)
  })

  it('offset сдвигает всё, и в правильную сторону', () => {
    const doc = buildLyrics({ lrc: '[offset:+500]\n[00:10.00]Line\n', duration: 20 })
    expect(doc.lines[0].start).toBe(9.5)
  })

  it('переводы раскладываются по строкам, а расхождение в числе — ошибка', () => {
    const doc = buildLyrics({ lrc: SIMPLE, duration: 30, ru: ['раз', 'два', 'три'] })
    expect(doc.lines.map((l) => l.ru)).toEqual(['раз', 'два', 'три'])
    expect(() => buildLyrics({ lrc: SIMPLE, duration: 30, ru: ['раз'] })).toThrow(/должно совпадать/)
  })

  it('словарь сам находит строку со словом', () => {
    const doc = buildLyrics({
      lrc: SIMPLE,
      duration: 30,
      vocab: [{ w: 'pause', ru: 'пауза' }, { w: 'second', ru: 'второй' }],
    })
    expect(doc.vocab).toEqual([
      { w: 'pause', ru: 'пауза', line: 3 },
      { w: 'second', ru: 'второй', line: 2 },
    ])
  })

  it('LRC без единой строки текста — ошибка, а не пустая разметка', () => {
    expect(() => buildLyrics({ lrc: '[00:01.00]\n[00:05.00]\n', duration: 10 })).toThrow(/нет ни одной строки/)
  })

  it('результат принимается плеером как есть', () => {
    const doc = buildLyrics({ lrc: SIMPLE, duration: 30, ru: ['раз', 'два', 'три'] })
    const checked = normalizeLyrics(doc)
    expect(checked).not.toBe(null)
    expect(checked.lines).toHaveLength(3)
    expect(checked.problems).toEqual([])
  })

  it('пословные таймкоды доживают до плеера', () => {
    const lrc = '[00:01.00]<00:01.00>I <00:01.40>woke <00:01.80>up\n[00:05.00]Next\n'
    const doc = buildLyrics({ lrc, duration: 20 })
    const checked = normalizeLyrics(doc)
    expect(checked.lines[0].words).toHaveLength(3)
    expect(checked.problems).toEqual([])
  })
})

describe('скелет + отдельный текст', () => {
  const SKELETON = `[ti:]
# комментарий
[00:08.52] #1
[00:10.22]

[00:15.56] #2
[00:18.20] #3
[00:23.36]
`

  it('подставляет строки по слотам и оставляет метки пауз', () => {
    const filled = fillSkeleton(SKELETON, ['line one', 'line two', 'line three'])
    const doc = buildLyrics({ lrc: filled, duration: 40 })
    expect(doc.lines.map((l) => l.text)).toEqual(['line one', 'line two', 'line three'])
    // Закрывающая метка сработала как конец фразы, а не как отдельная строка.
    expect(doc.lines[0]).toMatchObject({ start: 8.52, end: 10.22 })
    expect(doc.lines[2].end).toBe(23.36)
  })

  it('расхождение в числе строк — понятная ошибка, а не тихий сдвиг', () => {
    expect(() => fillSkeleton(SKELETON, ['one', 'two'])).toThrow(/Строк в тексте 2, а слотов в скелете 3/)
  })

  it('скелет без слотов не принимается', () => {
    expect(() => fillSkeleton('[00:01.00]\n', ['one'])).toThrow(/нет слотов/)
  })

  it('в тексте выбрасываются заголовки разделов и пустые строки', () => {
    expect(parseTextFile('[Verse 1]\nfirst\n\n[Chorus]\nsecond\n')).toEqual(['first', 'second'])
  })
})

describe('файл словаря', () => {
  it('читает «слово = перевод» и явный номер строки', () => {
    const parsed = parseVocabFile('# комментарий\numbrella = зонт\nbus = автобус @ 7\n\n')
    expect(parsed).toEqual([
      { w: 'umbrella', ru: 'зонт', line: undefined },
      { w: 'bus', ru: 'автобус', line: 7 },
    ])
  })
})
