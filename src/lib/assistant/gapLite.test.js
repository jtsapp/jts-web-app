// «Не заходил 2+ дня» (кейс 12, ТЗ 9.1): план облегчает сам сайт, раз в день, а событие уходит с lite и свежими цифрами.
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../ge/plan/replan.js', () => ({ replanToday: vi.fn() }))

const { GAP_LITE_MIN, lightenForGap } = await import('./gapLite.js')
const { eventButtons, eventHint, eventMark, parseEventMark } = await import('./events.js')
const { eventActions } = await import('./eventActions.js')

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}
const ev = { type: 'return_after_gap', params: { days: 3, plan: 'ready', total: 3, done: 0, left: 3, min: 49, next: 'course', nmin: 30 } }
const summary = { ready: true, canReplan: true, left: 3, min: 49 }
const litePlan = {
  state: 'ready',
  shortDay: { minutes: 15 },
  tasks: [{ id: 1, kind: 'practice', module: 'ai_tutor', minutes: 15, status: 'pending', date: '2026-11-08' }],
}

describe('lightenForGap', () => {
  it('пересобирает день до 15 минут и помечает событие lite; второй раз за день — нет', async () => {
    const replan = vi.fn(async () => litePlan)
    const storage = memory()
    const now = Date.parse('2026-11-08T09:00:00')
    const out = await lightenForGap(ev, { token: 't', owner: 'user-7', summary, now, replan, storage })
    expect(replan).toHaveBeenCalledWith('t', GAP_LITE_MIN)
    expect(out.params.lite).toBe(true)
    expect(out.params.days).toBe(3)
    const again = await lightenForGap(ev, { token: 't', owner: 'user-7', summary, now: now + 3600_000, replan, storage })
    expect(again).toBe(ev)
    expect(replan).toHaveBeenCalledTimes(1)
  })

  it('план уже короткий, пересобирать нельзя, другое событие или сбой — событие как было', async () => {
    const replan = vi.fn(async () => litePlan)
    const base = { token: 't', owner: 'user-7', replan, storage: memory() }
    expect(await lightenForGap(ev, { ...base, summary: { ...summary, min: 15 } })).toBe(ev)
    expect(await lightenForGap(ev, { ...base, summary: { ...summary, canReplan: false } })).toBe(ev)
    expect(await lightenForGap({ type: 'day_start', params: {} }, { ...base, summary })).toEqual({ type: 'day_start', params: {} })
    expect(replan).not.toHaveBeenCalled()
    const failing = vi.fn(async () => {
      throw new Error('500')
    })
    expect(await lightenForGap(ev, { ...base, replan: failing, summary })).toBe(ev)
  })
})

describe('событие с облегчённым планом', () => {
  it('lite едет в пометке; указание — «план уже лёгкий», кнопки — «Начать» и «Вернуть обычный план»', () => {
    const mark = eventMark('return_after_gap', { days: 3, lite: true })
    expect(mark).toBe('[событие: return_after_gap; days=3; lite=1]')
    const parsed = parseEventMark(mark)
    expect(parsed.lite).toBe('1')
    const hint = eventHint(parsed, 'ru')
    expect(hint).toContain('план на сегодня сайт уже сделал лёгким')
    expect(hint).toContain('«Начать» и «Вернуть обычный план»')
    expect(eventHint(parseEventMark(eventMark('return_after_gap', { days: 3 })), 'ru')).toContain('«План на 15 минут»')
    expect(eventButtons('return_after_gap', true)).toEqual(['step:start', 'restore', 'showplan'])
    expect(eventButtons('return_after_gap')).toEqual(['replan:15', 'showplan'])
  })

  it('кнопки окна: шаг плана и «вернуть обычный» (пересчёт с 0 минут)', () => {
    const next = { id: 1, kind: 'practice', module: 'ai_tutor' }
    const s = { ready: true, canReplan: true, left: 1, next, nextKind: 'ai_tutor' }
    const acts = eventActions({ type: 'return_after_gap', params: { lite: true } }, null, s)
    expect(acts.map((a) => a.kind)).toEqual(['step', 'replan', 'nav'])
    expect(acts[1]).toMatchObject({ minutes: 0 })
  })
})

describe('окно, открытое самим учеником после перерыва', () => {
  it('трекер помнит перерыв до конца дня', async () => {
    const { createProactiveTracker } = await import('./proactive.js')
    const t = createProactiveTracker()
    t.seen(Date.parse('2026-11-05T10:00:00'))
    const now = Date.parse('2026-11-08T09:00:00')
    expect(t.arrival({ now, summary: { ready: false } }).type).toBe('return_after_gap')
    expect(t.gapToday(now + 3600_000)).toBe(3)
    expect(t.gapToday(Date.parse('2026-11-09T09:00:00'))).toBe(0)
  })

  it('первая реплика: «без нажима» — по awayDays окна или по профилю без занятий за неделю', async () => {
    const { GAP_OPENING_HINT, OPENING_MARK, buildTurns, parseChatRequest } = await import('./prompt.js')
    const req = (extra) => parseChatRequest({ messages: [{ role: 'user', content: OPENING_MARK }], screen: { id: 'home', text: 'Главная' }, ...extra })
    const last = (extra, studentContext = null) => buildTurns({ ...req(extra), user: null, studentContext }).at(-1).content
    expect(req({ awayDays: 3 }).awayDays).toBe(3)
    expect(req({ awayDays: '3' }).awayDays).toBe(0)
    expect(last({ awayDays: 3 })).toContain(GAP_OPENING_HINT)
    expect(last({}, 'Последние 7 дней: дней с занятиями 0, заданий 0.')).toContain(GAP_OPENING_HINT)
    expect(last({}, 'Последние 7 дней: дней с занятиями 2, заданий 9.')).not.toContain(GAP_OPENING_HINT)
    expect(last({ awayDays: 1 })).not.toContain(GAP_OPENING_HINT)
  })
})
