// @vitest-environment jsdom
// Знакомство (кейс 24) и итог теста (кейс 35, 7.2в): когда Луна пишет, что модель получает, какие кнопки под ответом.
import { describe, it, expect, beforeEach } from 'vitest'
import env from '../../placement/__fixtures__/envelope-b1.json'
import { createProactiveTracker } from './proactive.js'
import { HOME_ONLY, eventButtons, eventHint, eventMark, parseEventMark } from './events.js'
import { eventActions } from './eventActions.js'
import { placementHighlights } from './placementEvent.js'
import { announcePlacementDone, takePlacementDone } from './placementDone.js'
import { menuKeys, sectionMapText } from './sectionMap.js'

const t = (key) => key

describe('first_visit — знакомство нового ученика', () => {
  it('первый заход нового ученика — знакомство вместо начала дня; после показа — обычное', () => {
    const tr = createProactiveTracker()
    const now = Date.parse('2026-11-08T09:00:00')
    expect(tr.arrival({ now, summary: { ready: false }, newcomer: true })).toEqual({ type: 'first_visit', params: {} })
    expect(tr.arrival({ now, summary: { ready: false } }).type).toBe('day_start')
    tr.shown({ type: 'first_visit', params: {} }, now)
    expect(tr.visit({ now: now + 1000, screen: 'home', newcomer: true })).toBe(null)
  })

  it('не случилось (тур, сразу тест) — при возвращении на «Главную»', () => {
    const tr = createProactiveTracker()
    expect(tr.visit({ now: 1, screen: 'home', newcomer: true })).toEqual({ type: 'first_visit', params: {} })
    expect(tr.visit({ now: 2, screen: 'practice', newcomer: true })).toBe(null)
    expect(tr.visit({ now: 3, screen: 'home', newcomer: false })).toBe(null)
  })

  it('указание и кнопки: тест уровня и карта разделов; только на «Главной»', () => {
    const hint = eventHint(parseEventMark(eventMark('first_visit')), 'ru')
    expect(hint).toContain('Познакомься')
    expect(hint).toContain('Предложи начать с теста уровня')
    expect(hint).toContain('«Пройти тест уровня» и «Показать, что где»')
    expect(eventButtons('first_visit')).toEqual(['test', 'tour'])
    expect(eventActions({ type: 'first_visit' }, null, null)).toEqual([
      { kind: 'nav', target: 'placement', caption: 'test' },
      { kind: 'map', target: 'map' },
    ])
    expect(HOME_ONLY.has('first_visit')).toBe(true)
  })
})

describe('placement_done — итог теста', () => {
  beforeEach(() => sessionStorage.clear())

  it('из конверта: уровень, цель, сильный и слабый раздел — кодами', () => {
    const h = placementHighlights(env)
    expect(h.lvl).toMatch(/^(A0|A1|A2|B1|B2|C1|C2)$/)
    if (h.strong) expect(h.strong).not.toBe(h.weak)
    expect(placementHighlights({})).toBe(null)
  })

  it('итог ждёт в sessionStorage, пока трекер не заберёт; забрать можно один раз', () => {
    announcePlacementDone({ lvl: 'B1', strong: 'R', weak: 'L', tgt: 'B2' })
    expect(takePlacementDone()).toEqual({ lvl: 'B1', strong: 'R', weak: 'L', tgt: 'B2' })
    expect(takePlacementDone()).toBe(null)
  })

  it('пометка и указание: уровень, сильное и слабое словами, цель; кнопки — «Начать» и карта', () => {
    const mark = eventMark('placement_done', { lvl: 'B1', strong: 'R', weak: 'L', tgt: 'B2', plan: 'ready', next: 'course', nmin: 30 })
    const ev = parseEventMark(mark)
    expect(mark).toBe('[событие: placement_done; lvl=b1; strong=r; weak=l; tgt=b2; plan=ready; next=course; nmin=30]')
    expect(ev).toMatchObject({ type: 'placement_done', lvl: 'b1', strong: 'r', weak: 'l', tgt: 'b2' })
    const hint = eventHint(ev, 'ru')
    expect(hint).toContain('уровень B1')
    expect(hint).toContain('Сильнее всего — чтение')
    expect(hint).toContain('больше внимания — аудирование')
    expect(hint).toContain('Цель из анкеты — B2')
    expect(hint).toContain('следующий шаг — урок курса')
    expect(eventButtons('placement_done')).toEqual(['step:start', 'tour'])
    // Чужое в пометке не проходит.
    expect(parseEventMark('[событие: placement_done; lvl=Z9]')).toBe(null)
  })
})

describe('карта разделов', () => {
  it('пункты — из меню ученика, без «Главной» и без неизвестных; меню нет — обычный набор', () => {
    document.body.innerHTML = '<nav class="sb__nav"><a data-nav="home"></a><a data-nav="practice"></a><a data-nav="tutor"></a><a data-nav="ielts"></a><a data-nav="contracts"></a></nav>'
    expect(menuKeys()).toEqual(['practice', 'tutor', 'ielts', 'contracts'])
    const text = sectionMapText(t)
    expect(text.split('\n')).toEqual([
      'assistant.map.title',
      '• assistant.map.name.practice — assistant.map.practice',
      '• assistant.map.name.tutor — assistant.map.tutor',
      '• assistant.map.name.ielts — assistant.map.ielts',
      'assistant.map.tail',
    ])
    document.body.innerHTML = ''
    expect(menuKeys()).toEqual(['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab'])
  })
})
