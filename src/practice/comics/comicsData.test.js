// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getComicPage, setComicPage, comicStatus, canSeeAdult, visibleComics } from './comicsData.js'
import { COMICS_POS_KEY } from '../practiceKeys.js'

describe('comicsData — закладка', () => {
  beforeEach(() => localStorage.clear())

  it('без закладки комикс открывается с первой страницы', () => {
    expect(getComicPage('yellow')).toBe(1)
  })

  it('закладка переживает запись и чтение', () => {
    setComicPage('yellow', 42)
    expect(getComicPage('yellow')).toBe(42)
  })

  it('битый JSON в хранилище не роняет чтение', () => {
    localStorage.setItem(COMICS_POS_KEY, '{не json')
    expect(getComicPage('yellow')).toBe(1)
  })

  it('мусорная страница подтягивается к первой', () => {
    setComicPage('yellow', -3)
    expect(getComicPage('yellow')).toBe(1)
    setComicPage('yellow', 'нет')
    expect(getComicPage('yellow')).toBe(1)
  })

  it('закладки разных комиксов не перетирают друг друга', () => {
    setComicPage('yellow', 12)
    setComicPage('other', 5)
    expect(getComicPage('yellow')).toBe(12)
    expect(getComicPage('other')).toBe(5)
  })
})

describe('comicsData — статус карточки', () => {
  beforeEach(() => localStorage.clear())

  it('нетронутый комикс не показывается как начатый', () => {
    expect(comicStatus({ slug: 'yellow', pageCount: 214 })).toMatchObject({ started: false, done: false })
  })

  it('дочитанным считается только последний экран', () => {
    setComicPage('yellow', 213)
    expect(comicStatus({ slug: 'yellow', pageCount: 214 })).toMatchObject({ started: true, done: false })
    setComicPage('yellow', 214)
    expect(comicStatus({ slug: 'yellow', pageCount: 214 })).toMatchObject({ started: true, done: true })
  })

  it('каталог без числа страниц не ломает карточку', () => {
    expect(comicStatus({ slug: 'yellow' })).toMatchObject({ total: 0, started: false })
  })

  it('закладка привязана к slug, а не к id — id меняется при перезаливке', () => {
    setComicPage('yellow', 30)
    expect(comicStatus({ id: 777, slug: 'yellow', pageCount: 214 }).page).toBe(30)
    expect(comicStatus({ id: 1, slug: 'other', pageCount: 214 }).page).toBe(1)
  })
})

describe('comicsData — возрастной гейт', () => {
  // Гейт закрыт по умолчанию: подтвердить возраст пока нечем, и показать 18+
  // неподтверждённому читателю — ошибка дороже, чем спрятать от взрослого.
  it('без профиля и без даты рождения доступа нет', () => {
    expect(canSeeAdult(null)).toBe(false)
    expect(canSeeAdult({})).toBe(false)
    expect(canSeeAdult({ birthDate: '' })).toBe(false)
  })

  it('мусор в дате рождения тоже закрывает доступ', () => {
    expect(canSeeAdult({ birthDate: 'позавчера' })).toBe(false)
  })

  it('совершеннолетие считается по прожитым годам, а не по разнице лет', () => {
    const now = new Date()
    const y = now.getFullYear()
    // Собираем дату из локальных частей: toISOString() переводит в UTC и в
    // плюсовых поясах сдвигает «завтра» на «сегодня» — тест ловил бы сам себя.
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    // Ровно 18 сегодня — уже можно.
    expect(canSeeAdult({ birthDate: iso(new Date(y - 18, now.getMonth(), now.getDate())) })).toBe(true)
    // 18 исполнится завтра — ещё нельзя.
    const tomorrow = new Date(y - 18, now.getMonth(), now.getDate() + 1)
    expect(canSeeAdult({ birthDate: iso(tomorrow) })).toBe(false)
    expect(canSeeAdult({ birthDate: iso(new Date(y - 30, 0, 1)) })).toBe(true)
  })

  it('комиксы 18+ вырезаются из каталога, обычные остаются', () => {
    const list = [
      { slug: 'yellow', adultOnly: true },
      { slug: 'kids', adultOnly: false },
      { slug: 'plain' },
    ]
    expect(visibleComics(list, null).map((c) => c.slug)).toEqual(['kids', 'plain'])
    expect(visibleComics(list, { birthDate: '1990-05-05' }).map((c) => c.slug)).toEqual([
      'yellow',
      'kids',
      'plain',
    ])
  })

  it('не массив вместо каталога не роняет экран', () => {
    expect(visibleComics(null, null)).toEqual([])
    expect(visibleComics(undefined, null)).toEqual([])
  })
})
