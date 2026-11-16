import { describe, expect, it } from 'vitest'
import { screenNeedsLogin } from './guestLogin.js'

describe('гость не остаётся в кабинете', () => {
  it('уроки и SAT без токена ведут на вход', () => {
    expect(screenNeedsLogin('lessons', null)).toBe(true)
    expect(screenNeedsLogin('sat', null)).toBe(true)
    expect(screenNeedsLogin('home', '')).toBe(true)
  })

  it('сам вход и регистрация гостю открыты', () => {
    expect(screenNeedsLogin('welcome', null)).toBe(false)
    expect(screenNeedsLogin('login-password', null)).toBe(false)
    expect(screenNeedsLogin('reg-name', null)).toBe(false)
  })

  it('вошедшего не трогаем', () => {
    expect(screenNeedsLogin('lessons', 'token')).toBe(false)
    expect(screenNeedsLogin('sat', 'token')).toBe(false)
  })
})
