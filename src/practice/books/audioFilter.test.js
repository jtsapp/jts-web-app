// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  BOOKS_AUDIO_MODES,
  DEFAULT_BOOKS_AUDIO_MODE,
  countByAudio,
  filterByAudio,
  hasAudio,
  readBooksAudioMode,
  writeBooksAudioMode,
} from './audioFilter.js'

// Каталог как его отдаёт /mobile/audio-lessons: аудиокнига с дорожками, книга
// со ссылкой на цельный файл и «текстовая» — залитая выгрузкой библиотеки
// JTS Practice, у неё главы есть, а звука нет.
const AUDIOBOOK = { id: 1, title: 'Alice', tracks: [{ trackIndex: 1, audioUrl: 'a1.mp3' }] }
const WHOLE_FILE = { id: 2, title: 'Dracula', audioUrl: 'dracula.mp3', tracks: [] }
const TEXT_ONLY = { id: 43, title: 'The Canterville Ghost', tracks: [{ trackIndex: 1, audioUrl: '' }] }

describe('hasAudio', () => {
  it('видит звук и у книги целиком, и у отдельной главы', () => {
    expect(hasAudio(AUDIOBOOK)).toBe(true)
    expect(hasAudio(WHOLE_FILE)).toBe(true)
  })

  it('книга из выгрузки библиотеки — без озвучки', () => {
    expect(hasAudio(TEXT_ONLY)).toBe(false)
  })

  it('пустая строка и пробелы — это «поле не заполнили», а не звук', () => {
    expect(hasAudio({ audioUrl: '' })).toBe(false)
    expect(hasAudio({ audioUrl: '   ' })).toBe(false)
    expect(hasAudio({ tracks: [{ audioUrl: '  ' }] })).toBe(false)
  })

  it('битую карточку не роняет', () => {
    expect(hasAudio(null)).toBe(false)
    expect(hasAudio({})).toBe(false)
    expect(hasAudio({ tracks: null })).toBe(false)
    expect(hasAudio({ tracks: [null] })).toBe(false)
  })
})

describe('filterByAudio', () => {
  const CATALOG = [AUDIOBOOK, WHOLE_FILE, TEXT_ONLY]

  it('«все» отдаёт каталог целиком', () => {
    expect(filterByAudio(CATALOG, 'all')).toHaveLength(3)
  })

  it('«аудио» оставляет только озвученные', () => {
    expect(filterByAudio(CATALOG, 'audio').map((b) => b.id)).toEqual([1, 2])
  })

  it('«текст» оставляет только книги без звука', () => {
    expect(filterByAudio(CATALOG, 'text').map((b) => b.id)).toEqual([43])
  })

  it('режимы делят каталог без потерь и без пересечений', () => {
    const text = filterByAudio(CATALOG, 'text')
    const audio = filterByAudio(CATALOG, 'audio')
    expect(text.length + audio.length).toBe(CATALOG.length)
    expect(text.some((b) => audio.includes(b))).toBe(false)
  })

  it('неизвестный режим не прячет библиотеку', () => {
    expect(filterByAudio(CATALOG, 'подкаст')).toHaveLength(3)
    expect(filterByAudio(CATALOG, undefined)).toHaveLength(3)
  })

  it('не каталог — пустой список, а не исключение', () => {
    expect(filterByAudio(null, 'audio')).toEqual([])
    expect(filterByAudio(undefined, 'text')).toEqual([])
  })
})

describe('countByAudio', () => {
  it('считает по каждому режиму', () => {
    expect(countByAudio([AUDIOBOOK, WHOLE_FILE, TEXT_ONLY])).toEqual({ all: 3, audio: 2, text: 1 })
  })

  it('пустой каталог — нули, а не undefined в подписях', () => {
    expect(countByAudio([])).toEqual({ all: 0, audio: 0, text: 0 })
    expect(countByAudio(null)).toEqual({ all: 0, audio: 0, text: 0 })
  })

  it('счётчики совпадают с длиной отфильтрованных списков', () => {
    const catalog = [AUDIOBOOK, WHOLE_FILE, TEXT_ONLY]
    const counts = countByAudio(catalog)
    for (const mode of BOOKS_AUDIO_MODES) {
      expect(filterByAudio(catalog, mode)).toHaveLength(counts[mode])
    }
  })
})

describe('память выбора', () => {
  beforeEach(() => localStorage.clear())

  it('по умолчанию — вся библиотека', () => {
    expect(readBooksAudioMode()).toBe(DEFAULT_BOOKS_AUDIO_MODE)
    expect(DEFAULT_BOOKS_AUDIO_MODE).toBe('all')
  })

  it('выбор переживает перезагрузку', () => {
    writeBooksAudioMode('audio')
    expect(readBooksAudioMode()).toBe('audio')
  })

  it('мусор в хранилище не прячет каталог', () => {
    localStorage.setItem('jts_books_audio', 'подкасты')
    expect(readBooksAudioMode()).toBe('all')
  })

  it('чужой режим не записывается', () => {
    writeBooksAudioMode('audio')
    writeBooksAudioMode('видео')
    expect(readBooksAudioMode()).toBe('audio')
  })
})
