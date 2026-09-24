import { describe, it, expect } from 'vitest'
import {
  ageOn,
  birthDateProblem,
  isValidBirthDate,
  maxBirthDate,
  minBirthDate,
  MIN_AGE,
  MAX_AGE,
} from './birthDate.js'

// Фиксированное «сегодня» — иначе тест про границу возраста протухнет.
const TODAY = new Date(2026, 7, 28) // 28 августа 2026

describe('ageOn', () => {
  it('считает полные годы', () => {
    expect(ageOn('2000-05-15', TODAY)).toBe(26)
  })
  it('день рождения ещё не наступил — годом меньше', () => {
    expect(ageOn('2000-12-31', TODAY)).toBe(25)
  })
  it('в сам день рождения год уже засчитан', () => {
    expect(ageOn('2000-08-28', TODAY)).toBe(26)
  })
  it('мусор и несуществующие даты — null', () => {
    expect(ageOn('', TODAY)).toBeNull()
    expect(ageOn('2000-02-31', TODAY)).toBeNull()
    expect(ageOn('15.05.2000', TODAY)).toBeNull()
  })
})

describe('birthDateProblem', () => {
  it('обычная дата проходит', () => {
    expect(birthDateProblem('1998-03-21', TODAY)).toBeNull()
  })
  it('будущая дата — invalid, а не tooYoung', () => {
    expect(birthDateProblem('2027-01-01', TODAY)).toBe('invalid')
  })
  it('младше порога — tooYoung', () => {
    expect(birthDateProblem('2024-01-01', TODAY)).toBe('tooYoung')
  })
  it('ровно порог — уже можно', () => {
    expect(birthDateProblem(`${TODAY.getFullYear() - MIN_AGE}-08-28`, TODAY)).toBeNull()
  })
  it('за день до порога — ещё нельзя', () => {
    expect(birthDateProblem(`${TODAY.getFullYear() - MIN_AGE}-08-29`, TODAY)).toBe('tooYoung')
  })
  it('1899-й вместо 1989-го — tooOld', () => {
    expect(birthDateProblem('1899-05-05', TODAY)).toBe('tooOld')
  })
  it('ровно верхняя граница проходит', () => {
    expect(isValidBirthDate(`${TODAY.getFullYear() - MAX_AGE}-08-28`, TODAY)).toBe(true)
  })
})

describe('границы для <input type="date">', () => {
  it('max — день, когда исполняется MIN_AGE', () => {
    expect(maxBirthDate(TODAY)).toBe('2020-08-28')
  })
  it('min не отрезает валидные даты у верхней границы', () => {
    expect(minBirthDate(TODAY) < `${TODAY.getFullYear() - MAX_AGE}-08-28`).toBe(true)
    expect(isValidBirthDate(maxBirthDate(TODAY), TODAY)).toBe(true)
  })
})
