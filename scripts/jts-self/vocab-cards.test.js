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
  it('приводит слово к безопасному читаемому имени файла', () => {
    expect(imageSlug('don’t like')).toMatch(/^don-t-like-[0-9a-f]{6}$/)
    expect(imageSlug('Look at')).toMatch(/^look-at-[0-9a-f]{6}$/)
  })

  // Находка ревью: в словаре A0 три пары слов, различающихся только тем, что
  // дефисная запись отбрасывает («Why?» и «Why…?», «Who?» и «Who…?»,
  // «How often?» и «How often…?»). Второе слово пары получало картинку первого.
  it('слова, различающиеся только знаками препинания, дают разные имена файлов', () => {
    for (const [a, b] of [['Why?', 'Why…?'], ['Who?', 'Who…?'], ['How often?', 'How often…?']]) {
      expect(imageSlug(a)).not.toBe(imageSlug(b))
    }
  })

  it('слово без латинских букв даёт непустое имя', () => {
    expect(imageSlug('спасибо')).not.toBe('')
    expect(imageSlug('спасибо')).not.toBe(imageSlug('привет'))
  })

  it('имя детерминировано — перегенерация не переименовывает картинки', () => {
    expect(imageSlug('Look at')).toBe(imageSlug('Look at'))
  })
})

describe('vocabCardsTask', () => {
  // Раньше здесь клеился html со своими классами, и плеер печатал его одной
  // простынёй: перевод виден сразу, слово не перевернуть и не забрать в свой
  // словарь — вместо презентации слов получался список. Теперь задание несёт
  // данные, а карточки рисует плеер.
  it('собирает задание-карточки с полями на каждое слово', () => {
    const task = vocabCardsTask(lesson, (w) => `https://cdn/${w}.webp`)
    expect(task.type).toBe('cards')
    expect(task.words).toHaveLength(2)
    expect(task.words[0]).toEqual({
      en: 'like',
      ru: 'нравится',
      kk: 'ұнайды',
      def: 'to feel that something is good',
      img: 'https://cdn/like.webp',
    })
  })

  it('без картинки у слова остаётся img: null, а не битая ссылка', () => {
    const task = vocabCardsTask(lesson, () => null)
    expect(task.words[0].img).toBeNull()
    expect(task.words[0].ru).toBe('нравится')
  })

  it('урок без словаря не даёт задания', () => {
    expect(vocabCardsTask({ no: 1, vocab: [] }, () => null)).toBeNull()
  })

  // Пустые поля не должны приезжать как undefined: карточка рисует перевод и
  // определение по наличию строки, а undefined в JSON просто исчезает — поле
  // потом не отличить от «не было в источнике».
  it('пустые перевод, казахский и определение становятся пустыми строками', () => {
    const task = vocabCardsTask({ no: 1, vocab: [['word']] }, () => null)
    expect(task.words[0]).toEqual({ en: 'word', ru: '', kk: '', def: '', img: null })
  })
})
