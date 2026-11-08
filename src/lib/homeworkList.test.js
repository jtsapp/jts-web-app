import { describe, expect, it } from 'vitest'
import { homeworkBadgeCount, homeworkCards, materialCardBase, openHomework, withStates } from './homeworkList.js'

// Один список домашки для «Главной», раздела и Луны (аудит ТЗ v2.0, 06.11.2026: «Главная» писала «всё сделано» при
// просроченном материале с урока, Луна видела одну работу из трёх).
describe('homeworkList', () => {
  const now = new Date('2026-11-07T10:00:00')

  it('задание с урока — карточкой раздела: свой id, название карточки урока, статус сервера', () => {
    expect(
      materialCardBase({ id: 5, materialTitle: 'Unit 3', cardTitle: 'Past Simple: правила', status: 'ASSIGNED', isOverdue: true, dueDate: '2026-11-01', teacherScore: 4 }),
    ).toEqual({
      id: 'm-5',
      kind: 'material',
      title: 'Past Simple: правила',
      status: 'ASSIGNED',
      isOverdue: true,
      dueDate: '2026-11-01',
      grade: 4,
      closedWithoutSubmission: undefined,
    })
    expect(materialCardBase({ id: 6, materialTitle: 'Unit 4' }).title).toBe('Unit 4')
  })

  it('работы и задания с урока одним списком; выдача внутри своей работы не задваивается', () => {
    const cards = homeworkCards(
      [{ id: 1, title: 'Эссе', status: 'ASSIGNED' }],
      [
        { id: 9, materialTitle: 'Unit 4', status: 'ASSIGNED' },
        { id: 10, materialTitle: 'Внутри работы', status: 'ASSIGNED', homeworkAssignmentId: 1 },
        null,
      ],
    )
    expect(cards.map((c) => c.id)).toEqual([1, 'm-9'])
    // Сбой одного источника не роняет другой.
    expect(homeworkCards(null, null)).toEqual([])
  })

  it('открытые — просроченные и ближайший срок первыми, без срока в конце; сданное и проверенное не открыто', () => {
    const cards = [
      { id: 'no-due', title: 'Без срока', status: 'ASSIGNED' },
      { id: 'late', title: 'Просрочено', status: 'ASSIGNED', dueDate: '2026-11-02' },
      { id: 'soon', title: 'Скоро', status: 'ASSIGNED', dueDate: '2026-11-09' },
      { id: 'sent', title: 'Сдано', status: 'SUBMITTED', dueDate: '2026-11-03' },
      { id: 'ok', title: 'Проверено', status: 'COMPLETED' },
      { id: 'm-1', kind: 'material', title: 'С урока', status: 'ASSIGNED', isOverdue: true, dueDate: '2026-11-05' },
    ]
    expect(openHomework(cards, now).map((c) => [c.id, c.state])).toEqual([
      ['late', 'overdue'],
      ['m-1', 'overdue'],
      ['soon', 'assigned'],
      ['no-due', 'assigned'],
    ])
    expect(withStates(cards, now).find((c) => c.id === 'sent').state).toBe('submitted')
  })
})

// Значок «Домашней работы» в меню (ТЗ v2.0, 5.4): просрочено + задано, на доработку — тоже ждёт ученика.
describe('homeworkBadgeCount', () => {
  it('считает только работы, которые ждут ученика', () => {
    const now = new Date(2026, 10, 7)
    const cards = [
      { id: 1, status: 'ASSIGNED', dueDate: '2026-10-01' },
      { id: 2, status: 'ASSIGNED' },
      { id: 3, status: 'NEEDS_REVISION' },
      { id: 4, status: 'SUBMITTED' },
      { id: 5, status: 'COMPLETED', grade: 5 },
    ]
    expect(homeworkBadgeCount(cards, now)).toBe(3)
    expect(homeworkBadgeCount(null, now)).toBe(0)
  })
})
