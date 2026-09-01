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
      subtitle: '',
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

  it('подзаголовок читается — уровня у бэкенда нет', () => {
    const c = normalizeComic({ id: 1, subtitle: 'Graphic memoir · 327 pages' })
    expect(c.subtitle).toBe('Graphic memoir · 327 pages')
    expect(c.level).toBe('')
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

  // Форма, которую реально отдаёт бэкенд (см. ComicPage в админке): pageIndex,
  // imageUrl, pngUrl, без размеров и без реплик.
  it('страницы бэкенда с pageIndex и imageUrl разбираются', () => {
    const doc = normalizeComicDoc({
      id: 1,
      slug: 'yellow',
      coverImageUrl: 'cover.webp',
      pages: [
        { id: 10, pageIndex: 0, imageUrl: 'p0.webp', pngUrl: 'p0.png' },
        { id: 11, pageIndex: 1, imageUrl: 'p1.webp' },
      ],
    })
    expect(doc.coverUrl).toBe('cover.webp')
    expect(doc.pages.map((p) => [p.n, p.url])).toEqual([
      [1, 'p0.webp'],
      [2, 'p1.webp'],
    ])
  })

  it('нумерация с нуля сдвигается: иначе счётчик покажет «0 / N», а закладка не сохранится', () => {
    const zero = normalizeComicDoc({ id: 1, pages: [{ pageIndex: 0, imageUrl: 'a' }, { pageIndex: 1, imageUrl: 'b' }] })
    expect(zero.pages.map((p) => p.n)).toEqual([1, 2])
    // Нумерация с единицы не трогается.
    const one = normalizeComicDoc({ id: 1, pages: [{ n: 1, url: 'a' }, { n: 2, url: 'b' }] })
    expect(one.pages.map((p) => p.n)).toEqual([1, 2])
  })

  it('страница без webp берётся png-запаской', () => {
    const doc = normalizeComicDoc({ id: 1, pages: [{ pageIndex: 0, pngUrl: 'only.png' }] })
    expect(doc.pages[0].url).toBe('only.png')
  })

  it('страницы без размеров и реплик не ломают разбор', () => {
    const doc = normalizeComicDoc({ id: 1, pages: [{ pageIndex: 0, imageUrl: 'a.webp' }] })
    expect(doc.pages[0]).toMatchObject({ w: undefined, h: undefined, blocks: [] })
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
