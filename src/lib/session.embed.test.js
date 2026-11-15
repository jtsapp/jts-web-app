// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { adoptEmbedToken, clearToken, loadRefreshToken, loadToken, saveToken, saveUserSnapshot } from './session.js'

describe('сессия кабинета в рамке урока', () => {
  beforeEach(() => {
    localStorage.clear()
    saveToken('cabinet-token', 'cabinet-refresh')
    saveUserSnapshot({ id: 7, name: 'Cabinet user', role: 'STUDENT' })
  })
  afterEach(() => adoptEmbedToken(null))

  it('токен страницы урока живёт в памяти: хранилище кабинета не тронуто', () => {
    adoptEmbedToken('lesson-token')

    expect(loadToken()).toBe('lesson-token')
    expect(loadRefreshToken()).toBeNull()
    expect(localStorage.getItem('jts_access_token')).toBe('cabinet-token')
    expect(localStorage.getItem('jts_refresh_token')).toBe('cabinet-refresh')
  })

  it('запись и сброс сессии в рамке меняют только память', () => {
    adoptEmbedToken('lesson-token')

    saveToken('refreshed-token', null)
    saveUserSnapshot({ id: 9, name: 'Teacher', role: 'TEACHER' })
    expect(loadToken()).toBe('refreshed-token')

    clearToken()
    expect(localStorage.getItem('jts_access_token')).toBe('cabinet-token')
    expect(localStorage.getItem('jts_refresh_token')).toBe('cabinet-refresh')
    expect(JSON.parse(localStorage.getItem('jts_user_snapshot')).name).toBe('Cabinet user')
  })

  it('без токена страницы — обычная сессия из хранилища', () => {
    expect(loadToken()).toBe('cabinet-token')
    expect(loadRefreshToken()).toBe('cabinet-refresh')
  })
})
