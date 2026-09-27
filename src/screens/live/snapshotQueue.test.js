import { describe, it, expect } from 'vitest'
import { createSnapshotQueue } from './snapshotQueue.js'

/**
 * Кому преподаватель отдаёт ответ своей рамки на request-snapshot: всему классу
 * после «Внимания» или ученикам, которые попросили догнать класс. Время — через
 * подставные часы: отсечка 3 с считается от них.
 */
function queueAt(start = 0) {
  const clock = { t: start }
  const queue = createSnapshotQueue({ cooldownMs: 3000, now: () => clock.t })
  return { queue, clock }
}

describe('createSnapshotQueue', () => {
  it('первая просьба ученика — спросить рамку, ответ ему', () => {
    const { queue } = queueAt()
    expect(queue.ask(7)).toBe(true)
    expect(queue.take()).toEqual({ everyone: false, students: [7] })
  })

  it('после ответа очередь пуста', () => {
    const { queue } = queueAt()
    queue.ask(7)
    queue.take()
    expect(queue.take()).toEqual({ everyone: false, students: [] })
  })

  // Ученик на рвущейся связи не должен гонять поток рамки по кругу.
  it('тот же ученик раньше 3 с — без нового запроса и без повторного адресата', () => {
    const { queue, clock } = queueAt()
    queue.ask(7)
    queue.take()

    clock.t = 2999
    expect(queue.ask(7)).toBe(false)
    expect(queue.take().students).toEqual([])

    clock.t = 3000
    expect(queue.ask(7)).toBe(true)
  })

  // Рамка не говорит, на какой запрос отвечает: пока запрос свеж, второй ученик
  // ждёт тот же ответ, а не шлёт свой.
  it('второй ученик, пока запрос свеж, получит тот же ответ', () => {
    const { queue, clock } = queueAt()
    expect(queue.ask(7)).toBe(true)
    clock.t = 1000
    expect(queue.ask(8)).toBe(false)
    expect(queue.take()).toEqual({ everyone: false, students: [7, 8] })
  })

  it('запрос устарел без ответа — второй ученик спрашивает заново', () => {
    const { queue, clock } = queueAt()
    queue.ask(7)
    clock.t = 3000
    expect(queue.ask(8)).toBe(true)
  })

  // «Внимание» раздаёт снимок всем — ждущие ученики получат его общим каналом.
  it('«Внимание» перекрывает адресные просьбы', () => {
    const { queue } = queueAt()
    queue.askEveryone()
    expect(queue.ask(7)).toBe(false)
    expect(queue.take()).toEqual({ everyone: true, students: [7] })
  })
})
