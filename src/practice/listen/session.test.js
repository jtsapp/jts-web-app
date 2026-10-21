import { describe, expect, it, vi } from 'vitest'
import { ListenSession } from './session.js'

const MOTHER = { en: 'mother', ru: 'мама', exEn: 'My mother is a teacher.', exRu: 'Моя мама — учитель.', note: '' }
const GETUP = { en: 'get up', ru: 'вставать', exEn: 'I get up at seven.', exRu: 'Я встаю в семь.', note: '' }
const APPLE = { en: 'apple', ru: 'яблоко', exEn: '', exRu: '', note: '' }

function make(cards = [MOTHER, GETUP]) {
  const said = []
  const onItem = vi.fn()
  const onDone = vi.fn()
  const s = new ListenSession({ cards, onSay: (t, k) => said.push(`${k}:${t}`), onItem, onDone })
  return { s, said, onItem, onDone, snap: () => s.getSnapshot() }
}

describe('слово', () => {
  it('набрал все буквы — проверка сразу; верно с первой без подсказок — 10 и шаг 2', () => {
    const { s, said, snap } = make()
    s.typeWord('Moth3er')
    expect(snap().item).toMatchObject({ step: 'sent', wordOk: true, wordMark: 'ok', wordFeedback: { kind: 'ok', coins: 10 } })
    expect(snap().earned).toBe(10)
    expect(said).toEqual(['word:mother'])
  })

  it('фраза с пробелом — ячейки только под буквы', () => {
    const { s, snap } = make([GETUP])
    expect(snap().item.target).toBe('getup')
    s.typeWord('getup')
    expect(snap().item.wordOk).toBe(true)
  })

  it('две ошибки — ответ показан без траты лимита, монет за слово нет', () => {
    const { s, snap } = make()
    s.typeWord('mothex')
    expect(snap().item).toMatchObject({ step: 'word', wordMark: 'near', wordFeedback: { kind: 'near', retry: true } })
    s.typeWord('fatherz')
    expect(snap().item).toMatchObject({ step: 'sent', wordOk: false, typed: 'mother', wordMark: 'shown' })
    expect(snap().item.wordFeedback).toEqual({ kind: 'shown', typed: 'father' })
    expect(snap().showsLeft).toBe(3)
    expect(snap().earned).toBe(0)
  })

  it('подсказка открывает следующую букву, сохраняя верное начало; монеты по нажатиям', () => {
    const { s, snap } = make()
    s.typeWord('mox')
    s.hintLetter()
    expect(snap().item).toMatchObject({ typed: 'mot', revealed: 3, hintsUsed: 1 })
    expect(snap().hintsLeft).toBe(2)
    s.typeWord('mother')
    expect(snap().item.wordFeedback).toEqual({ kind: 'ok', coins: 5 })
  })

  it('«Показать ответ» тратит лимит; на нуле — не срабатывает', () => {
    const { s, snap } = make([MOTHER, MOTHER, MOTHER, MOTHER])
    for (let i = 0; i < 3; i++) {
      s.showWord()
      s.typeSentence('My mother is a teacher')
      s.submitSentence()
      s.next()
    }
    expect(snap().showsLeft).toBe(0)
    s.showWord()
    expect(snap().item.step).toBe('word')
  })
})

describe('предложение', () => {
  it('верно с первой — 15, образец и перевод в отклике; звучит образец', () => {
    const { s, said, snap, onItem } = make()
    s.typeWord('mother')
    s.typeSentence('my mother is a teacher')
    s.submitSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'ok', coins: 15, exact: true, ref: 'My mother is a teacher.', ru: 'Моя мама — учитель.' })
    expect(snap().earned).toBe(25)
    expect(said.at(-1)).toBe('sentence:My mother is a teacher.')
    expect(onItem).toHaveBeenCalledWith(expect.objectContaining({ wordOk: true, sentOk: true }))
  })

  it('ошибка — «почти» и «не хватает», вторая ошибка — правильный ответ', () => {
    const { s, snap } = make()
    s.typeWord('mother')
    s.typeSentence('My mother is teacher')
    s.submitSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'near', reason: null, missing: ['a'], own: false })
    s.typeSentence('My father is a doctor')
    s.submitSentence()
    expect(snap().item).toMatchObject({ step: 'done', sentOk: false, sentFeedback: { kind: 'answer', ref: 'My mother is a teacher.' } })
  })

  it('подсказка — первая треть образца, одна на задание; после неё 8 монет', () => {
    const { s, snap } = make()
    s.typeWord('mother')
    s.hintSentence()
    s.hintSentence()
    expect(snap().item.sentFeedback).toEqual({ kind: 'hint', text: 'My mother' })
    expect(snap().hintsLeft).toBe(2)
    s.typeSentence('My mother is a teacher.')
    s.submitSentence()
    expect(snap().item.sentFeedback.coins).toBe(8)
  })

  it('без образца — своё предложение со словом', () => {
    const { s, snap } = make([APPLE])
    s.typeWord('apple')
    s.typeSentence('apple')
    s.submitSentence()
    expect(snap().item.sentFeedback).toMatchObject({ kind: 'bad', reason: 'minWords', own: true })
    s.typeSentence('I eat an apple every day')
    s.submitSentence()
    expect(snap().item).toMatchObject({ step: 'done', sentOk: true })
  })
})

describe('итог', () => {
  it('после последнего «Дальше» — итог с ошибками и onDone', () => {
    const { s, snap, onDone } = make()
    s.typeWord('mother')
    s.typeSentence('My mother is a teacher.')
    s.submitSentence()
    s.next()
    s.showWord()
    s.showSentence()
    s.next()
    expect(snap().phase).toBe('result')
    expect(snap().summary).toMatchObject({ n: 2, wordsOk: 1, sentencesOk: 1, ok: 1, accuracy: 50, earned: 25 })
    expect(snap().summary.wrong.map((c) => c.en)).toEqual(['get up'])
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ n: 2, earned: 25 }))
  })

  it('«Дальше» до ответа не листает', () => {
    const { s, snap } = make()
    s.next()
    expect(snap().index).toBe(0)
  })
})
