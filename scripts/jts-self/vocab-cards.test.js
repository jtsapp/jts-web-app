import { describe, it, expect } from 'vitest'
import { vocabCardsTask, imageSlug } from './vocab-cards.js'

const lesson = {
  no: 1,
  vocab: [
    ['like', '', 'нравится', 'ұнайды', 'to feel that something is good'],
    ["don't like", '', 'не нравится', 'ұнамайды', 'the opposite'],
  ],
}

describe('imageSlug', () => {
  it('приводит слово к безопасному имени файла', () => {
    expect(imageSlug('don’t like')).toBe('don-t-like')
    expect(imageSlug('Look at')).toBe('look-at')
  })
})

describe('vocabCardsTask', () => {
  it('собирает info-задание с карточкой на каждое слово', () => {
    const task = vocabCardsTask(lesson, () => 'https://cdn/img.jpg')
    expect(task.type).toBe('info')
    expect(task.html).toContain('like')
    expect(task.html).toContain('нравится')
    expect(task.html.match(/kl-vocab__card/g)).toHaveLength(2)
    expect(task.html).toContain('src="https://cdn/img.jpg"')
  })

  it('без картинки карточка остаётся текстовой', () => {
    const task = vocabCardsTask(lesson, () => null)
    expect(task.html).not.toContain('<img')
    expect(task.html).toContain('нравится')
  })

  it('урок без словаря не даёт задания', () => {
    expect(vocabCardsTask({ no: 1, vocab: [] }, () => null)).toBeNull()
  })
})
