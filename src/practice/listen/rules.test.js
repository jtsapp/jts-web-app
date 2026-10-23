import { describe, expect, it } from 'vitest'
import { coinsToCredit, isBetter, judgeSentence, judgeWord, sentenceCoins, wordCoins } from './rules.js'

const card = (en, exEn = '', exRu = exEn ? 'перевод' : '') => ({ en, ru: 'x', exEn, exRu, note: '' })

describe('слово', () => {
  it('верно — по любому варианту, «почти» — 1–2 буквы, иначе неверно', () => {
    expect(judgeWord('wakeup', 'get up|wake up')).toBe('ok')
    expect(judgeWord('mothr', 'mother')).toBe('near')
    expect(judgeWord('mther', 'mother')).toBe('near')
    expect(judgeWord('fatherr', 'mother')).toBe('bad')
  })

  it('монеты по таблице ТЗ: 10 / 5 / 2, подсказки считаются нажатиями', () => {
    expect(wordCoins(1, 0)).toBe(10)
    expect(wordCoins(2, 0)).toBe(5)
    expect(wordCoins(1, 1)).toBe(5)
    expect(wordCoins(1, 2)).toBe(2)
  })
})

describe('предложение', () => {
  it('до 6 слов — без ошибок, длиннее — одна', () => {
    const short = card('book', 'This is my book.')
    expect(judgeSentence('this is my book', short).ok).toBe(true)
    expect(judgeSentence('this is a book', short)).toMatchObject({ ok: false, near: true, distance: 1 })
    const long = card('bread', 'We bought bread and milk on the way home.')
    expect(judgeSentence('We bought bread and milk on way home', long).ok).toBe(true)
  })

  it('без целевого слова — «используй слово», даже если остальное совпало', () => {
    expect(judgeSentence('This is my pen', card('book', 'This is my book.'))).toMatchObject({ ok: false, reason: 'needWord' })
  })

  it('«не хватает» — только когда пропущено 1–2 слова', () => {
    expect(judgeSentence('My mother is teacher', card('mother', 'My mother is a teacher.')).missing).toEqual(['a'])
    expect(judgeSentence('mother', card('mother', 'My mother is a teacher.')).missing).toEqual([])
  })

  it('своё предложение: слово, от 4 слов, без кириллицы', () => {
    const own = card('apple')
    expect(judgeSentence('I eat an apple', own).ok).toBe(true)
    expect(judgeSentence('apple is red', own)).toMatchObject({ ok: false, reason: 'minWords' })
    expect(judgeSentence('I eat a pear', own)).toMatchObject({ ok: false, reason: 'needWord' })
    expect(judgeSentence('I eat an apple сегодня', own).ok).toBe(false)
  })

  it('монеты: с первой попытки без подсказки 15, иначе 8', () => {
    expect(sentenceCoins(1, false)).toBe(15)
    expect(sentenceCoins(2, false)).toBe(8)
    expect(sentenceCoins(1, true)).toBe(8)
  })
})

describe('лучший результат и баланс', () => {
  it('лучше — больше монет, при равенстве больше верных', () => {
    expect(isBetter({ coins: 30, ok: 2 }, null)).toBe(true)
    expect(isBetter({ coins: 30, ok: 2 }, { coins: 25, ok: 3 })).toBe(true)
    expect(isBetter({ coins: 30, ok: 3 }, { coins: 30, ok: 2 })).toBe(true)
    expect(isBetter({ coins: 30, ok: 2 }, { coins: 30, ok: 2 })).toBe(false)
  })

  it('в баланс — только прирост к лучшему, прогон без ключа — 0', () => {
    expect(coinsToCredit(50, null, true)).toBe(50)
    expect(coinsToCredit(50, { coins: 30 }, true)).toBe(20)
    expect(coinsToCredit(20, { coins: 30 }, true)).toBe(0)
    expect(coinsToCredit(50, null, false)).toBe(0)
  })
})
