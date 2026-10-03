import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { photoFinder } = require('./card-photos.js')

const own = (index) => ({ level: 'a2', index })
const find = (index, word, ru) => photoFinder([own(index)])(word, ru)

describe('card-photos — свой уровень', () => {
  // Точное слово по-прежнему главнее: у B2 «protect» и «protect (from)» —
  // разные снимки, и карточка «protect» должна остаться при своём.
  it('точное совпадение побеждает', () => {
    expect(find({ 'protect (from)': '/b', protect: '/a' }, 'protect')).toBe('/a')
    expect(find({ 'have a nap': '/b', nap: '/a' }, 'nap')).toBe('/a')
  })

  it('слово записано иначе, снимок тот же', () => {
    expect(find({ homework: '/h' }, 'do homework')).toBe('/h')
    expect(find({ 'to-do list': '/t' }, 'make a to-do list')).toBe('/t')
    expect(find({ Underground: '/u' }, 'the Underground')).toBe('/u')
    expect(find({ romcom: '/r' }, 'rom com')).toBe('/r')
    expect(find({ login: '/l' }, 'log in')).toBe('/l')
    expect(find({ 'up-to-date': '/d' }, 'up to date')).toBe('/d')
    expect(find({ 'bear with': '/b' }, 'bear with (me)')).toBe('/b')
    expect(find({ 'get on well with (someone)': '/g' }, 'get on well with someone')).toBe('/g')
    expect(find({ qualification: '/q' }, 'qualifications')).toBe('/q')
  })

  // Пара на карточке («log on / log out») берёт снимок одной её половины:
  // всё, что на снимке, на карточке есть.
  it('пара на карточке берёт фото половины', () => {
    expect(find({ 'log on': '/l' }, 'log on / log out')).toBe('/l')
    expect(find({ 'Husband, wife': '/hw', wife: '/w' }, 'husband — wife')).toBe('/hw')
    expect(find({ 'go → went': '/g' }, 'go — went')).toBe('/g')
    expect(find({ 'quiet ↔ noisy': '/q' }, 'noisy — quiet')).toBe('/q')
  })

  // Групповой постер старого A0 («Black, blue, brown, green») на карточке
  // «black» повторился бы на четырёх соседних карточках с подписью про
  // чужие слова.
  it('групповой снимок не ставится на карточку одного слова', () => {
    expect(find({ 'Black, blue, brown, green': '/c' }, 'black')).toBeNull()
    expect(find({ 'Children / child': '/c' }, 'child')).toBeNull()
    expect(find({ 'Months (Jan–Dec)': '/m' }, 'next week / month / year')).toBeNull()
  })

  // Лёгкий глагол отбрасывается только у карточки: снимок «make room» —
  // не «room», «take up» — не «get up».
  it('коллокация на снимке не превращается в голое слово', () => {
    expect(find({ 'make room': '/m' }, 'room')).toBeNull()
    expect(find({ 'take up': '/t' }, 'get up')).toBeNull()
    expect(find({ 'go online': '/o' }, 'online')).toBeNull()
  })

  it('короткое слово на -s — другое слово', () => {
    expect(find({ news: '/n' }, 'new')).toBeNull()
    expect(find({ means: '/m' }, 'mean')).toBeNull()
  })

  // Запятая на карточке — часть фразы, а не список слов.
  it('фраза с запятой не берёт снимок одного своего слова', () => {
    expect(find({ sorry: '/s' }, "Sorry, I can't.")).toBeNull()
  })
})

describe('card-photos — сверенные пары', () => {
  it('карточка берёт снимок из списка ALIASES своего уровня', () => {
    const a1 = photoFinder([{ level: 'a1', index: { 'full-time': '/ft', half: '/h' } }])
    expect(a1('work full-time')).toBe('/ft')
    expect(a1('half past')).toBe('/h')
    // на другом уровне та же пара не действует
    expect(photoFinder([{ level: 'a2', index: { half: '/h' } }])('half past')).toBeNull()
  })
})

describe('card-photos — чужой уровень', () => {
  const sources = [
    own({}),
    {
      level: 'b1',
      index: { suit: '/b1/suit', rent: '/b1/rent', hope: '/b1/hope', light: '/b1/light', invent: '/b1/invent' },
      meaning: new Map([
        ['/b1/suit', 'идти, подходить'],
        ['/b1/rent', 'арендная плата'],
        ['/b1/light', 'лёгкий; свет'],
        ['/b1/invent', 'выдумывать, изобретать'],
      ]),
    },
  ]
  const borrow = photoFinder(sources)

  // Слово то же, значение другое: «suit» у B1 — «подходить», у A1 — «костюм».
  it('берёт снимок, только если совпал перевод', () => {
    expect(borrow('rent', 'аренда, арендная плата')).toBe('/b1/rent')
    expect(borrow('suit', 'костюм')).toBeNull()
  })

  // Снимок показывает одно значение: при нескольких через «;» неизвестно
  // какое, через запятую — главное, первое.
  it('многозначный перевод снимка', () => {
    expect(borrow('heavy — light', 'тяжёлый — лёгкий')).toBeNull()
    expect(borrow('invent', 'изобретать')).toBeNull()
  })

  it('без перевода у снимка — не берёт', () => {
    expect(borrow('hope', 'надеяться')).toBeNull()
  })

  it('свой уровень главнее чужого', () => {
    const both = photoFinder([own({ rent: '/a2/rent' }), sources[1]])
    expect(both('rent', 'аренда')).toBe('/a2/rent')
  })
})
