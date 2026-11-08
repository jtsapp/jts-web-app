import { describe, expect, it } from 'vitest'
import { eventActions } from './eventActions.js'
import { daySummary } from './planSteps.js'
import { messageMarkers } from './actions.js'

const plan = (tasks, extra = {}) => ({ state: 'ready', today: '2026-11-07', shortDay: null, stopDay: null, tasks, ...extra })
const course = { id: 1, date: '2026-11-07', kind: 'course', status: 'available', minutes: 30 }
const tutor = { id: 2, date: '2026-11-07', kind: 'practice', module: 'ai_tutor', status: 'in_progress', minutes: 15, got: 6 }
const summary = daySummary(plan([course, tutor]))
const kinds = (list) => list.map((a) => a.kind + (a.minutes != null ? `:${a.minutes}` : '') + (a.target && ['dismiss', 'nav'].includes(a.kind) ? `:${a.target}` : ''))

describe('кнопки ответа на событие', () => {
  it('начало дня: «Начать» — следующий шаг плана, «У меня мало времени»', () => {
    const acts = eventActions({ type: 'day_start' }, null, summary)
    expect(kinds(acts)).toEqual(['step', 'lowtime'])
    expect(acts[0]).toMatchObject({ task: course, verb: 'start', dest: 'learning' })
  })

  it('шаг закрыт: «Дальше», «Перерыв 10 мин», «На сегодня всё»', () => {
    expect(kinds(eventActions({ type: 'step_completed' }, null, summary))).toEqual(['step', 'break:10', 'stop'])
  })

  it('прежний бэкенд: без «мало времени» и «На сегодня всё»', () => {
    const old = daySummary({ state: 'ready', today: '2026-11-07', tasks: [course] })
    expect(kinds(eventActions({ type: 'day_start' }, null, old))).toEqual(['step'])
    expect(kinds(eventActions({ type: 'step_completed' }, null, old))).toEqual(['step', 'break:10'])
  })

  it('плана нет — «Начать» становится предложением модели', () => {
    const offer = { kind: 'open', target: 'homework', now: false }
    expect(eventActions({ type: 'day_start' }, offer, { ready: false })).toEqual([offer])
    expect(eventActions({ type: 'day_start' }, null, { ready: false })).toEqual([])
  })

  it('долгий перерыв — «План на 15 минут» и «Показать план»; вечер — «10 минут» и «Сегодня не смогу»', () => {
    const gap = eventActions({ type: 'return_after_gap' }, null, summary)
    expect(kinds(gap)).toEqual(['replan:15', 'nav:ge-plan'])
    expect(gap[0].style).toBe('plan')
    const eve = eventActions({ type: 'evening_entry' }, null, summary)
    expect(kinds(eve)).toEqual(['replan:10', 'stop'])
    expect(eve[0].style).toBe('day')
    expect(eve[1].cant).toBe(true)
  })

  it('перерыв кончился — «Поехали» и «Ещё 5 минут»; вернулся после паузы — «Продолжить» сворачивает окно', () => {
    const over = eventActions({ type: 'break_over' }, null, summary)
    expect(kinds(over)).toEqual(['step', 'break:5'])
    expect(over[1].more).toBe(true)
    expect(kinds(eventActions({ type: 'return_after_pause' }, null, summary))).toEqual(['dismiss:continue', 'break:10'])
  })

  it('блуждает — «Я просто смотрю» считается отказом; демо — заявка на пробный урок', () => {
    const w = eventActions({ type: 'wandering' }, null, summary)
    expect(w[1]).toMatchObject({ kind: 'dismiss', target: 'look', decline: true })
    expect(kinds(eventActions({ type: 'demo_trial' }, null, { ready: false }))).toEqual(['trial', 'dismiss:demo'])
  })

  it('метки в истории: шаг — его раздел, перерыв и стоп — свои метки, «закрыть» — ничего', () => {
    const acts = eventActions({ type: 'step_completed' }, null, summary)
    expect(messageMarkers({ actions: acts })).toBe('[[OPEN learning]]\n[[BREAK 10]]\n[[STOP_DAY]]')
    expect(messageMarkers({ actions: eventActions({ type: 'wandering' }, null, summary) })).toBe('[[OPEN learning]]')
  })
})

describe('сводка дня', () => {
  it('то же, что «Сегодня»: своё, без занятий и задач преподавателя; минуты — без набранного', () => {
    const s = daySummary(plan([
      course,
      tutor,
      { id: 3, date: '2026-11-07', kind: 'live', status: 'available' },
      { id: 4, date: '2026-11-07', kind: 'practice', module: 'vocabulary_sr', origin: 'teacher', status: 'available', minutes: 10 },
      { id: 5, date: '2026-11-07', kind: 'practice', module: 'shadowing', status: 'completed', minutes: 10 },
    ]))
    expect(s).toMatchObject({ ready: true, total: 3, done: 1, left: 2, min: 39, started: true, nextKind: 'course', canReplan: true, canStop: true })
    expect([...s.completed]).toEqual(['5'])
    expect(s.kinds.get('2')).toBe('ai_tutor')
  })

  it('плана нет — ready=false; всё сделано — «На сегодня всё» не нужна', () => {
    expect(daySummary(null)).toEqual({ ready: false })
    expect(daySummary({ state: 'no_onboarding', tasks: [] })).toEqual({ ready: false })
    expect(daySummary(plan([{ ...course, status: 'completed' }])).canStop).toBe(false)
  })
})
