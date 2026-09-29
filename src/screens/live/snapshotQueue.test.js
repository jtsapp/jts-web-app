import { describe, it, expect } from 'vitest'
import { createSnapshotQueue } from './snapshotQueue.js'

/**
 * Кому преподаватель отдаёт ответ своей рамки на request-snapshot: всему классу
 * после «Внимания» или ученикам, которые попросили догнать класс. Время — через
 * подставные часы: отсечка 3 с и истечение запроса 5 с считаются от них.
 */
function queueAt(start = 0) {
  const clock = { t: start }
  const queue = createSnapshotQueue({ cooldownMs: 3000, timeoutMs: 5000, now: () => clock.t })
  return { queue, clock }
}

describe('createSnapshotQueue', () => {
  it('первая просьба ученика — спросить рамку, ответ ему', () => {
    const { queue } = queueAt()
    expect(queue.ask(7, 11)).toBe(true)
    expect(queue.take()).toEqual({ everyone: false, students: [7] })
  })

  // Второй ответ рамки подряд никто не ждёт — он выбрасывается, а не уходит всем.
  it('после ответа очередь пуста — следующий ответ ничей', () => {
    const { queue } = queueAt()
    queue.ask(7, 11)
    queue.take()
    expect(queue.take()).toEqual({ everyone: false, students: [] })
  })

  // Ученик на рвущейся связи не должен гонять поток рамки по кругу.
  it('тот же ученик про тот же материал раньше 3 с — без нового запроса и без повторного адресата', () => {
    const { queue, clock } = queueAt()
    queue.ask(7, 11)
    queue.take()

    clock.t = 2999
    expect(queue.ask(7, 11)).toBe(false)
    expect(queue.take().students).toEqual([])

    clock.t = 3000
    expect(queue.ask(7, 11)).toBe(true)
  })

  // Отсечка — на пару (ученик, материал): просьба про другой материал — другая.
  it('тот же ученик про другой материал — отсечка не мешает', () => {
    const { queue, clock } = queueAt()
    queue.ask(7, 11)
    queue.take()

    clock.t = 1000
    expect(queue.ask(7, 12)).toBe(true)
  })

  // Рамка не говорит, на какой запрос отвечает: пока запрос в полёте, второй
  // ученик ждёт тот же ответ, а не шлёт свой.
  it('второй ученик, пока запрос в полёте, получит тот же ответ', () => {
    const { queue, clock } = queueAt()
    expect(queue.ask(7, 11)).toBe(true)
    clock.t = 1000
    expect(queue.ask(8, 11)).toBe(false)
    expect(queue.take()).toEqual({ everyone: false, students: [7, 8] })
  })

  // Ответ потерялся (рамка грузилась) — через 5 с очередь снова спрашивает рамку,
  // и ответ получают все, кто ждал.
  it('запрос без ответа истекает через 5 с — следующая просьба спрашивает заново', () => {
    const { queue, clock } = queueAt()
    queue.ask(7, 11)
    clock.t = 4999
    expect(queue.ask(8, 11)).toBe(false)

    clock.t = 5000
    expect(queue.ask(9, 11)).toBe(true)
    expect(queue.take()).toEqual({ everyone: false, students: [7, 8, 9] })
  })

  // «Внимание» раздаёт снимок всем — ждущие ученики получат его общим каналом.
  it('«Внимание» перекрывает адресные просьбы', () => {
    const { queue } = queueAt()
    queue.askEveryone()
    expect(queue.ask(7, 11)).toBe(false)
    expect(queue.take()).toEqual({ everyone: true, students: [7] })
  })

  // Потерянный ответ «Внимания» не должен навсегда глушить просьбы учеников и
  // разослать классу чей-то адресный снимок.
  it('«Внимание» без ответа истекает через 5 с — ответ уходит только ждущим', () => {
    const { queue, clock } = queueAt()
    queue.askEveryone()

    clock.t = 5000
    expect(queue.ask(7, 11)).toBe(true)
    expect(queue.take()).toEqual({ everyone: false, students: [7] })
  })

  it('«Внимание», ответ на которое опоздал на 5 с, — ничей', () => {
    const { queue, clock } = queueAt()
    queue.askEveryone()
    clock.t = 5000
    expect(queue.take()).toEqual({ everyone: false, students: [] })
  })

  // «Отпустить класс» и смена материала: ответ старой страницы никому не нужен.
  it('сброс забывает ждущих, запрос в полёте и «Внимание»', () => {
    const { queue, clock } = queueAt()
    queue.ask(7, 11)
    queue.askEveryone()

    queue.reset()
    expect(queue.take()).toEqual({ everyone: false, students: [] })

    clock.t = 1000
    expect(queue.ask(8, 12)).toBe(true)
  })
})
