import { describe, it, expect } from 'vitest'
import { practiceCardsOf } from './practiceCards.js'
import { vocabKey } from './vocabLearned.js'

// Кусок настоящего урока A0 №5 из каталога: карточка «Father, mother» —
// заголовок над двумя атомами, а её пример — предложение первого атома.
const LESSON = {
  cards: [
    {
      id: 'c5_family', en: 'Family', ru: 'семья', kk: 'отбасы', atoms: ['a5_family'],
      example: 'I have a big ___: three brothers and two sisters.',
    },
    {
      id: 'c5_father_mother', en: 'Father, mother', ru: 'отец, мать', kk: 'әке, ана',
      atoms: ['a5_father', 'a5_mother'], example: 'My ___ is a doctor. He is fifty.', ipa: 'x',
    },
    { id: 'plain', en: 'plain', ru: 'простой' },
  ],
  atoms: [
    { id: 'a5_family', en: 'family', ru: 'семья', kk: 'отбасы', ipa: 'ˈfæmli', ctx: 'I have a big ___: three brothers and two sisters.', sp: 1 },
    { id: 'a5_father', en: 'father', ru: 'отец', kk: 'әке', ipa: 'ˈfɑːðə', ctx: 'My ___ is a doctor. He is fifty.', sp: 1 },
    { id: 'a5_mother', en: 'mother', ru: 'мать', kk: 'ана', ipa: 'ˈmʌðə', ctx: 'My ___ is a teacher. She is forty-five.', sp: 1 },
  ],
}

describe('practiceCardsOf — что практика спрашивает у карточки урока', () => {
  it('карточку-заголовок спрашивает одним атомом: слово, перевод и пример — от него', () => {
    const [, first] = practiceCardsOf(LESSON, () => 0)
    expect(first).toMatchObject({ en: 'father', ru: 'отец', kk: 'әке', ipa: 'ˈfɑːðə', example: 'My ___ is a doctor. He is fifty.' })

    const [, second] = practiceCardsOf(LESSON, () => 0.99)
    expect(second).toMatchObject({ en: 'mother', ru: 'мать', example: 'My ___ is a teacher. She is forty-five.' })
  })

  it('ключ прогресса остаётся ключом карточки', () => {
    const cards = practiceCardsOf(LESSON, () => 0.5)
    expect(cards.map(vocabKey)).toEqual(LESSON.cards.map(vocabKey))
  })

  it('карточка из одного атома и карточка без атомов не меняются по сути', () => {
    const [family, , plain] = practiceCardsOf(LESSON, () => 0)
    expect(family).toMatchObject({ id: 'c5_family', en: 'Family', ru: 'семья', ipa: 'ˈfæmli' })
    expect(plain).toEqual(LESSON.cards[2])
  })

  it('флаг nogap атома доезжает до карточки — пропуск в таком предложении не спрашиваем', () => {
    const lesson = {
      cards: [{ id: 'c', en: 'call stack', ru: 'стек вызовов', atoms: ['a'], example: 'Each function call pushes a frame onto the ___.' }],
      atoms: [{ id: 'a', en: 'call stack', ru: 'стек вызовов', ctx: 'Each function call pushes a frame onto the ___.', sp: 0, nogap: 1 }],
    }
    expect(practiceCardsOf(lesson)[0].nogap).toBe(true)
  })

  it('у B2 перевода нет — значение берётся из определения атома', () => {
    const lesson = {
      cards: [{ id: 'c', en: 'awkward', ru: '', kk: '', atoms: ['a'], example: 'feel ___.' }],
      atoms: [{ id: 'a', en: 'awkward', ru: '', kk: '', mean: 'making you feel embarrassed', ctx: 'feel ___.', sp: 1 }],
    }
    expect(practiceCardsOf(lesson)[0].def).toBe('making you feel embarrassed')
  })

  it('без урока — пустой список', () => {
    expect(practiceCardsOf(null)).toEqual([])
    expect(practiceCardsOf({})).toEqual([])
  })
})
