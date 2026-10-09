import { describe, it, expect } from 'vitest'

import { checkAnswer } from './engine.js'

// Диктант «Напишите, что вы услышали» (listen_type). Ревью 08.10.2026: он был
// строже общей сверки ответов (answer-match) и браковал верную запись
// услышанного. Эталоны ниже — настоящие ответы из
// public/practice/listening/content/<уровень>.json.
const type = (answer) => ({ type: 'listen_type', answer })
const ok = (answer, response) => checkAnswer(type(answer), response).ok

describe('диктант: форма записи не важна', () => {
  it('имя по буквам можно записать словом (a1_023)', () => {
    expect(ok('T A Y L O R', 'Taylor')).toBe(true)
    expect(ok('T A Y L O R', 'TAYLOR')).toBe(true)
    expect(ok('T A Y L O R', 'T-A-Y-L-O-R')).toBe(true)
    // Через запятую прежняя norm() принимала — склейка букв не должна это отнять.
    expect(ok('T A Y L O R', 'T, A, Y, L, O, R')).toBe(true)
  })

  it('слово перед апострофом не превращается в цифру: ones = one\'s', () => {
    expect(ok("It's one's own choice", "It's ones own choice")).toBe(true)
  })

  it('диакритика: cafés = cafes (a1_050, b1_009)', () => {
    expect(ok('Are there any cafés near here', 'Are there any cafes near here')).toBe(true)
    expect(ok("I'm going to the cafe down the street", "I'm going to the café down the street")).toBe(true)
  })

  it('слитное и дефисное написание: under-explored (c1_055)', () => {
    expect(ok('that kind of goes under-explored', 'that kind of goes underexplored')).toBe(true)
    expect(ok('that kind of goes under-explored', 'that kind of goes under\u2010explored')).toBe(true)
  })

  it('OK = Okay (a2_148)', () => {
    expect(ok('OK, but not Atlantis', 'Okay, but not Atlantis')).toBe(true)
  })

  it('число цифрами: nine = 9, a hundred = 100 (b2_059, b1_166)', () => {
    expect(ok('I started about nine months ago', 'I started about 9 months ago')).toBe(true)
    expect(ok('They say they\'ve rescued at least a hundred people so far', 'They say they\'ve rescued at least 100 people so far')).toBe(true)
  })

  it("апостроф любого вида: I\u02BCm (U+02BC) = I'm (a1_003)", () => {
    expect(ok("I'm from the UK", 'I\u02BCm from the UK')).toBe(true)
  })

  it('буква с русской раскладки: «\u0422» вместо T (a1_023)', () => {
    expect(ok('T A Y L O R', '\u0422aylor')).toBe(true)
  })

  it("стяжение и полная форма — пока разные ответы (I am ≠ I'm, решение владельца)", () => {
    expect(ok("I'm from the UK", 'I am from the UK')).toBe(false)
  })

  it('прежняя мягкость к апострофу осталась: Its friendlier (a2_138)', () => {
    expect(ok("It's friendlier", 'Its friendlier')).toBe(true)
  })
})

describe('диктант: неверная запись по-прежнему неверна', () => {
  it('другие слова не засчитываются', () => {
    expect(ok("I'm from the UK", "I'm from the US")).toBe(false)
    expect(ok('I started about nine months ago', 'I started about nine month ago')).toBe(false)
    expect(ok('Are there any cafés near here', 'Are there any cars near here')).toBe(false)
    expect(ok('T A Y L O R', 'Tailor')).toBe(false)
    expect(ok('I started about nine months ago', 'I started about 8 months ago')).toBe(false)
    // Слитное сверяется только для слов: twenty-five — не «205».
    expect(ok('twenty-five people came', '205 people came')).toBe(false)
  })
})
