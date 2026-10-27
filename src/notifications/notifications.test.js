import { describe, it, expect } from 'vitest'
import { channelMarks, normalizeChannels } from './channelMarks.js'
import { TEXTS, noticeText } from './texts.js'
import { notificationTarget } from '../lib/studentDeepLink.js'

describe('отметки каналов уведомления', () => {
  it('показываются только каналы, по которым событие реально ушло', () => {
    expect(channelMarks('EMAIL,PUSH')).toEqual(['EMAIL', 'PUSH'])
    expect(channelMarks('PUSH')).toEqual(['PUSH'])
    expect(channelMarks('EMAIL')).toEqual(['EMAIL'])
  })

  it('пусто — только кабинет; лишнее, регистр и дубли не мешают, порядок фиксирован', () => {
    expect(channelMarks('')).toEqual([])
    expect(channelMarks(null)).toEqual([])
    expect(channelMarks(undefined)).toEqual([])
    expect(channelMarks('sms, push, PUSH, email')).toEqual(['EMAIL', 'PUSH'])
  })

  it('настройка каналов: непонятное значение считается включённым, как на сервере', () => {
    expect(normalizeChannels({ email: false, push: true })).toEqual({ email: false, push: true })
    expect(normalizeChannels({})).toEqual({ email: true, push: true })
    expect(normalizeChannels(null)).toEqual({ email: true, push: true })
  })
})

describe('тексты уведомлений', () => {
  it('ru, kk и en совпадают по ключам и подстановкам', () => {
    const keys = (o) => Object.keys(o).sort()
    expect(keys(TEXTS.kk)).toEqual(keys(TEXTS.ru))
    expect(keys(TEXTS.en)).toEqual(keys(TEXTS.ru))
    const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
    for (const key of Object.keys(TEXTS.ru)) {
      expect(holes(TEXTS.en[key]), key).toBe(holes(TEXTS.ru[key]))
      expect(holes(TEXTS.kk[key]), key).toBe(holes(TEXTS.ru[key]))
    }
  })

  it('запасной язык — русский, неизвестный ключ — сам ключ', () => {
    expect(noticeText('en', 'title')).toBe('Notifications')
    expect(noticeText('de', 'title')).toBe('Уведомления')
    expect(noticeText('ru', 'no.such')).toBe('no.such')
  })
})

describe('ссылки уведомлений ведут в новые разделы ученика', () => {
  it('запись в группу и сама лента', () => {
    expect(notificationTarget('/group-choice')).toEqual({ screen: 'group', payload: null })
    expect(notificationTarget('group-choice')).toEqual({ screen: 'group', payload: null })
    expect(notificationTarget('/notifications')).toEqual({ screen: 'notifications', payload: null })
  })

  it('прежние ссылки работают как работали', () => {
    expect(notificationTarget('teacher-matching').screen).toBe('my-teacher')
    expect(notificationTarget('homework').screen).toBe('homework')
    expect(notificationTarget('/system/schedule/12/workspace')).toEqual({ screen: 'lessons', payload: { lessonId: 12 } })
    expect(notificationTarget('')).toEqual({ screen: null, payload: null })
  })
})
