// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { recordVocabLearned, learnedCount, learnedKeys, learnedInCards, vocabKey } from './vocabLearned.js'

// Токен не разбирается — нужен только чтобы отделить одного ученика от другого.
const TOKEN = null

describe('прогресс словаря', () => {
  beforeEach(() => localStorage.clear())

  it('ключ строится одинаково из id и из слова', () => {
    // Эту формулу зовут и проверка (когда пишет прогресс), и списки уроков
    // (когда его считают). Пока она жила в двух местах, счётчики расходились.
    expect(vocabKey({ id: 'C1_Like', en: 'like' })).toBe('c1_like')
    expect(vocabKey({ en: 'Coffee' })).toBe('coffee')
    expect(vocabKey({})).toBe('')
  })

  it('счётчик урока — пересечение изученного с его карточками', () => {
    recordVocabLearned(TOKEN, 'A0', ['c1_like', 'c1_listen', 'c9_key'])
    const keys = learnedKeys(TOKEN, 'A0')

    // В уроке четыре слова, из них два уже изучены.
    const lesson = [{ id: 'c1_like' }, { id: 'c1_listen' }, { id: 'c1_ask' }, { id: 'c1_again' }]
    expect(learnedInCards(keys, lesson)).toBe(2)

    // Слово из другого урока в этот счётчик не попадает.
    expect(learnedInCards(keys, [{ id: 'c9_key' }])).toBe(1)
    expect(learnedInCards(keys, [{ id: 'c9_bag' }])).toBe(0)
  })

  it('сумма по урокам не больше числа у уровня', () => {
    // То самое расхождение: снаружи 7, внутри нули. Уровень и его уроки
    // считаются из одного множества, поэтому разойтись уже не могут.
    recordVocabLearned(TOKEN, 'A0', ['a', 'b', 'c'])
    const keys = learnedKeys(TOKEN, 'A0')
    const lessons = [[{ en: 'a' }, { en: 'b' }], [{ en: 'c' }], [{ en: 'd' }]]
    const sum = lessons.reduce((n, l) => n + learnedInCards(keys, l), 0)

    expect(learnedCount(TOKEN, 'A0')).toBe(3)
    expect(sum).toBe(3)
  })

  it('без изученного и без карточек не падает и даёт ноль', () => {
    expect(learnedInCards(learnedKeys(TOKEN, 'A0'), [{ en: 'a' }])).toBe(0)
    expect(learnedInCards(new Set(['a']), null)).toBe(0)
    expect(learnedKeys(TOKEN, '').size).toBe(0)
  })

  it('прогресс не смешивается между наборами', () => {
    recordVocabLearned(TOKEN, 'A0', ['a'])
    recordVocabLearned(TOKEN, 'A1', ['b', 'c'])

    expect(learnedCount(TOKEN, 'A0')).toBe(1)
    expect(learnedCount(TOKEN, 'A1')).toBe(2)
    expect(learnedInCards(learnedKeys(TOKEN, 'A0'), [{ en: 'b' }])).toBe(0)
  })
})
