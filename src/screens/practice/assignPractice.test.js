import { describe, it, expect } from 'vitest'
import {
  assignableLessons,
  assignedDueDate,
  defaultDueDate,
  isPastDue,
  minDueDate,
  newBatchId,
  parseIsoDate,
  stripTags,
  toIsoDate,
  unitToPayload,
} from './assignPractice.js'

const NOW = new Date('2026-09-03T12:00:00Z')
const lesson = (id, iso, status = 'SCHEDULED') => ({ lessonId: id, scheduledAt: iso, lessonStatus: status })

describe('assignableLessons', () => {
  // Задают обычно на том уроке, который идёт или только что прошёл, — он и
  // должен быть под рукой первым.
  it('ближайший урок идёт первым, прошедшие следом свежими вперёд', () => {
    const result = assignableLessons([
      lesson(1, '2026-09-01T10:00:00Z'),
      lesson(2, '2026-09-05T10:00:00Z'),
      lesson(3, '2026-09-02T10:00:00Z'),
      lesson(4, '2026-09-03T18:00:00Z'),
    ], NOW)
    expect(result.map((o) => o.lessonId)).toEqual([4, 2, 3, 1])
  })

  // Домашняя работа привязана к занятию: у отменённого её никто не увидит.
  it('отменённые уроки не предлагаются', () => {
    const result = assignableLessons([
      lesson(1, '2026-09-05T10:00:00Z', 'CANCELLED'),
      lesson(2, '2026-09-05T11:00:00Z'),
    ], NOW)
    expect(result.map((o) => o.lessonId)).toEqual([2])
  })

  it('мусор на входе не роняет список', () => {
    expect(assignableLessons(null, NOW)).toEqual([])
    expect(assignableLessons([{ lessonId: 1, scheduledAt: 'что-то' }], NOW)).toEqual([])
  })
})

describe('unitToPayload', () => {
  it('уровень в нижнем регистре, разметка из названия убрана', () => {
    expect(unitToPayload('A2', { id: 7, title: 'Present <b>Simple</b>', secName: 'Present' }))
      .toEqual({ level: 'a2', unitId: 7, title: 'Present Simple', section: 'Present' })
  })

  it('раздела может не быть', () => {
    expect(unitToPayload('b1', { id: 1, title: 'Modals' }).section).toBeNull()
  })
})

describe('newBatchId', () => {
  // Один ключ на нажатие: повтор с тем же ключом бэкенд не задваивает, а два
  // разных нажатия должны остаться двумя выдачами.
  it('на каждый вызов свой', () => {
    expect(newBatchId()).not.toBe(newBatchId())
  })
})

describe('stripTags', () => {
  it('пустое значение отдаёт пустую строку', () => {
    expect(stripTags(null)).toBe('')
    expect(stripTags(undefined)).toBe('')
  })
})

describe('срок сдачи', () => {
  // Полдень 3 сентября в поясе Алматы (UTC+5) — в UTC это ещё 3-е, а вот
  // полночь того же дня уехала бы на 2-е: дату собираем по локальному
  // календарю, иначе «сдать до 10-го» уходит на сервер девятым.
  const NIGHT = new Date(2026, 8, 3, 0, 30)

  it('по умолчанию — неделя от сегодня, как и в админке', () => {
    expect(defaultDueDate(NIGHT)).toBe('2026-09-10')
  })

  it('раньше сегодняшнего дня ставить нечего', () => {
    expect(minDueDate(NIGHT)).toBe('2026-09-03')
  })

  it('дата собирается по локальному календарю, а не по UTC', () => {
    expect(toIsoDate(NIGHT)).toBe('2026-09-03')
  })

  // Сервер такой срок отвергает целиком и не пишет НИ ОДНОГО задания — значит
  // ловим до отправки. Сегодняшний разрешён: «сделать к вечеру» — обычная выдача.
  it('прошлое отсекается, сегодня и будущее — нет', () => {
    expect(isPastDue('2026-09-02', NIGHT)).toBe(true)
    expect(isPastDue('2026-09-03', NIGHT)).toBe(false)
    expect(isPastDue('2026-09-30', NIGHT)).toBe(false)
  })

  it('пустое поле — это «без срока», а не ошибка', () => {
    expect(isPastDue('', NIGHT)).toBe(false)
    expect(isPastDue(null, NIGHT)).toBe(false)
  })

  it('строка разбирается в локальную полночь', () => {
    const d = parseIsoDate('2026-09-10')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 10])
    expect(parseIsoDate('что-то')).toBeNull()
    expect(parseIsoDate(null)).toBeNull()
  })
})

describe('assignedDueDate', () => {
  // Сервер двигает срок только вперёд: стоял более поздний — он и остаётся.
  // Показывать выбранный день в подтверждении значило бы назвать дату,
  // которой у ученика нет.
  it('берётся из ответа сервера', () => {
    expect(assignedDueDate([{ id: 1, dueDate: '2026-09-20' }, { id: 2, dueDate: '2026-09-20' }]))
      .toBe('2026-09-20')
  })

  it('работа без срока и пустой ответ дают null', () => {
    expect(assignedDueDate([{ id: 1 }])).toBeNull()
    expect(assignedDueDate([])).toBeNull()
    expect(assignedDueDate(null)).toBeNull()
  })
})
