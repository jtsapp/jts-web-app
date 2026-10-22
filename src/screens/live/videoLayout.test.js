import { describe, it, expect } from 'vitest'
import { videoLayout, orderTiles, initials, callFallback } from './videoLayout.js'

const p = (userId, name, extra = {}) => ({
  userId, identity: userId, name, audioMuted: false, videoOn: false, speaking: false, isHost: false, isSelf: false, ...extra,
})

describe('videoLayout', () => {
  it('индивидуальные и пробный — один на один', () => {
    for (const type of ['INDIVIDUAL_STANDARD', 'INDIVIDUAL_PREMIUM', 'TRIAL']) {
      expect(videoLayout(type)).toBe('duo')
    }
  })
  it('пара, группа и неизвестный тип — сетка', () => {
    expect(videoLayout('PAIR')).toBe('grid')
    expect(videoLayout('GROUP')).toBe('grid')
    expect(videoLayout(undefined)).toBe('grid')
  })
})

describe('orderTiles', () => {
  it('учитель первым, остальные по имени, исходный массив не тронут', () => {
    const list = [p('3', 'Дана'), p('140', 'Айгерим'), p('2', 'Бекзат')]
    const ordered = orderTiles(list, 140)
    expect(ordered.map((x) => x.userId)).toEqual(['140', '2', '3'])
    expect(list.map((x) => x.userId)).toEqual(['3', '140', '2'])
  })
  it('учителя находит по identity из токена, а не по номеру в сессии Zoom', () => {
    const list = [
      p('16778300', 'Дана', { identity: '141' }),
      p('16778240', 'Яна', { identity: '140' }),
      p('16778301', 'Бекзат', { identity: '142' }),
    ]
    expect(orderTiles(list, 140).map((x) => x.name)).toEqual(['Яна', 'Бекзат', 'Дана'])
  })
  it('без учителя в звонке — просто по имени', () => {
    expect(orderTiles([p('3', 'Дана'), p('2', 'Бекзат')], 140).map((x) => x.userId)).toEqual(['2', '3'])
  })
})

describe('initials', () => {
  it('две первые буквы слов', () => expect(initials('айгерим сапарова')).toBe('АС'))
  it('одно слово', () => expect(initials('Dana')).toBe('D'))
  it('пусто', () => expect(initials('  ')).toBe('?'))
})

describe('callFallback', () => {
  it('503 и сеть — ссылка', () => {
    expect(callFallback({ status: 503 })).toBe('link')
    expect(callFallback(new Error('Нет связи с сервером.'))).toBe('link')
  })
  it('409 — урок завершён', () => expect(callFallback({ status: 409 })).toBe('ended'))
  it('403 — нет доступа', () => expect(callFallback({ status: 403 })).toBe('denied'))
})
