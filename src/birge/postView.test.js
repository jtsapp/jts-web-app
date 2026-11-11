import { describe, it, expect } from 'vitest'
import { authorInitial, canReport, isLive, postBadge, postTime } from './postView.js'

const post = (over = {}) => ({ id: 1, status: 'published', hiddenReason: null, mine: true, canReport: false, ...over })

describe('бейдж своего непубличного поста (§7)', () => {
  it.each([
    ['pending', null, { key: 'birge.badge.review', tone: 'pend' }],
    ['tomorrow', null, { key: 'birge.badge.review', tone: 'pend' }],
    ['rejected', null, { key: 'birge.badge.rejected', tone: 'rej' }],
    ['hidden', 'reports', { key: 'birge.badge.hidden', tone: 'hid' }],
    ['hidden', 'manager', { key: 'birge.badge.hidden', tone: 'hid' }],
    ['hidden', 'overflow', null],
    ['published', null, null],
  ])('%s / %s', (status, hiddenReason, badge) => {
    expect(postBadge(post({ status, hiddenReason }))).toEqual(badge)
  })

  it('у чужих бейджа нет: их непубличное ученику и не приходит', () => {
    expect(postBadge(post({ status: 'pending', mine: false }))).toBeNull()
  })
})

describe('что можно с постом', () => {
  it('лайк — только у опубликованного (скрытый по переполнению автору и приходит опубликованным)', () => {
    expect(isLive(post())).toBe(true)
    expect(isLive(post({ status: 'pending' }))).toBe(false)
    expect(isLive(post({ status: 'hidden', hiddenReason: 'reports' }))).toBe(false)
  })

  it('жалоба — не на свой и только если сервер разрешил', () => {
    expect(canReport(post({ mine: false, canReport: true }))).toBe(true)
    expect(canReport(post({ mine: true, canReport: true }))).toBe(false)
    expect(canReport(post({ mine: false, canReport: false }))).toBe(false)
    expect(canReport(null)).toBe(false)
  })

  it('буква аватара — первая буква имени', () => {
    expect(authorInitial({ name: 'аружан К.' })).toBe('А')
    expect(authorInitial({ name: '  ' })).toBe('?')
    expect(authorInitial(null)).toBe('?')
  })
})

describe('время у карточки (как в прототипе)', () => {
  const now = new Date('2026-11-11T12:00:00Z')
  const opts = { now, timeZone: 'UTC' }

  it('сегодня — часы и минуты', () => {
    expect(postTime('2026-11-11T09:40:00Z', opts)).toBe('09:40')
  })

  it('вчера — словом', () => {
    expect(postTime('2026-11-10T23:10:00Z', { ...opts, yesterday: 'Вчера' })).toBe('Вчера')
  })

  it('раньше — число и месяц на языке интерфейса', () => {
    expect(postTime('2026-11-01T10:00:00Z', opts)).toMatch(/^1 нояб/)
    expect(postTime('2026-11-01T10:00:00Z', { ...opts, lang: 'en' })).toMatch(/^1 Nov/)
  })

  it('нет даты — пусто', () => {
    expect(postTime(null)).toBe('')
    expect(postTime('не дата')).toBe('')
  })
})
