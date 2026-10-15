import { describe, it, expect } from 'vitest'
import { OPENING_MARK, isOpeningTurn, openingFocus, screenStateKey } from './opening.js'

describe('пометка «ученик открыл окно»', () => {
  it('узнаётся и с пробелами по краям, а вопрос ученика — нет', () => {
    expect(isOpeningTurn(OPENING_MARK)).toBe(true)
    expect(isOpeningTurn(`  ${OPENING_MARK}\n`)).toBe(true)
    expect(isOpeningTurn('Почему мой ответ неверный?')).toBe(false)
    expect(isOpeningTurn(`${OPENING_MARK} и ещё вопрос`)).toBe(false)
    expect(isOpeningTurn(null)).toBe(false)
  })
})

describe('что на экране: задание и проверено ли оно', () => {
  it('поле ответа или кнопка «Проверить» — задание; пометки проверки — проверенное', () => {
    expect(openingFocus('He ___ football. [поле: ученик ввёл «play»] [кнопка «Проверить»]')).toEqual({ task: true, unchecked: true })
    expect(openingFocus('Complete. [пустое поле] [кнопка «Check»]')).toEqual({ task: true, unchecked: true })
    // Поле без кнопки проверки рядом (кнопка вне снимка или ещё не отрисована) — тоже задание.
    expect(openingFocus('Clare is reading. [поле: ученик ввёл «Is Cleare reading?»]')).toEqual({ task: true, unchecked: true })
    expect(openingFocus('Ответ: [пустое поле]')).toEqual({ task: true, unchecked: true })
    expect(openingFocus('Ответ: [поле Ваш ответ: ученик ввёл «x»]')).toEqual({ task: true, unchecked: true })
    expect(openingFocus('[поле: ученик ввёл «go» (отмечено как неверное)] Неверный ответ')).toEqual({ task: true, unchecked: false })
    expect(openingFocus('[кнопка «like» неактивна (отмечено как неверное)] [верный ответ по заданию: «don\'t like»]')).toEqual({
      task: true,
      unchecked: false,
    })
  })

  it('«Главная», Практика, Словарь — не задание; одна «Продолжить» — тоже', () => {
    expect(openingFocus('Главная ВАШ УРОВЕНЬ A2 [кнопка «Продолжить»]')).toEqual({ task: false, unchecked: false })
    expect(openingFocus('Словарь Изучено 120 из 600 [кнопка «Повторить»]')).toEqual({ task: false, unchecked: false })
    expect(openingFocus('')).toEqual({ task: false, unchecked: false })
  })
})

describe('состояние экрана для первой реплики', () => {
  it('тикающие цифры (таймер, время плеера) не делают экран новым', () => {
    expect(screenStateKey('listening', 'Запись 0:05 из 1:30')).toBe(screenStateKey('listening', 'Запись 0:47 из 1:30'))
  })

  it('другое задание или другой экран — новое состояние', () => {
    const a = screenStateKey('kingdom-interior', 'Впишите пропуск. She ___ (go) to school.')
    expect(screenStateKey('kingdom-interior', 'Выберите вариант. I ___ coffee.')).not.toBe(a)
    expect(screenStateKey('practice', 'Впишите пропуск. She ___ (go) to school.')).not.toBe(a)
  })

  it('проверка ответа меняет состояние: Луне есть что сказать о результате', () => {
    const before = screenStateKey('kingdom-interior', 'She ___ (go). [поле: ученик ввёл «go»] [кнопка «Проверить»]')
    const after = screenStateKey('kingdom-interior', 'She ___ (go). [поле: ученик ввёл «go» (отмечено как неверное)] Неверный ответ')
    expect(after).not.toBe(before)
  })

  it('пробелы и переносы разметки не в счёт', () => {
    expect(screenStateKey('home', 'Главная\n  Расписание')).toBe(screenStateKey('home', 'Главная Расписание'))
  })
})
