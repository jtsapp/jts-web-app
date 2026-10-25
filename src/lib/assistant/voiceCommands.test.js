import { describe, it, expect } from 'vitest'
import { COMMANDS, WAKE_COMMAND_WORDS, commandButton, findCommandButtons, matchCommand, namedByStudent, normCmd, stripWake, wakeTail } from './voiceCommands.js'

const id = (text, opts) => matchCommand(text, opts)?.id ?? null

describe('matchCommand', () => {
  it('итог Vosk: имя и ровно команда', () => {
    expect(id('луна дальше', { name: 'луна' })).toBe('next')
    expect(id('привет луна проверь', { name: 'луна' })).toBe('check')
    expect(id('[unk] луна ещё раз', { name: 'луна' })).toBe('replay')
    expect(id('айзере келесі', { name: 'айзере' })).toBe('next')
    expect(id('айзере әрі қарай', { name: 'айзере' })).toBe('next')
  })
  it('вежливые слова не мешают', () => {
    expect(id('луна давай дальше', { name: 'луна' })).toBe('next')
    expect(id('луна нажми проверить пожалуйста', { name: 'луна' })).toBe('check')
  })
  it('не команда — модели', () => {
    expect(id('луна', { name: 'луна' })).toBe(null)
    expect(id('луна [unk] дальше', { name: 'луна' })).toBe(null)
    expect(id('луна почему дальше нельзя', { name: 'луна' })).toBe(null)
    expect(id('дальше', { name: 'луна' })).toBe(null)
  })
  it('текст микрофона и звонка — без имени', () => {
    expect(id('Дальше.')).toBe('next')
    expect(id('Стоп!')).toBe('stop')
    expect(id('Закрой')).toBe('close')
    expect(id('Не надо дальше')).toBe(null)
  })
})

describe('кнопки команды', () => {
  it('подпись начинается с корня кнопки', () => {
    const next = COMMANDS.find((c) => c.id === 'next')
    expect(commandButton(next, 'Далее →')).toBe(true)
    expect(commandButton(next, 'Следующий урок')).toBe(true)
    expect(commandButton(next, 'Не далее')).toBe(false)
    const close = COMMANDS.find((c) => c.id === 'close')
    expect(commandButton(close, '×')).toBe(true)
  })
  it('findCommandButtons — все подходящие из номеров снимка', () => {
    const refs = new Map([
      [1, { el: {}, label: 'Послушать' }],
      [2, { el: {}, label: 'Проверить' }],
      [3, { el: {}, label: 'Послушать' }],
    ])
    const check = COMMANDS.find((c) => c.id === 'check')
    const replay = COMMANDS.find((c) => c.id === 'replay')
    expect(findCommandButtons(refs, check).map((b) => b.ref)).toEqual([2])
    expect(findCommandButtons(refs, replay).map((b) => b.ref)).toEqual([1, 3])
  })
})

describe('позывной в тексте', () => {
  it('wakeTail — слова после имени', () => {
    expect(wakeTail('луна [unk] [unk]', 'луна')).toEqual(['unk', 'unk'])
    expect(wakeTail('луна', 'луна')).toEqual([])
  })
  it('stripWake — срезает обращение из распознанного', () => {
    expect(stripWake('Луна, нажми «Начать урок».', 'luna')).toBe('нажми «Начать урок».')
    expect(stripWake('Привет, Луна! Где домашка?', 'luna')).toBe('Где домашка?')
    expect(stripWake('Сәлем, Айзере, келесі', 'aizere')).toBe('келесі')
    expect(stripWake('Луна', 'luna')).toBe('')
    expect(stripWake('Где домашка?', 'luna')).toBe('Где домашка?')
  })
})

describe('namedByStudent — ученик сам назвал кнопку', () => {
  it('по словам подписи и основам', () => {
    expect(namedByStudent('like', 'выбери like')).toBe(true)
    expect(namedByStudent("don't like", 'выбери like')).toBe(false)
    expect(namedByStudent('Проверить ответ', 'проверь')).toBe(true)
    expect(namedByStudent('Закрыть', 'закрой окно')).toBe(true)
    expect(namedByStudent('went', 'выбери сама')).toBe(false)
  })
  it('по синонимам команды', () => {
    expect(namedByStudent('Далее', 'дальше')).toBe(true)
    expect(namedByStudent('Послушать', 'включи запись')).toBe(true)
  })
})

it('слова грамматики Vosk — формы словаря модели (ё, ә)', () => {
  expect(WAKE_COMMAND_WORDS.ru).toContain('ещё раз')
  expect(WAKE_COMMAND_WORDS.kk).toContain('әрі қарай')
  expect(normCmd('Ещё раз')).toBe('еще раз')
})
