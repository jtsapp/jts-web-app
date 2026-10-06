import { describe, it, expect } from 'vitest'
import { isPointEvent, isPointerBatch, nextFollow, positionChanged } from './liveFollow.js'

/**
 * Правило следования (спека §4.3) — одно на оба клиента: ученик в web-admin
 * применяет ту же таблицу. Каждый случай здесь — строка таблицы, а не
 * «поведение страницы»: страница только исполняет `go`.
 */
const base = {
  version: 1,
  status: 'IN_PROGRESS',
  pausedUntilMs: null,
  leading: true,
  focusSeq: 5,
  focusView: 'LESSON',
  sectionId: 301,
  materialId: 912,
  stepId: null,
  questionId: null,
  stageIndex: 3,
  timer: null,
  serverNowMs: 1790000000000,
}
const state = (patch = {}) => ({ ...base, ...patch })

describe('nextFollow — таблица §4.3', () => {
  // 1. Вход: следует тот, кого застали за ведением, — и сразу идёт к классу.
  it('первый снимок при ведении: следует и идёт', () => {
    expect(nextFollow({ following: false, focusSeq: null }, null, state()))
      .toEqual({ following: true, focusSeq: 5, go: true })
  })

  it('первый снимок без ведения: не следует и остаётся', () => {
    expect(nextFollow({ following: true, focusSeq: null }, null, state({ leading: false })))
      .toEqual({ following: false, focusSeq: 5, go: false })
  })

  // 2. Явная указка сильнее ручного ухода: «Внимание» снова тянет отставших.
  it('вырос focusSeq: следует и идёт, даже если ушёл сам', () => {
    const prev = state()
    expect(nextFollow({ following: false, focusSeq: 5 }, prev, state({ focusSeq: 6, sectionId: 302 })))
      .toEqual({ following: true, focusSeq: 6, go: true })
  })

  // Повторное «Внимание» на той же позиции — тоже указка: сервер поднимает
  // focusSeq, даже когда позиция не изменилась.
  it('вырос focusSeq при той же позиции: всё равно идёт', () => {
    const prev = state()
    expect(nextFollow({ following: false, focusSeq: 5 }, prev, state({ focusSeq: 6 })).go).toBe(true)
  })

  // Указка и снятие ведения могли прийти между двумя применёнными состояниями:
  // порядок правил решает в пользу указки — она была явной.
  it('вырос focusSeq при снятом ведении: указка всё равно ведёт', () => {
    const prev = state()
    expect(nextFollow({ following: false, focusSeq: 5 }, prev, state({ focusSeq: 6, leading: false })))
      .toEqual({ following: true, focusSeq: 6, go: true })
  })

  // 3. Преподаватель отпустил класс — ученик остаётся, где стоит.
  it('ведение снято: не следует и остаётся', () => {
    const prev = state()
    expect(nextFollow({ following: true, focusSeq: 5 }, prev, state({ leading: false })))
      .toEqual({ following: false, focusSeq: 5, go: false })
  })

  // Снятое ведение важнее сменившейся позиции: переход без ведения не тянет.
  it('ведение снято при сменившейся стадии: не идёт', () => {
    const prev = state()
    expect(nextFollow({ following: true, focusSeq: 5 }, prev, state({ leading: false, stageIndex: 4 })))
      .toEqual({ following: false, focusSeq: 5, go: false })
  })

  // 4. Следующий ученик идёт за каждой сменой позиции без новой указки.
  it('следует, сменилась стадия: идёт', () => {
    const prev = state()
    expect(nextFollow({ following: true, focusSeq: 5 }, prev, state({ stageIndex: 4 })))
      .toEqual({ following: true, focusSeq: 5, go: true })
  })

  it('следует, сменился только вид (доска/урок): идёт', () => {
    const prev = state()
    expect(nextFollow({ following: true, focusSeq: 5 }, prev, state({ focusView: 'BOARD' })))
      .toEqual({ following: true, focusSeq: 5, go: true })
  })

  // 5. Ушёл сам — смена стадии его не тянет (приёмка §11 п.3).
  it('не следует, сменилась стадия: остаётся', () => {
    const prev = state()
    expect(nextFollow({ following: false, focusSeq: 5 }, prev, state({ stageIndex: 4 })))
      .toEqual({ following: false, focusSeq: 5, go: false })
  })

  // Изменение не позиции (таймер, статус) никуда не ведёт.
  it('следует, позиция та же: остаётся', () => {
    const prev = state()
    expect(nextFollow({ following: true, focusSeq: 5 }, prev, state({ version: 2, timer: { endsAtMs: 1, durationSeconds: 60 } })))
      .toEqual({ following: true, focusSeq: 5, go: false })
  })

  // Равный focusSeq — не указка: ушедшего сам ученик он не возвращает.
  it('равный focusSeq не считается указкой', () => {
    const prev = state()
    expect(nextFollow({ following: false, focusSeq: 5 }, prev, state({ sectionId: 302 })))
      .toEqual({ following: false, focusSeq: 5, go: false })
  })

  it('focusSeq всегда берётся из пришедшего состояния', () => {
    const prev = state({ focusSeq: 9 })
    expect(nextFollow({ following: true, focusSeq: 9 }, prev, state({ focusSeq: 9, leading: false })).focusSeq).toBe(9)
  })

  // Позиции нет вовсе (занятие без указки): вход при ведении всё равно даёт
  // go — что делать с пустой позицией, решает клиент (ничего).
  it('пустая позиция: правило то же, go при ведении', () => {
    const empty = state({ sectionId: null, materialId: null, stageIndex: null, focusSeq: 0 })
    expect(nextFollow({ following: false, focusSeq: null }, null, empty))
      .toEqual({ following: true, focusSeq: 0, go: true })
  })
})

describe('positionChanged', () => {
  it('одинаковые позиции — без изменений', () => {
    expect(positionChanged(state(), state({ version: 9, timer: { endsAtMs: 1, durationSeconds: 1 } }))).toBe(false)
  })

  for (const [field, value] of [
    ['sectionId', 302],
    ['materialId', 913],
    ['stepId', 's2'],
    ['questionId', 'q1'],
    ['focusView', 'BOARD'],
    ['stageIndex', 4],
  ]) {
    it(`замечает смену ${field}`, () => {
      expect(positionChanged(state(), state({ [field]: value }))).toBe(true)
    })
  }

  // null и «поля нет» — одно и то же: сервер может не прислать пустое поле.
  it('null и отсутствующее поле не различает', () => {
    const withoutStep = state()
    delete withoutStep.stepId
    expect(positionChanged(state({ stepId: null }), withoutStep)).toBe(false)
  })

  it('стадия null → 0 — это смена', () => {
    expect(positionChanged(state({ stageIndex: null }), state({ stageIndex: 0 }))).toBe(true)
  })
})

describe('isPointEvent — указка преподавателя в потоке показа', () => {
  it('«Перенести ученика сюда» — eventType point', () => {
    expect(isPointEvent({ selector: '[data-jts-block="b1"]', eventType: 'point', value: null })).toBe(true)
  })

  it('клик, ввод, стадия и прокрутка — не указка', () => {
    for (const eventType of ['click', 'input', 'change', 'scroll', 'stage']) {
      expect(isPointEvent({ selector: '#a', eventType, value: null })).toBe(false)
    }
  })

  it('пустое событие не падает', () => {
    expect(isPointEvent(null)).toBe(false)
    expect(isPointEvent(undefined)).toBe(false)
  })
})

describe('isPointerBatch — указка, а не показ класса', () => {
  const point = { selector: '[data-jts-block="b1"]', eventType: 'point', value: null }
  const click = { selector: '#a', eventType: 'click', value: null }
  const scroll = { selector: 'window', eventType: 'scroll', value: '{"y":300}' }

  it('одна указка (и несколько подряд) — указка', () => {
    expect(isPointerBatch([point])).toBe(true)
    expect(isPointerBatch([point, point])).toBe(true)
  })

  // Снимок рамки несёт прошлые указки из истории моста, но это поток показа.
  it('снимок с прошлыми указками среди кликов и прокрутки — не указка', () => {
    expect(isPointerBatch([click, point, scroll])).toBe(false)
    expect(isPointerBatch([click])).toBe(false)
  })

  it('пустое и не массив — не указка', () => {
    expect(isPointerBatch([])).toBe(false)
    expect(isPointerBatch(null)).toBe(false)
    expect(isPointerBatch(undefined)).toBe(false)
  })
})

