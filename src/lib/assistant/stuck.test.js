import { describe, it, expect } from 'vitest'
import { STUCK, createStuckTracker, verdictMarks } from './stuck.js'

const wrongPick = (w) =>
  `Выберите. [кнопка «like»${w === 'like' ? ' (отмечено как неверное)' : ''}] [кнопка «don't like»${w === 'dont' ? ' (отмечено как неверное)' : ''}]`

describe('verdictMarks', () => {
  it('неверное — пометки вариантов и полей и эталон сайта; верное — отдельно', () => {
    const m = verdictMarks(
      '[поле: ученик ввёл «goed» (отмечено как неверное)] [кнопка «Далее»]\n [верный ответ по заданию: «went»] \n[кнопка «a» (отмечено как верное)]',
    )
    expect(m.wrong).toBe('[поле: ученик ввёл «goed» (отмечено как неверное)]|[верный ответ по заданию: «went»]')
    expect(m.right).toBe('[кнопка «a» (отмечено как верное)]')
    expect(verdictMarks('Выберите. [кнопка «like»]')).toEqual({ wrong: '', right: '' })
  })
})

describe('createStuckTracker', () => {
  // ТЗ v2.0, 7.2б: облачко — после первого неверного ответа и после 60 с простоя.
  it('по умолчанию — первая же неверная проверка; пометка, что была при входе, — нет', () => {
    expect(STUCK.wrongLimit).toBe(1)
    // Простой — 90 с: решение владельца 28.10.2026 (ТЗ пишет 60).
    expect(STUCK.idleMs).toBe(90_000)
    const s = createStuckTracker()
    s.baseline({ screen: 'a', text: wrongPick('like') })
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe('errors')
    expect(s.wrongs()).toBe(1)
  })

  it('quiet — ошибка считается (wrongs), а облачко и его пауза не тратятся', () => {
    const s = createStuckTracker()
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 1, quiet: true })).toBe(null)
    expect(s.wrongs()).toBe(1)
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe('errors')
    expect(s.wrongs()).toBe(2)
  })

  it('при пороге две — две неверные проверки подряд — errors; одна — нет', () => {
    const s = createStuckTracker({ wrongLimit: 2 })
    s.baseline({ screen: 'kingdom-interior', text: wrongPick(null) })
    expect(s.observe({ screen: 'kingdom-interior', text: wrongPick('like'), now: 1000 })).toBe(null)
    // «Продолжить» — следующее задание, пометок нет: счёт не сбрасывается.
    expect(s.observe({ screen: 'kingdom-interior', text: 'Next. [кнопка «a»]', now: 2000 })).toBe(null)
    expect(s.observe({ screen: 'kingdom-interior', text: wrongPick('dont'), now: 3000 })).toBe('errors')
  })

  it('та же пометка после «Послушать» — не новая ошибка; новый ввод — новая', () => {
    const s = createStuckTracker({ wrongLimit: 2 })
    const field = (v) => `[поле: ученик ввёл «${v}» (отмечено как неверное)]`
    s.observe({ screen: 'workbook', text: field('goed'), now: 1 })
    expect(s.observe({ screen: 'workbook', text: field('goed'), now: 2 })).toBe(null)
    expect(s.observe({ screen: 'workbook', text: field('wented'), now: 3 })).toBe('errors')
  })

  it('верная проверка сбрасывает счёт; уход с экрана — тоже', () => {
    const s = createStuckTracker({ wrongLimit: 2 })
    s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })
    s.observe({ screen: 'a', text: '[кнопка «x» (отмечено как верное)]', now: 2 })
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 3 })).toBe(null)
    s.observe({ screen: 'b', text: wrongPick('like'), now: 4 })
    expect(s.observe({ screen: 'b', text: 'чисто', now: 5 })).toBe(null)
    expect(s.observe({ screen: 'c', text: wrongPick('dont'), now: 6 })).toBe(null)
  })

  it('пометки, что уже были на экране при входе, ошибкой не считаются', () => {
    const s = createStuckTracker({ wrongLimit: 2 })
    s.baseline({ screen: 'a', text: wrongPick('like') })
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: 3 })).toBe('errors')
  })

  // Ошибки во время паузы копятся: ученик всё ещё ошибается — после паузы облачко
  // выходит на первой же новой ошибке, а не ждёт ещё двух.
  it(`не чаще раза в ${STUCK.cooldownMs / 60000} мин`, () => {
    const s = createStuckTracker({ wrongLimit: 2 })
    const pair = (t0) => {
      s.observe({ screen: 'a', text: wrongPick('like'), now: t0 })
      return s.observe({ screen: 'a', text: wrongPick('dont'), now: t0 + 1 })
    }
    expect(pair(0)).toBe('errors')
    expect(pair(1000)).toBe(null)
    expect(s.observe({ screen: 'a', text: wrongPick('like'), now: STUCK.cooldownMs + 10 })).toBe('errors')
  })

  it(`простой ${STUCK.idleMs / 1000} с на задании — idle, ещё ${STUCK.idle2Ms / 1000} с — idle2, дальше тишина`, () => {
    const s = createStuckTracker()
    expect(s.idle({ screen: 'a', now: STUCK.idleMs - 1, lastActionAt: 0, task: true })).toBe(null)
    expect(s.idle({ screen: 'a', now: STUCK.idleMs, lastActionAt: 0, task: false })).toBe(null)
    expect(s.idle({ screen: 'a', now: STUCK.idleMs, lastActionAt: 0, task: true })).toBe('idle')
    // Второй уровень — того же простоя, паузы облачка не ждёт.
    expect(s.idle({ screen: 'a', now: STUCK.idleMs + STUCK.idle2Ms - 1, lastActionAt: 0, task: true })).toBe(null)
    expect(s.idle({ screen: 'a', now: STUCK.idleMs + STUCK.idle2Ms, lastActionAt: 0, task: true })).toBe('idle2')
    // Дальше тот же простой — тишина: не больше двух уровней.
    expect(s.idle({ screen: 'a', now: STUCK.idleMs + STUCK.cooldownMs * 3, lastActionAt: 0, task: true })).toBe(null)
    // Ученик что-то сделал — новый простой, снова с первого уровня (после паузы облачка).
    const later = STUCK.idleMs + STUCK.idle2Ms + STUCK.cooldownMs
    expect(s.idle({ screen: 'a', now: later + STUCK.idleMs, lastActionAt: later, task: true })).toBe('idle')
  })

  it('пропущенный второй уровень не выключает облачко на визит', () => {
    const s = createStuckTracker({ ignoreLimit: 1, cooldownMs: 0 })
    s.ignored('idle2')
    expect(s.isOff()).toBe(false)
    s.ignored('idle')
    expect(s.isOff()).toBe(true)
  })

  it('дважды не нажал — до конца визита облачка нет; нажал — счёт игнора с нуля', () => {
    const s = createStuckTracker({ cooldownMs: 0, wrongLimit: 2 })
    s.ignored()
    s.taken()
    s.ignored()
    expect(s.isOff()).toBe(false)
    s.ignored()
    expect(s.isOff()).toBe(true)
    s.observe({ screen: 'a', text: wrongPick('like'), now: 1 })
    expect(s.observe({ screen: 'a', text: wrongPick('dont'), now: 2 })).toBe(null)
  })
})
