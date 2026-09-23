// Приёмочные случаи из переписки про «Обучение» → «Повторение»: позиционное
// открытие юнита по факту пройденного в каталоге, общий курс против
// специализированного, финальный экзамен, отсутствие источника.
import { describe, it, expect } from 'vitest'
import { catalogUnitsDone, isReviewUnitUnlocked, pickGeneralCourse } from './reviewUnlock.js'

const lesson = (id) => ({ id })
const course = ({ code, separateAccess = false, units }) => ({ code, separateAccess, units })

describe('общий курс уровня', () => {
  it('находит курс по коду без отдельного доступа', () => {
    const business = course({ code: 'B1', separateAccess: true, units: [] })
    const general = course({ code: 'B1', units: [] })
    expect(pickGeneralCourse([business, general], 'B1')).toBe(general)
  })

  it('код сравнивается без учёта регистра', () => {
    const general = course({ code: 'b1', units: [] })
    expect(pickGeneralCourse([general], 'B1')).toBe(general)
  })

  it('на уровне только курсы с отдельным доступом — общего нет', () => {
    const business = course({ code: 'B1', separateAccess: true, units: [] })
    expect(pickGeneralCourse([business], 'B1')).toBeNull()
  })

  it('курса этого уровня нет вовсе', () => {
    expect(pickGeneralCourse([course({ code: 'A2', units: [] })], 'B1')).toBeNull()
  })

  it('пустой каталог', () => {
    expect(pickGeneralCourse([], 'A0')).toBeNull()
    expect(pickGeneralCourse(undefined, 'A0')).toBeNull()
  })
})

describe('пройденные юниты курса', () => {
  const c = course({
    code: 'A0',
    units: [
      { lessons: [lesson(1), lesson(2)] }, // юнит 1
      { lessons: [lesson(3), lesson(4)] }, // юнит 2
      { lessons: [] },                     // юнит 3 — пустой
    ],
  })

  it('юнит пройден, только если пройдены ВСЕ его уроки', () => {
    expect(catalogUnitsDone(c, new Set([1, 2]))).toStrictEqual([true, false, true])
  })

  it('один пройденный урок юнита из двух — юнит ещё не пройден', () => {
    expect(catalogUnitsDone(c, new Set([1]))).toStrictEqual([false, false, true])
  })

  it('лишние id в completedLessonIds ни на что не влияют', () => {
    expect(catalogUnitsDone(c, new Set([1, 2, 3, 4, 999]))).toStrictEqual([true, true, true])
  })

  it('ничего не пройдено', () => {
    expect(catalogUnitsDone(c, new Set())).toStrictEqual([false, false, true])
  })

  it('принимает обычный массив id, не только Set', () => {
    expect(catalogUnitsDone(c, [1, 2, 3, 4])).toStrictEqual([true, true, true])
  })

  it('без курса — пустой массив, а не падение', () => {
    expect(catalogUnitsDone(null, new Set())).toStrictEqual([])
    expect(catalogUnitsDone({ units: undefined }, new Set())).toStrictEqual([])
  })
})

describe('открытие юнита «Повторения»', () => {
  it('юнит N открыт ⟺ юнит N курса каталога пройден целиком — пример из переписки', () => {
    // «прохожу юнит 1 → откроется юнит 1; юнит 2 → откроется юнит 2»
    const afterUnit1 = [true, false, false]
    expect(isReviewUnitUnlocked(afterUnit1, 1)).toBe(true)
    expect(isReviewUnitUnlocked(afterUnit1, 2)).toBe(false)

    const afterUnit2 = [true, true, false]
    expect(isReviewUnitUnlocked(afterUnit2, 2)).toBe(true)
    expect(isReviewUnitUnlocked(afterUnit2, 3)).toBe(false)
  })

  it('не обязательно по порядку: юнит 3 сам по себе, юнит 2 ещё нет', () => {
    expect(isReviewUnitUnlocked([false, false, true], 3)).toBe(true)
    expect(isReviewUnitUnlocked([false, false, true], 2)).toBe(false)
  })

  it('финальный экзамен (юнит 0) — только когда пройдены ВСЕ юниты курса', () => {
    expect(isReviewUnitUnlocked([true, true, true], 0)).toBe(true)
    expect(isReviewUnitUnlocked([true, true, false], 0)).toBe(false)
  })

  it('без источника (пустой unitsDone) не открыт даже экзамен', () => {
    expect(isReviewUnitUnlocked([], 0)).toBe(false)
    expect(isReviewUnitUnlocked([], 1)).toBe(false)
  })

  it('в «Повторении» юнитов больше, чем в каталоге, — лишние не открыты', () => {
    expect(isReviewUnitUnlocked([true, true], 3)).toBe(false)
  })

  it('номер меньше единицы (кроме 0-экзамена) не бывает открытым', () => {
    expect(isReviewUnitUnlocked([true, true], -1)).toBe(false)
  })
})
