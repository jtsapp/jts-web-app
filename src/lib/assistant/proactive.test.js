import { describe, expect, it } from 'vitest'
import { PROACTIVE, createProactiveTracker, daysBetween, levelAllows, localDay, memoryStore, planParams } from './proactive.js'

// Время устройства: 7 ноября 2026, 10:00 местного (часы — из Date, как на устройстве).
const at = (h, m = 0, day = 7) => new Date(2026, 10, day, h, m).getTime()
const MIN = 60_000
const ready = (patch = {}) => ({ ready: true, total: 3, done: 0, left: 3, min: 55, started: false, nextKind: 'course', completed: new Set(), kinds: new Map(), ...patch })

const tracker = (store = {}, session = {}) => {
  const s = memoryStore(store)
  const ss = memoryStore(session)
  return { t: createProactiveTracker({ store: s, session: ss }), s, ss }
}

describe('день и даты', () => {
  it('день устройства и разница дней', () => {
    expect(localDay(at(10))).toBe('2026-11-07')
    expect(daysBetween('2026-11-05', '2026-11-07')).toBe(2)
    expect(daysBetween(null, '2026-11-07')).toBe(0)
  })
})

describe('приход (7.1)', () => {
  it('первый раз на устройстве — начало дня; цифры плана в пометке', () => {
    const { t } = tracker()
    const ev = t.arrival({ now: at(10), summary: ready() })
    expect(ev).toEqual({ type: 'day_start', params: planParams(ready()) })
    expect(ev.params).toMatchObject({ plan: 'ready', total: 3, left: 3, min: 55, next: 'course' })
  })

  it('без плана — начало дня всё равно, с plan=none', () => {
    const { t } = tracker()
    expect(t.arrival({ now: at(10), summary: { ready: false } }).params).toEqual({ plan: 'none' })
  })

  it('день уже начат: перезагрузка через 10 минут — тихо, через 30+ — «с возвращением»', () => {
    const { t } = tracker({ startDay: '2026-11-07', lastAt: at(10), lastDay: '2026-11-07' })
    expect(t.arrival({ now: at(10, 10), summary: ready() })).toBe(null)
    expect(t.arrival({ now: at(10, 45), summary: ready() })).toMatchObject({ type: 'return_after_pause', params: { away: 45 } })
  })

  it('не заходил 2+ дня — «без упрёков, один короткий шаг»', () => {
    const { t } = tracker({ startDay: '2026-11-04', lastAt: at(18, 0, 4), lastDay: '2026-11-04' })
    expect(t.arrival({ now: at(10), summary: ready() })).toMatchObject({ type: 'return_after_gap', params: { days: 3 } })
  })

  it('вчера был — обычное начало дня', () => {
    const { t } = tracker({ startDay: '2026-11-06', lastAt: at(20, 0, 6), lastDay: '2026-11-06' })
    expect(t.arrival({ now: at(10), summary: ready() }).type).toBe('day_start')
  })

  it('вечер, ни шага — 10 минут вместо начала дня; что-то начато — обычное начало', () => {
    const { t } = tracker()
    expect(t.arrival({ now: at(19), summary: ready() })).toMatchObject({ type: 'evening_entry', params: { first: true } })
    expect(t.arrival({ now: at(19), summary: ready({ started: true }) }).type).toBe('day_start')
    expect(t.arrival({ now: at(19), summary: ready({ done: 1, left: 2 }) }).type).toBe('day_start')
  })

  it('больше пяти задач — «много задач» вместо начала дня, раз в день', () => {
    const { t } = tracker()
    const ev = t.arrival({ now: at(10), summary: ready({ total: 7, left: 7 }) })
    expect(ev).toMatchObject({ type: 'many_tasks', params: { first: true } })
    t.shown(ev, at(10))
    expect(t.arrival({ now: at(11), summary: ready({ total: 7, left: 7 }), kind: 'visible', awayMs: 40 * MIN }).type).toBe('return_after_pause')
  })

  it('вкладка снова видна: меньше 5 минут — тихо, 5+ — «вернулся после перерыва»', () => {
    const { t } = tracker({ startDay: '2026-11-07', lastAt: at(10), lastDay: '2026-11-07' })
    expect(t.arrival({ now: at(10, 4), kind: 'visible', awayMs: 4 * MIN, summary: ready() })).toBe(null)
    expect(t.arrival({ now: at(10, 6), kind: 'visible', awayMs: 6 * MIN, summary: ready() })).toMatchObject({ type: 'return_after_pause', params: { away: 6 } })
  })

  it('вкладка простояла скрытой до утра — это новый день', () => {
    const { t } = tracker({ startDay: '2026-11-06', lastAt: at(22, 0, 6), lastDay: '2026-11-06' })
    expect(t.arrival({ now: at(9), kind: 'visible', awayMs: 11 * 60 * MIN, summary: ready() }).type).toBe('day_start')
  })

  it('показанное начало дня не повторяется', () => {
    const { t } = tracker()
    const ev = t.arrival({ now: at(10), summary: ready() })
    t.shown(ev, at(10))
    t.seen(at(10))
    expect(t.arrival({ now: at(10, 5), summary: ready() })).toBe(null)
  })

  it('пробный урок демо — не начинает день', () => {
    const { t } = tracker()
    t.shown({ type: 'demo_trial', params: { first: true } }, at(10))
    expect(t.arrival({ now: at(10, 5), summary: ready() }).type).toBe('day_start')
  })
})

describe('переходы', () => {
  it('на Главную после 3+ минут в другом разделе — «осталось и следующий шаг»; мимоходом — нет', () => {
    const { t } = tracker()
    t.visit({ now: at(10), screen: 'home', summary: ready() })
    t.visit({ now: at(10, 1), screen: 'practice', summary: ready() })
    expect(t.visit({ now: at(10, 2), screen: 'home', summary: ready() })).toBe(null)
    t.visit({ now: at(10, 3), screen: 'vocab', summary: ready() })
    expect(t.visit({ now: at(10, 8), screen: 'home', summary: ready() })).toMatchObject({ type: 'return_same_day' })
  })

  it('на Главную — не чаще раза в 15 минут; всё сделано — не «осталось»', () => {
    const { t } = tracker()
    t.visit({ now: at(10), screen: 'home', summary: ready() })
    t.visit({ now: at(10, 1), screen: 'tutor', summary: ready() })
    const ev = t.visit({ now: at(10, 6), screen: 'home', summary: ready() })
    t.shown(ev, at(10, 6))
    t.visit({ now: at(10, 7), screen: 'tutor', summary: ready() })
    expect(t.visit({ now: at(10, 12), screen: 'home', summary: ready() })).toBe(null)
    t.visit({ now: at(10, 30), screen: 'tutor', summary: ready() })
    expect(t.visit({ now: at(10, 40), screen: 'home', summary: ready({ left: 0, done: 3 }) })).toBe(null)
  })

  it('3 раздела за 2 минуты без задания — «ищешь, с чего начать?»; задание начато — нет', () => {
    const { t } = tracker()
    expect(t.visit({ now: at(10), screen: 'practice' })).toBe(null)
    expect(t.visit({ now: at(10, 0.5), screen: 'vocab' })).toBe(null)
    expect(t.visit({ now: at(10, 1), screen: 'tutor-dashboard' })).toMatchObject({ type: 'wandering' })
    const b = tracker().t
    b.visit({ now: at(10), screen: 'practice' })
    b.visit({ now: at(10, 0.5), screen: 'kingdom-interior', task: true })
    expect(b.visit({ now: at(10, 1), screen: 'vocab' })).toBe(null)
  })

  it('за две минуты — не считается', () => {
    const { t } = tracker()
    t.visit({ now: at(10), screen: 'practice' })
    t.visit({ now: at(10, 1), screen: 'vocab' })
    expect(t.visit({ now: at(10, 3), screen: 'tutor-dashboard' })).toBe(null)
  })
})

describe('план по фактам', () => {
  it('шаг закрыт — step_completed с видом шага; последний — plan_completed', () => {
    const { t } = tracker()
    const prev = ready({ completed: new Set() })
    const next = ready({ done: 1, left: 2, completed: new Set(['7']), kinds: new Map([['7', 'ai_tutor']]), nextKind: 'vocabulary_sr' })
    expect(t.planChanged({ prev, next })).toMatchObject({ type: 'step_completed', params: { step: 'ai_tutor', next: 'vocabulary_sr', left: 2 } })
    const all = ready({ done: 3, left: 0, completed: new Set(['1', '2', '7']), nextKind: null })
    expect(t.planChanged({ prev: next, next: all })).toMatchObject({ type: 'plan_completed' })
  })

  it('ничего нового или плана нет — тихо', () => {
    const { t } = tracker()
    const s = ready({ completed: new Set(['1']) })
    expect(t.planChanged({ prev: s, next: s })).toBe(null)
    expect(t.planChanged({ prev: null, next: s })).toBe(null)
    expect(t.planChanged({ prev: s, next: { ready: false } })).toBe(null)
  })
})

describe('демо (7.2г)', () => {
  it('урок пройден — пробный урок, раз за сессию; не демо — нет', () => {
    const { t } = tracker()
    expect(t.lessonDone({ demo: false })).toBe(null)
    const ev = t.lessonDone({ demo: true, first: true })
    expect(ev).toEqual({ type: 'demo_trial', params: { first: true } })
    t.shown(ev, at(10))
    expect(t.lessonDone({ demo: true })).toBe(null)
  })
})

describe('лимиты (7.4)', () => {
  it('не больше одного за 3 минуты — кроме прихода (но и он не ближе минуты)', () => {
    const { t } = tracker()
    t.shown({ type: 'wandering' }, at(10))
    expect(t.allow({ type: 'step_completed' }, { now: at(10, 2) })).toBe(false)
    expect(t.allow({ type: 'step_completed' }, { now: at(10, 3) })).toBe(true)
    expect(t.allow({ type: 'return_after_pause' }, { now: at(10, 0.5) })).toBe(false)
    expect(t.allow({ type: 'return_after_pause' }, { now: at(10, 1) })).toBe(true)
  })

  it('закрыл плашку 3 раза подряд — до конца сессии только приход и закрытый шаг', () => {
    const { t } = tracker()
    t.dismissed()
    t.dismissed()
    t.engaged()
    t.dismissed()
    t.dismissed()
    expect(t.isOff()).toBe(false)
    t.dismissed()
    expect(t.isOff()).toBe(true)
    const later = at(12)
    expect(t.allow({ type: 'wandering' }, { now: later })).toBe(false)
    expect(t.allow({ type: 'step_completed' }, { now: later })).toBe(true)
    expect(t.allow({ type: 'day_start' }, { now: later })).toBe(true)
  })

  it('«выключено» живёт в хранилище вкладки — перезагрузка его не сбрасывает', () => {
    const session = memoryStore()
    const a = createProactiveTracker({ session })
    a.dismissed()
    a.dismissed()
    a.dismissed()
    expect(createProactiveTracker({ session }).isOff()).toBe(true)
  })

  it('настройка Профиля: «иногда» — раз-два в день, «по запросу» — только конец перерыва', () => {
    expect(levelAllows('often', 'wandering')).toBe(true)
    expect(levelAllows('sometimes', 'wandering')).toBe(false)
    expect(levelAllows('sometimes', 'return_same_day')).toBe(false)
    expect(levelAllows('sometimes', 'day_start')).toBe(true)
    expect(levelAllows('manual', 'day_start')).toBe(false)
    expect(levelAllows('manual', 'break_over')).toBe(true)
    expect(levelAllows('чепуха', 'wandering')).toBe(true)
    const { t } = tracker()
    expect(t.allow({ type: 'day_start' }, { now: at(10), level: 'manual' })).toBe(false)
  })

  it('пороги — из ТЗ', () => {
    expect(PROACTIVE.pauseMs).toBe(5 * MIN)
    expect(PROACTIVE.sameDayPauseMs).toBe(30 * MIN)
    expect(PROACTIVE.intervalMs).toBe(3 * MIN)
    expect(PROACTIVE.dismissLimit).toBe(3)
    expect(PROACTIVE.manyTasks).toBe(5)
  })
})

describe('будний день вечером', () => {
  it('вечер буднего дня — wd; субботы — нет', () => {
    const monday = new Date(2026, 10, 9, 19, 0).getTime()
    expect(createProactiveTracker().arrival({ now: monday, summary: ready() }).params.wd).toBe(true)
    expect(createProactiveTracker().arrival({ now: at(19), summary: ready() }).params.wd).toBe(false)
  })
})

// Методика (ТЗ v2.0, 8.3): «после 25–30 минут без перерыва предложить паузу».
describe('подряд без перерыва (long_session)', () => {
  it('25 минут действий без перерыва дольше 5 минут — пауза; после предложения — ещё через 25', () => {
    const { t } = tracker()
    let ev = null
    for (let m = 0; m <= 24; m += 2) ev = t.activity(at(10, m))
    expect(ev).toBeNull()
    ev = t.activity(at(10, 25))
    expect(ev).toEqual({ type: 'long_session', params: { run: 25 } })
    t.shown(ev, at(10, 25))
    expect(t.activity(at(10, 27))).toBeNull()
    for (let m = 29; m <= 49; m += 4) t.activity(at(10, m))
    expect(t.activity(at(10, 50))).toEqual({ type: 'long_session', params: { run: 50 } })
  })

  it('перерыв 5+ минут без действий или взятый перерыв — отсчёт сначала', () => {
    const { t } = tracker()
    for (let m = 0; m <= 20; m += 4) t.activity(at(10, m))
    // 6 минут без действий
    expect(t.activity(at(10, 26))).toBeNull()
    expect(t.activity(at(10, 50))).toBeNull()
    const b = tracker().t
    for (let m = 0; m <= 24; m += 4) b.activity(at(11, m))
    b.breakStarted()
    expect(b.activity(at(11, 26))).toBeNull()
  })

  it('пауза — только при подсказках «часто»; лимит 3 минут между сообщениями действует', () => {
    expect(levelAllows('often', 'long_session')).toBe(true)
    expect(levelAllows('sometimes', 'long_session')).toBe(false)
    const { t } = tracker({}, { lastAt: at(10, 24) })
    expect(t.allow({ type: 'long_session', params: { run: 25 } }, { now: at(10, 25) })).toBe(false)
    expect(t.allow({ type: 'long_session', params: { run: 28 } }, { now: at(10, 28) })).toBe(true)
  })
})
