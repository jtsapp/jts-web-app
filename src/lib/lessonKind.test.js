import { describe, it, expect } from 'vitest'
import { isGroupLesson, activeParticipants } from './lessonKind.js'

describe('isGroupLesson', () => {
  // Раньше тип занятия считали по числу записавшихся, и группа, из которой все
  // ушли кроме одного, подписывалась «Индивидуальный урок» — и в шапке живого
  // урока, и чипом в расписании.
  it('групповое занятие остаётся групповым с одним записавшимся', () => {
    expect(isGroupLesson({ lessonType: 'GROUP', participants: [{ studentId: 1 }] })).toBe(true)
  })

  it('парное занятие — не один на один', () => {
    expect(isGroupLesson({ lessonType: 'PAIR' })).toBe(true)
  })

  it('индивидуальное занятие обоих тарифов', () => {
    expect(isGroupLesson({ lessonType: 'INDIVIDUAL_STANDARD' })).toBe(false)
    expect(isGroupLesson({ lessonType: 'INDIVIDUAL_PREMIUM' })).toBe(false)
  })

  // «Не знаю» и «индивидуальный» — разные ответы: иначе на каждом ещё не
  // загруженном уроке загорался бы чип «Индивидуальный».
  it('тип неизвестен — null, а не «индивидуальный»', () => {
    expect(isGroupLesson(null)).toBeNull()
    expect(isGroupLesson({})).toBeNull()
    expect(isGroupLesson({ participants: [{ studentId: 1 }, { studentId: 2 }] })).toBeNull()
  })
})

describe('activeParticipants', () => {
  const roster = [
    { studentId: 1, studentName: 'Пришёл', status: 'SCHEDULED' },
    { studentId: 2, studentName: 'Был', status: 'ATTENDED' },
    { studentId: 3, studentName: 'Отменил без списания', status: 'CANCELLED_FREE' },
    { studentId: 4, studentName: 'Отменил со списанием', status: 'CANCELLED_BURNED' },
    { studentId: 5, studentName: 'Не пришёл', status: 'NO_SHOW_BURNED' },
  ]

  // Бэкенд отдаёт участников вместе с отменившимися. Без фильтра ушедший ученик
  // стоял в составе класса неотличимо от того, кто просто ещё не подключился, а
  // преподавателю на его строке предлагали «Вызвать» и «Смотреть экран».
  it('отменившиеся и не пришедшие в состав класса не входят', () => {
    expect(activeParticipants(roster).map((p) => p.studentId)).toEqual([1, 2])
  })

  it('участник без статуса считается за своего — это не отмена', () => {
    expect(activeParticipants([{ studentId: 9 }])).toHaveLength(1)
  })

  it('пустой вход не роняет список', () => {
    expect(activeParticipants(null)).toEqual([])
    expect(activeParticipants(undefined)).toEqual([])
  })
})
