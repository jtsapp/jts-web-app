// Что «Уроки» (живое занятие и «Самостоятельно») открывают в «Повторении».
// Тропа сама по себе идёт подряд (KingdomInteriorPage) — здесь только то, что
// каталог открывает СВЕРХ этого: общий курс против специализированного,
// фронтир, финальный экзамен, уровень ниже своего CEFR.
import { describe, it, expect } from 'vitest'
import {
  catalogFrontier,
  catalogUnitsDone,
  isOpenedByCatalog,
  isReviewLevelFullyOpen,
  pickGeneralCourse,
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

  it('принимает обычный массив id, не только Set', () => {
    expect(catalogUnitsDone(c, [1, 2, 3, 4])).toStrictEqual([true, true, true])
  })

  it('без курса — пустой массив, а не падение', () => {
    expect(catalogUnitsDone(null, new Set())).toStrictEqual([])
    expect(catalogUnitsDone({ units: undefined }, new Set())).toStrictEqual([])
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

describe('isOpenedByCatalog — что «Уроки» открывают в «Повторении»', () => {
  const frontier = { unit: 2, lesson: 3 }
  const opts = { frontier, unitsDone: [false, false, false] }
  const node = (unit, lessonInUnit) => ({ unit, lessonInUnit })

  it('в «Уроках» ничего не отмечено — каталог не открывает ничего (дальше решает порядок тропы)', () => {
    expect(isOpenedByCatalog(node(1, 1), { frontier: null, unitsDone: [] })).toBe(false)
    expect(isOpenedByCatalog(node(1, 1), {})).toBe(false)
  })

  it('юниты до фронтира открыты целиком — сколько бы уроков там ни было', () => {
    expect(isOpenedByCatalog(node(1, 1), opts)).toBe(true)
    expect(isOpenedByCatalog(node(1, 9), opts)).toBe(true)
  })

  it('в юните фронтира — уроки до точки включительно', () => {
    expect(isOpenedByCatalog(node(2, 1), opts)).toBe(true)
    expect(isOpenedByCatalog(node(2, 3), opts)).toBe(true)
    expect(isOpenedByCatalog(node(2, 4), opts)).toBe(false)
  })

  it('юнит фронтира пройден в каталоге целиком — тропа юнита не режется по числу материалов', () => {
    expect(isOpenedByCatalog(node(2, 20), { frontier, unitsDone: [true, true] })).toBe(true)
  })

  it('юниты за фронтиром каталог не открывает', () => {
    expect(isOpenedByCatalog(node(3, 1), opts)).toBe(false)
  })

  // Узел экзамена — юнит 0. Сравнение «юнит меньше фронтира» его бы открыло
  // при любой отметке, хотя правило экзамена — весь курс.
  it('финальный экзамен (юнит 0) — только когда в каталоге пройдены ВСЕ юниты', () => {
    expect(isOpenedByCatalog(node(0, 1), opts)).toBe(false)
    expect(isOpenedByCatalog(node(0, 1), { frontier, unitsDone: [true, true, true] })).toBe(true)
    expect(isOpenedByCatalog(node(0, 1), { frontier: null, unitsDone: [] })).toBe(false)
  })

  it('уровень ниже CEFR ученика открыт целиком, даже без каталога, вместе с экзаменом', () => {
    expect(isOpenedByCatalog(node(1, 1), { fullyOpen: true })).toBe(true)
    expect(isOpenedByCatalog(node(5, 7), { fullyOpen: true })).toBe(true)
    expect(isOpenedByCatalog(node(0, 1), { fullyOpen: true })).toBe(true)
  })

  it('номер юнита меньше нуля открытым не бывает', () => {
    expect(isOpenedByCatalog(node(-1, 1), opts)).toBe(false)
  })
})
