import { describe, it, expect } from 'vitest'
import { normalizeTrack, normalizeTracks, normalizeLyrics, sungSeconds, fullText } from './karaokeShape.js'

const RAW_TRACK = {
  id: 1,
  slug: 'rainy-monday',
  title: 'Rainy Monday',
  artist: 'JTS Originals',
  level: 'a2',
  bpm: 92,
  durationSec: 168,
  tags: ['past-simple', 'weather'],
  coverUrl: 'https://files/cover.webp',
  audioUrl: 'https://files/full.mp3',
  instrumentalUrl: 'https://files/inst.mp3',
  lineCount: 24,
  description: { ru: 'Про дождь', en: 'About rain', kk: 'Жаңбыр туралы' },
}

const RAW_LYRICS = {
  version: 1,
  duration: 20,
  vocab: [{ w: 'umbrella', ru: 'зонт', line: 1 }, { w: '', ru: 'пусто' }],
  lines: [
    {
      id: 1,
      start: 1,
      end: 4,
      text: 'I woke up on a rainy Monday',
      ru: 'Я проснулся дождливым понедельником',
      words: [{ w: 'I', t: 1 }, { w: 'woke', t: 1.3 }],
      focus: ['ed-ending'],
      gaps: [1],
    },
    { id: 2, start: 5, end: 8, text: 'And the bus was late again' },
  ],
  hotspots: [
    { afterLine: 1, durationSec: 6, returnAt: 10, difficulty: 2 },
    { afterLine: 2, durationSec: 6, returnAt: 6 }, // внутри строки — выбрасываем
  ],
}

describe('каталог', () => {
  it('приводит уровень к верхнему регистру и оставляет ссылки', () => {
    const t = normalizeTrack(RAW_TRACK)
    expect(t.level).toBe('A2')
    expect(t.instrumentalUrl).toBe('https://files/inst.mp3')
    expect(t.description.kk).toBe('Жаңбыр туралы')
  })

  it('берёт обложку и теги в том виде, в каком их шлёт бэкенд', () => {
    const t = normalizeTrack({
      ...RAW_TRACK,
      coverUrl: undefined,
      coverImageUrl: 'https://files/karaoke/rainy-monday/cover.webp',
      tags: 'past-simple,weather',
      tagList: ['past-simple', 'weather'],
    })
    expect(t.coverUrl).toBe('https://files/karaoke/rainy-monday/cover.webp')
    expect(t.tags).toEqual(['past-simple', 'weather'])
  })

  it('разметка из ответа по одному треку приезжает инлайном', () => {
    const t = normalizeTrack({ ...RAW_TRACK, lyrics: RAW_LYRICS })
    expect(t.lyrics).not.toBe(null)
    expect(normalizeLyrics(t.lyrics).lines).toHaveLength(2)
  })

  it('теги строкой через запятую тоже разбирает', () => {
    expect(normalizeTrack({ ...RAW_TRACK, tags: 'past-simple, weather' }).tags).toEqual([
      'past-simple',
      'weather',
    ])
  })

  it('трек без фонограммы выбрасывается из каталога', () => {
    expect(normalizeTrack({ ...RAW_TRACK, audioUrl: '' })).toBe(null)
    expect(normalizeTracks([RAW_TRACK, { ...RAW_TRACK, audioUrl: '' }])).toHaveLength(1)
  })

  it('без slug ключом прогресса становится id — иначе писать его некуда', () => {
    expect(normalizeTrack({ ...RAW_TRACK, slug: '' }).slug).toBe('id-1')
  })

  it('каталог принимает и голый массив, и страницу Spring', () => {
    expect(normalizeTracks({ content: [RAW_TRACK] })).toHaveLength(1)
    expect(normalizeTracks(null)).toEqual([])
  })
})

describe('разметка', () => {
  it('разбирает строки, словарь и hotspot-ы', () => {
    const doc = normalizeLyrics(RAW_LYRICS)
    expect(doc.lines).toHaveLength(2)
    expect(doc.lines[0].words).toHaveLength(2)
    expect(doc.vocab).toHaveLength(1) // пустое слово выброшено
    expect(doc.hotspots).toHaveLength(1) // второй попадал внутрь строки
  })

  it('пересекающиеся строки делают трек непроигрываемым', () => {
    const broken = { ...RAW_LYRICS, lines: [
      { id: 1, start: 1, end: 5, text: 'one' },
      { id: 2, start: 4, end: 8, text: 'two' },
    ] }
    expect(normalizeLyrics(broken)).toBe(null)
  })

  it('start >= end — тоже непроигрываемый', () => {
    expect(normalizeLyrics({ lines: [{ id: 1, start: 5, end: 5, text: 'x' }] })).toBe(null)
  })

  it('пустая или отсутствующая разметка — null, а не пустой трек', () => {
    expect(normalizeLyrics({ lines: [] })).toBe(null)
    expect(normalizeLyrics(null)).toBe(null)
  })

  it('кривые пословные таймкоды гасят подсветку, но не трек', () => {
    const doc = normalizeLyrics({
      lines: [{ id: 1, start: 1, end: 4, text: 'x y', words: [{ w: 'x', t: 1 }, { w: 'y', t: 9 }] }],
    })
    expect(doc.lines[0].words).toEqual([])
    expect(doc.problems).toHaveLength(1)
  })

  it('длительность берётся из файла, а без неё — по последней строке', () => {
    expect(normalizeLyrics(RAW_LYRICS).duration).toBe(20)
    expect(normalizeLyrics({ lines: RAW_LYRICS.lines }).duration).toBe(8)
  })
})

describe('производные', () => {
  it('суммарное время строк и полный текст', () => {
    const doc = normalizeLyrics(RAW_LYRICS)
    expect(sungSeconds(doc.lines)).toBe(6)
    expect(fullText(doc.lines)).toBe('I woke up on a rainy Monday And the bus was late again')
  })
})
