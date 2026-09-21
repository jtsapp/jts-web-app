// @vitest-environment jsdom
// Фото профиля живёт только в браузере. Ключ был общий на браузер, и после
// «Выйти» следующий ученик на том же компьютере видел чужое фото в своём
// профиле. Стирать на выходе нельзя — владелец терял бы фото при каждом
// повторном входе, — поэтому ключ привязан к пользователю.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readAvatar, saveAvatar, removeAvatar, readAvatarBg, saveAvatarBg } from './profileAvatar.js'

// Токен с payload {"userId": N}: разбор payload'а — lib/jwt.js.
const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId })).replace(/=+$/, '')}.s`
const A = tokenFor(41)
const B = tokenFor(42)

beforeEach(() => localStorage.clear())

describe('profileAvatar', () => {
  it('фото одного ученика не видно другому', () => {
    saveAvatar(A, 'data:image/png;base64,AAA')
    expect(readAvatar(A)).toBe('data:image/png;base64,AAA')
    expect(readAvatar(B)).toBeNull()
  })

  it('фон аватара — тоже свой у каждого', () => {
    saveAvatarBg(A, '#dcfce7')
    expect(readAvatarBg(A)).toBe('#dcfce7')
    expect(readAvatarBg(B)).toBeNull()
  })

  it('сброс убирает только своё фото', () => {
    saveAvatar(A, 'a')
    saveAvatar(B, 'b')
    removeAvatar(A)
    expect(readAvatar(A)).toBeNull()
    expect(readAvatar(B)).toBe('b')
  })

  it('фото из старого общего ключа забирает первый открывший профиль, и оно исчезает у остальных', () => {
    localStorage.setItem('jts_profile_avatar', 'legacy')
    localStorage.setItem('jts_avatar_bg', '#fef3c7')
    expect(readAvatar(A)).toBe('legacy')
    expect(readAvatarBg(A)).toBe('#fef3c7')
    expect(localStorage.getItem('jts_profile_avatar')).toBeNull()
    expect(readAvatar(B)).toBeNull()
  })

  it('без токена ничего не читает и не пишет', () => {
    saveAvatar(null, 'x')
    expect(readAvatar(null)).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})

describe('profileAvatar — нехватка места', () => {
  it('сообщает, что фото не сохранилось, вместо молчаливого отката', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(saveAvatar(A, 'data:image/png;base64,AAA')).toBe(false)
    spy.mockRestore()
    expect(saveAvatar(A, 'x')).toBe(true)
  })
})
