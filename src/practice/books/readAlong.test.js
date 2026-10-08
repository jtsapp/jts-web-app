import { describe, it, expect } from 'vitest'
import { chapterProgress, splitSubtitles, subtitleAt, subtitleTextFor } from './readAlong.js'

describe('chapterProgress — полоса в режиме чтения', () => {
  // Экран 955, полоса стоит на 896: текст виден до 896.
  const view = { viewTop: 0, viewBottom: 896 }

  it('в начале главы — 0', () => {
    expect(chapterProgress({ top: 85, bottom: 3000, ...view })).toBe(0)
  })

  it('растёт с прокруткой и даёт 1, когда конец текста поднялся над полосой', () => {
    // Длина главы 2915, видно 896 → прокручивать есть что 2019 px.
    expect(chapterProgress({ top: -1009.5, bottom: 1905.5, ...view })).toBeCloseTo(0.5, 5)
    expect(chapterProgress({ top: 85 - 2104, bottom: 896, ...view })).toBe(1)
  })

  it('короткая глава целиком на экране — сразу 1', () => {
    expect(chapterProgress({ top: 85, bottom: 600, ...view })).toBe(1)
  })

  it('страница докручена до упора — 1, даже если конец текста не дошёл до полосы', () => {
    // Последняя глава: под текстом только нижнее поле 40, а полоса — 60.
    expect(chapterProgress({ top: -2000, bottom: 915, ...view })).toBeLessThan(1)
    expect(chapterProgress({ top: -2000, bottom: 915, ...view, atPageEnd: true })).toBe(1)
  })

  it('битые размеры не роняют экран', () => {
    expect(chapterProgress({ top: 100, bottom: 100, ...view })).toBe(0)
    expect(chapterProgress({ top: 0, bottom: 500, viewTop: 0, viewBottom: 0 })).toBe(0)
  })
})

describe('splitSubtitles', () => {
  it('режет на предложения и держит строки абзацами', () => {
    const subs = splitSubtitles(
      'But it all starts here, with that single, extraordinary truth:\nThe universe had a beginning.\nAnd understanding it is hard!',
    )
    expect(subs.sentences.map((s) => s.text)).toEqual([
      'But it all starts here, with that single, extraordinary truth:',
      'The universe had a beginning.',
      'And understanding it is hard!',
    ])
    expect(subs.paras).toEqual([[0], [1], [2]])
    expect(subs.total).toBe(subs.sentences.at(-1).end)
  })

  it('не рвёт «Mr.», числа и закрывающие кавычки', () => {
    const subs = splitSubtitles('When Mr. Otis bought it for 3.5 pounds, he laughed. "Really?" she asked. Fine')
    expect(subs.sentences.map((s) => s.text)).toEqual([
      'When Mr. Otis bought it for 3.5 pounds, he laughed.',
      '"Really?"',
      'she asked.',
      'Fine',
    ])
    expect(subs.paras).toEqual([[0, 1, 2, 3]])
  })

  it('пустые строки и пустой текст не дают абзацев', () => {
    expect(splitSubtitles('One.\n\n\nTwo.').paras).toEqual([[0], [1]])
    expect(splitSubtitles('').sentences).toEqual([])
    expect(splitSubtitles(null).total).toBe(0)
  })
})

describe('subtitleAt — место по пропорции времени', () => {
  // 10 + 20 + 10 символов: 25% / 50% / 25% длины.
  const subs = {
    sentences: [
      { text: 'a', start: 0, end: 10 },
      { text: 'b', start: 10, end: 30 },
      { text: 'c', start: 30, end: 40 },
    ],
    paras: [[0, 1, 2]],
    total: 40,
  }

  it('до старта и без длительности — ничего не подсвечено', () => {
    expect(subtitleAt(subs, 0, 100).index).toBe(-1)
    expect(subtitleAt(subs, 10, 0).index).toBe(-1)
    expect(subtitleAt(subs, 10, NaN).index).toBe(-1)
    expect(subtitleAt(subs, 10, Infinity).index).toBe(-1)
  })

  it('доля времени ложится на долю символов', () => {
    const first = subtitleAt(subs, 2.5, 100)
    expect(first.index).toBe(0)
    expect(first.frac).toBeCloseTo(0.1, 5)
    expect(subtitleAt(subs, 25, 100)).toEqual({ index: 1, frac: 0 })
    expect(subtitleAt(subs, 50, 100)).toEqual({ index: 1, frac: 0.5 })
    expect(subtitleAt(subs, 80, 100).index).toBe(2)
  })

  it('конец записи — последнее предложение целиком', () => {
    expect(subtitleAt(subs, 100, 100)).toEqual({ index: 2, frac: 1 })
    expect(subtitleAt(subs, 120, 100)).toEqual({ index: 2, frac: 1 })
  })

  it('пустые субтитры — −1', () => {
    expect(subtitleAt(splitSubtitles(''), 5, 10).index).toBe(-1)
  })
})

describe('subtitleTextFor — откуда берём текст трека', () => {
  const tracks = [
    { id: 7, title: 'Down the Rabbit-Hole', audioUrl: 'a.mp3' },
    { id: 8, title: 'The Pool of Tears', audioUrl: 'b.mp3' },
  ]

  it('текст того же трека с бэкенда — по id', () => {
    const apiTracks = [
      { id: 8, trackIndex: 2, text: 'Curiouser and curiouser!' },
      { id: 7, trackIndex: 1, text: 'Alice was beginning to get very tired.' },
    ]
    expect(subtitleTextFor(tracks[0], 0, { apiTracks, trackCount: 2 })).toBe('Alice was beginning to get very tired.')
  })

  it('без id — по trackIndex, а по позиции только при равном числе треков', () => {
    const t = { title: 'X', trackIndex: 2 }
    expect(subtitleTextFor(t, 0, { apiTracks: [{ trackIndex: 2, text: 'two' }], trackCount: 1 })).toBe('two')
    const bare = { title: 'X' }
    expect(subtitleTextFor(bare, 1, { apiTracks: [{ text: 'a' }, { text: 'b' }], trackCount: 2 })).toBe('b')
    expect(subtitleTextFor(bare, 0, { apiTracks: [{ text: 'a' }, { text: 'b' }], trackCount: 3 })).toBe('')
  })

  it('закрытая для демо глава — без субтитров', () => {
    const apiTracks = [{ id: 7, locked: true, text: '' }]
    expect(subtitleTextFor(tracks[0], 0, { apiTracks, trackCount: 2 })).toBe('')
  })

  it('глава статической библиотеки — только при равном числе и том же названии', () => {
    const staticChapters = [
      { title: 'Down the Rabbit-Hole', text: 'Alice was beginning…' },
      { title: 'The Pool of Tears', text: 'Curiouser…' },
    ]
    expect(subtitleTextFor(tracks[1], 1, { staticChapters, trackCount: 2 })).toBe('Curiouser…')
    // Один трек на всю книгу против двенадцати глав — текст не тот.
    expect(subtitleTextFor(tracks[0], 0, { staticChapters, trackCount: 1 })).toBe('')
    // Число совпало, а название нет — тоже не тот.
    const other = [{ title: 'Chapter I', text: 'x' }, { title: 'Chapter II', text: 'y' }]
    expect(subtitleTextFor(tracks[0], 0, { staticChapters: other, trackCount: 2 })).toBe('')
  })

  it('кириллические названия сверяются', () => {
    const t = { title: 'Глава 1: Начало' }
    expect(subtitleTextFor(t, 0, { staticChapters: [{ title: 'глава 1 — начало', text: 'Текст.' }], trackCount: 1 })).toBe(
      'Текст.',
    )
  })

  it('нет ни того, ни другого — пусто', () => {
    expect(subtitleTextFor(tracks[0], 0, { trackCount: 2 })).toBe('')
    expect(subtitleTextFor(undefined, 0)).toBe('')
  })
})
