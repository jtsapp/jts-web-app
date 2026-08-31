import { describe, it, expect } from 'vitest'
import {
  normalizeComic,
  normalizeComics,
  normalizeComicDoc,
  comicKey,
  comicRef,
} from './comicsShape.js'

// Контракт уже разошёлся с реализацией — читалку сделали по id, а не по slug.
// Поэтому разбор ответа терпим к именам полей: иначе раздел не падает с
// ошибкой, а молча показывает пустоту, и это заметят не сразу.
describe('comicsShape — каталог', () => {
  const full = {
    id: 1,
    slug: 'yellow',
    title: 'Yellow',
    author: 'Jay Martin',
    level: 'B1',
    coverUrl: 'https://files/cover.webp',
    pageCount: 214,
    adultOnly: true,
    description: { ru: 'Роман', en: 'Novel', kk: 'Роман' },
  }

  it('ответ по спеке разбирается как есть', () => {
    expect(normalizeComic(full)).toEqual({
      id: 1,
      slug: 'yellow',
      title: 'Yellow',
      author: 'Jay Martin',
      level: 'B1',
      coverUrl: 'https://files/cover.webp',
      pageCount: 214,
      adultOnly: true,
      description: { ru: 'Роман', en: 'Novel', kk: 'Роман' },
    })
  })

  it('обложка берётся и под другими именами поля', () => {
    expect(normalizeComic({ id: 1, cover: 'a.webp' }).coverUrl).toBe('a.webp')
    expect(normalizeComic({ id: 1, coverImageUrl: 'b.webp' }).coverUrl).toBe('b.webp')
  })

  it('описание берётся и плоскими полями', () => {
    const c = normalizeComic({ id: 1, descriptionRu: 'Р', descriptionEn: 'E' })
    expect(c.description).toEqual({ ru: 'Р', en: 'E', kk: '' })
  })

  it('число страниц читается и как pages, если это число', () => {
    expect(normalizeComic({ id: 1, pages: 214 }).pageCount).toBe(214)
    // Массив страниц числом страниц не считаем — иначе в карточку уедет NaN.
    expect(normalizeComic({ id: 1, pages: [{}, {}] }).pageCount).toBe(0)
  })

  it('запись без id и без slug выбрасывается — адресовать её нечем', () => {
    expect(normalizeComic({ title: 'Без ключа' })).toBe(null)
    expect(normalizeComic(null)).toBe(null)
  })

  it('пагинированный ответ Spring разворачивается в список', () => {
    expect(normalizeComics({ content: [{ id: 1 }, { id: 2 }] }).map((c) => c.id)).toEqual([1, 2])
    expect(normalizeComics(null)).toEqual([])
    expect(normalizeComics([{ id: 3 }, { нет: 'ключа' }]).map((c) => c.id)).toEqual([3])
  })
})

describe('comicsShape — страницы и реплики', () => {
  it('страницы приводятся к n/url/w/h/blocks', () => {
    const doc = normalizeComicDoc({
      id: 1,
      slug: 'yellow',
      pages: [
        {
          number: 1,
          imageUrl: 'p1.webp',
          width: 976,
          height: 1500,
          lines: [{ type: 'BALLOON', textEn: 'Hi', textRu: 'Привет' }],
        },
      ],
    })
    expect(doc.pages).toEqual([
      {
        n: 1,
        url: 'p1.webp',
        w: 976,
        h: 1500,
        blocks: [{ kind: 'balloon', en: 'Hi', ru: 'Привет', kk: '' }],
      },
    ])
  })

  it('страницы сортируются по номеру — читалка листает по индексу массива', () => {
    const doc = normalizeComicDoc({
      id: 1,
      pages: [
        { n: 3, url: 'c' },
        { n: 1, url: 'a' },
        { n: 2, url: 'b' },
      ],
    })
    expect(doc.pages.map((p) => p.url)).toEqual(['a', 'b', 'c'])
  })

  it('страница без картинки выбрасывается, без реплик — остаётся', () => {
    const doc = normalizeComicDoc({ id: 1, pages: [{ n: 1 }, { n: 2, url: 'b.webp' }] })
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0].blocks).toEqual([])
  })

  it('неизвестный вид реплики сводится к balloon, пустая — выбрасывается', () => {
    const doc = normalizeComicDoc({
      id: 1,
      pages: [{ n: 1, url: 'a', blocks: [{ kind: 'thought', en: 'Hm' }, { ru: 'без английского' }] }],
    })
    expect(doc.pages[0].blocks).toEqual([{ kind: 'balloon', en: 'Hm', ru: '', kk: '' }])
  })

  it('число страниц берётся из списка, если сервер его не прислал', () => {
    const doc = normalizeComicDoc({ id: 1, pages: [{ n: 1, url: 'a' }, { n: 2, url: 'b' }] })
    expect(doc.pageCount).toBe(2)
  })
})

describe('comicsShape — ключ и адрес', () => {
  it('адресуем по id, как сделал бэкенд', () => {
    expect(comicRef({ id: 7, slug: 'yellow' })).toBe('7')
  })

  it('без id падаем на slug — так было в спеке', () => {
    expect(comicRef({ slug: 'yellow' })).toBe('yellow')
    expect(comicRef({})).toBe('')
  })

  it('закладка помечается slug: id может смениться при перезаливке', () => {
    expect(comicKey({ id: 7, slug: 'yellow' })).toBe('yellow')
    expect(comicKey({ id: 7 })).toBe('7')
  })
})
