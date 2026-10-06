// Приёмочные случаи из переписки про «Обучение» → «Повторение»: позиционное
// открытие юнита по факту пройденного в каталоге, общий курс против
// специализированного, финальный экзамен, отсутствие источника.
import { describe, it, expect } from 'vitest'
import {
  catalogFrontier,
  catalogUnitsDone,
  isReviewLessonUnlocked,
  isReviewLevelFullyOpen,
  isReviewUnitUnlocked,
  pickGeneralCourse,
  isReviewSelfPaced,
} from './reviewUnlock.js'

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

  it('уровень ниже CEFR ученика открыт целиком, даже без каталога', () => {
    expect(isReviewUnitUnlocked([], 1, { fullyOpen: true })).toBe(true)
    expect(isReviewUnitUnlocked([], 3, { fullyOpen: true })).toBe(true)
    expect(isReviewUnitUnlocked([], 0, { fullyOpen: true })).toBe(true)
  })

  it('на своём уровне фронтир открывает юниты до точки включительно', () => {
    const frontier = { unit: 2, lesson: 3 }
    expect(isReviewUnitUnlocked([false, false, false], 1, { frontier })).toBe(true)
    expect(isReviewUnitUnlocked([false, false, false], 2, { frontier })).toBe(true)
    expect(isReviewUnitUnlocked([false, false, false], 3, { frontier })).toBe(false)
    expect(isReviewUnitUnlocked([false, false, false], 0, { frontier })).toBe(false)
  })
})

describe('уровень ниже своего CEFR', () => {
  it('A2 для B1 — открыт; B1 для B1 — нет; B2 для B1 — нет', () => {
    expect(isReviewLevelFullyOpen('A2', 'B1')).toBe(true)
    expect(isReviewLevelFullyOpen('A0', 'B1')).toBe(true)
    expect(isReviewLevelFullyOpen('B1', 'B1')).toBe(false)
    expect(isReviewLevelFullyOpen('B2', 'B1')).toBe(false)
  })
})

describe('фронтир каталога — до материала в занятии', () => {
  const c = course({
    code: 'B1',
    units: [
      { lessons: [lesson(1), lesson(2)] },
      { lessons: [lesson(3), lesson(4), lesson(5)] },
    ],
  })

  it('ничего не пройдено — фронтира нет', () => {
    expect(catalogFrontier(c, [])).toBeNull()
  })

  it('юнит 2 урок 3 — точка (2, 3), даже если юнит 1 не отмечен', () => {
    expect(catalogFrontier(c, [5])).toEqual({ unit: 2, lesson: 3 })
  })

  it('берёт самую дальнюю из нескольких отметок', () => {
    expect(catalogFrontier(c, [1, 4])).toEqual({ unit: 2, lesson: 2 })
  })

  it('внутри юнита 2 открыты уроки только до фронтира', () => {
    const opts = { frontier: { unit: 2, lesson: 3 }, unitsDone: [false, false] }
    expect(isReviewLessonUnlocked(2, 1, opts)).toBe(true)
    expect(isReviewLessonUnlocked(2, 3, opts)).toBe(true)
    expect(isReviewLessonUnlocked(2, 4, opts)).toBe(false)
    expect(isReviewLessonUnlocked(1, 9, opts)).toBe(true)
    expect(isReviewLessonUnlocked(3, 1, opts)).toBe(false)
  })

  it('юнит каталога пройден целиком — тропа юнита не режется по числу материалов', () => {
    expect(isReviewLessonUnlocked(1, 20, { frontier: { unit: 1, lesson: 1 }, unitsDone: [true] })).toBe(true)
  })

  it('без фронтира урок не режется — решает юнит', () => {
    expect(isReviewLessonUnlocked(2, 4, {})).toBe(true)
  })

  it('три режима одного файла — это один материал: L03 1-to-1 открывает слот 3, не восьмой', () => {
    const file = (id, mode) => ({ id, fileUrl: `https://files/L0${Math.ceil(id / 3)}.html?mode=${mode}` })
    const mixed = course({
      code: 'B2',
      units: [{
        lessons: [
          file(1, 'self'), file(2, 'solo'), file(3, 'group'),
          file(4, 'self'), file(5, 'solo'), file(6, 'group'),
          file(7, 'self'), file(8, 'solo'), file(9, 'group'),
          file(10, 'self'), file(11, 'solo'), file(12, 'group'),
        ],
      }],
    })
    expect(catalogFrontier(mixed, [2, 5, 8])).toEqual({ unit: 1, lesson: 3 })
    expect(catalogUnitsDone(mixed, [2, 5, 8])).toEqual([false])
    expect(catalogUnitsDone(mixed, [2, 5, 8, 11])).toEqual([true])
  })
})

describe('isReviewSelfPaced — тупик у ученика без отметок', () => {
  it('каталог ответил и ничего не открывает — тропа идёт своим ходом', () => {
    expect(isReviewSelfPaced(true, null)).toBe(true)
  })

  it('каталог что-то открывает — прежнее поведение, своим ходом не идём', () => {
    expect(isReviewSelfPaced(true, { unit: 2, lesson: 3 })).toBe(false)
  })

  // Отказ сети и «ничего не проходил» снаружи одинаковы: getCatalogProgress
  // ловит ошибку в null. Открыть тропу из-за упавшего запроса значило бы
  // показать чужое открытым.
  it('каталог не ответил — не трогаем, даже без фронтира', () => {
    expect(isReviewSelfPaced(false, null)).toBe(false)
  })
})
