// @vitest-environment jsdom
// Прогресс без серверной копии (пройденные сценарии «Ситуаций», результаты
// караоке) лежал под общим ключом браузера: после «Выйти» следующий ученик на
// том же компьютере видел чужие галочки и звёзды. Стирать его при выходе
// нельзя — владелец терял бы свой прогресс, — поэтому ключ свой у каждого.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userScopedKey } from './userScopedKey.js'
import { markItemDone, readDoneItems } from '../practice/situations/itemsProgress.js'
import { saveKaraokeResult, trackProgress } from '../practice/karaoke/karaokeData.js'

vi.mock('../api.js', () => ({}))

const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId })).replace(/=+$/, '')}.s`
const login = (userId) => localStorage.setItem('jts_access_token', tokenFor(userId))
const logout = () => localStorage.removeItem('jts_access_token')

beforeEach(() => localStorage.clear())

describe('userScopedKey', () => {
  it('у вошедшего — ключ с его id, у гостя — общий', () => {
    expect(userScopedKey('jts_x')).toBe('jts_x')
    login(41)
    expect(userScopedKey('jts_x')).toBe('jts_x:41')
  })

  it('прогресс гостя при первом чтении переходит в аккаунт и из общего ключа уходит', () => {
    localStorage.setItem('jts_x', '{"a":1}')
    login(41)
    expect(userScopedKey('jts_x')).toBe('jts_x:41')
    expect(localStorage.getItem('jts_x:41')).toBe('{"a":1}')
    expect(localStorage.getItem('jts_x')).toBeNull()
  })

  it('своё не затирается гостевым', () => {
    localStorage.setItem('jts_x:41', '{"mine":1}')
    localStorage.setItem('jts_x', '{"guest":1}')
    login(41)
    userScopedKey('jts_x')
    expect(localStorage.getItem('jts_x:41')).toBe('{"mine":1}')
  })
})

describe('сценарии «Ситуаций» и караоке — свои у каждого ученика', () => {
  it('галочки сценариев одного не видны другому', () => {
    login(41)
    markItemDone('a1', 3)
    logout()
    login(42)
    expect(readDoneItems('a1')).toEqual([])
    logout()
    login(41)
    expect(readDoneItems('a1')).toEqual([3])
  })

  it('звёзды караоке одного не видны другому', () => {
    login(41)
    saveKaraokeResult('song', { score: 95, weakLines: [] })
    const mine = trackProgress('song').stars
    expect(mine).toBeGreaterThan(0)
    logout()
    login(42)
    expect(trackProgress('song').stars).toBe(0)
  })
})
