import { describe, it, expect } from 'vitest'
import { stableShuffle } from './optionOrder.js'

const BANK = ['ability', 'government', 'persuades', 'opportunity', 'judgement', 'followers']

describe('stableShuffle', () => {
  it('порядок одинаков у преподавателя и ученика', () => {
    // Главное свойство. Преподаватель правит ответ ученика кликом по варианту в
    // своём окне — разойдись порядок, исправление записало бы не тот ответ.
    // Здесь это два независимых вызова: разные вкладки, разные люди.
    expect(stableShuffle(BANK, 'q-17')).toEqual(stableShuffle(BANK, 'q-17'))
  })

  it('порядок переживает перезагрузку', () => {
    // Тот же вызов после возврата в урок — ученик не должен увидеть новую
    // раскладку под свой уже сохранённый ответ.
    const first = stableShuffle(BANK, 'q-17')
    const afterReload = stableShuffle([...BANK], 'q-17')
    expect(afterReload).toEqual(first)
  })

  it('порядок отличается от исходного — иначе всё это зря', () => {
    // Ради этого и затевалось: в курсе варианты стоят по порядку правильных
    // ответов, и ученик кликает сверху вниз, не читая.
    expect(stableShuffle(BANK, 'q-17')).not.toEqual(BANK)
  })

  it('у разных вопросов раскладки разные', () => {
    expect(stableShuffle(BANK, 'q-17')).not.toEqual(stableShuffle(BANK, 'q-18'))
  })

  it('ничего не теряет и не добавляет', () => {
    // Пропавший вариант — это задание без правильного ответа.
    expect([...stableShuffle(BANK, 'q-17')].sort()).toEqual([...BANK].sort())
  })

  it('повторяющиеся слова сохраняются по одному вхождению', () => {
    // «Расставь по порядку» приходит с повторами (два «the»), и банк обязан
    // сохранить оба — иначе предложение не собрать.
    const words = ['the', 'cat', 'sat', 'on', 'the', 'mat']
    expect([...stableShuffle(words, 'q-1')].sort()).toEqual([...words].sort())
  })

  it('без id порядок всё равно стабилен', () => {
    // Зерно берётся и из содержимого: вопрос без id не должен перетасовываться
    // на каждый рендер.
    expect(stableShuffle(BANK, undefined)).toEqual(stableShuffle(BANK, undefined))
  })

  it('пустой список и один вариант не ломают ничего', () => {
    expect(stableShuffle([], 'q')).toEqual([])
    expect(stableShuffle(['one'], 'q')).toEqual(['one'])
    expect(stableShuffle(null, 'q')).toEqual([])
    expect(stableShuffle(undefined, 'q')).toEqual([])
  })

  it('исходный массив не меняется', () => {
    // Он же question.options — правка на месте испортила бы грейдинг, который
    // сверяется с исходным порядком.
    const original = [...BANK]
    stableShuffle(BANK, 'q-17')
    expect(BANK).toEqual(original)
  })
})
