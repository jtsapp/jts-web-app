// Связка каталога книг с текстом глав: сопоставление по названию (каталог
// сайта, GET /api/books) и главы из треков админки (detail-эндпоинт бэкенда).
import { describe, it, expect } from 'vitest'
import { normTitle, chaptersFromTracks } from './BookDetail.jsx'

describe('normTitle', () => {
  it('сводит пунктуацию и регистр к одному ключу', () => {
    expect(normTitle("Alice's Adventures in Wonderland")).toBe('alice s adventures in wonderland')
    expect(normTitle('  THE  Jungle—Book! ')).toBe('the jungle book')
  })

  it('пустое название не даёт ключа — иначе совпало бы с любой книгой', () => {
    expect(normTitle('')).toBe('')
    expect(normTitle(null)).toBe('')
  })
})

describe('chaptersFromTracks', () => {
  it('переносит текст и заголовок трека в главу', () => {
    const chapters = chaptersFromTracks([
      { trackIndex: 1, title: 'Chapter One', text: 'It was a bright cold day.' },
      { trackIndex: 2, title: 'Chapter Two', text: 'Winston walked on.' },
    ])
    expect(chapters).toEqual([
      { num: '1', title: 'Chapter One', text: 'It was a bright cold day.', locked: false },
      { num: '2', title: 'Chapter Two', text: 'Winston walked on.', locked: false },
    ])
  })

  // Демо-превью книг админки режет бэкенд (BookPreviewService): за пределами
  // превью текста в ответе нет вовсе, есть только пометка. Читалка обязана
  // донести её до оглавления, иначе глава выглядит просто пустой.
  it('переносит пометку закрытой главы из ответа бэкенда', () => {
    const chapters = chaptersFromTracks([
      { trackIndex: 1, title: 'One', text: 'Открытая глава' },
      { trackIndex: 2, title: 'Two', text: null, locked: true },
    ])
    expect(chapters[0].locked).toBe(false)
    expect(chapters[1].locked).toBe(true)
    expect(chapters[1].text).toBe('')
  })

  it('нумерует по порядку, когда trackIndex не заведён', () => {
    const chapters = chaptersFromTracks([{ title: 'Пролог', text: 'Текст' }])
    expect(chapters[0].num).toBe('1')
  })

  it('оставляет пустые главы рядом с заполненными — заглушку рисует читалка', () => {
    const chapters = chaptersFromTracks([
      { trackIndex: 1, title: 'One', text: 'Есть текст' },
      { trackIndex: 2, title: 'Two', text: '   ' },
    ])
    expect(chapters).toHaveLength(2)
    expect(chapters[1].text).toBe('')
  })

  // Главное правило источника: книга без единого текста не должна подменять
  // собой аудио-треки — иначе аудио-книга превратилась бы в пустую читалку.
  it('без текста ни в одной главе возвращает null', () => {
    expect(chaptersFromTracks([{ title: 'One', audioUrl: 'a.mp3' }])).toBeNull()
    expect(chaptersFromTracks([{ title: 'One', text: '  ' }])).toBeNull()
    expect(chaptersFromTracks([])).toBeNull()
    expect(chaptersFromTracks(null)).toBeNull()
  })
})
