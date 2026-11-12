// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { clearFinishedAttempt, storageKey, storageNs } from './freshAttempt.js'

// Обратная связь 11.11: пересдача теста уровня с «Результатов теста» начинает тест с первого экрана.
describe('freshAttempt', () => {
  beforeEach(() => localStorage.clear())

  const put = (ns, app) => localStorage.setItem(storageKey(ns), JSON.stringify({ lang: 'ru', app }))

  it('ключ — как у патча storage-ns сборки v16', () => {
    expect(storageKey(storageNs('user-42'))).toBe('jts_placement_ui_v11:user-42')
    expect(storageNs('a b/c')).toBe('abc')
  })

  it('законченный прогон убирается — тест начнётся заново', () => {
    put('user-1', { v: 11, screen: 'result', completedNotified: true })
    put('user-2', { v: 11, screen: 'speaking', completedByUser: true })
    expect(clearFinishedAttempt('user-1')).toBe(true)
    expect(clearFinishedAttempt('user-2')).toBe(true)
    expect(localStorage.getItem(storageKey('user-1'))).toBeNull()
    expect(localStorage.getItem(storageKey('user-2'))).toBeNull()
  })

  it('незаконченный прогон и чужой профиль не трогаются', () => {
    put('user-1', { v: 11, screen: 'question' })
    put('user-2', { v: 11, screen: 'result', completedNotified: true })
    expect(clearFinishedAttempt('user-1')).toBe(false)
    expect(localStorage.getItem(storageKey('user-1'))).not.toBeNull()
    expect(localStorage.getItem(storageKey('user-2'))).not.toBeNull()
  })

  it('пусто или битая запись — ничего не ломается', () => {
    expect(clearFinishedAttempt('user-9')).toBe(false)
    localStorage.setItem(storageKey('user-9'), '{oops')
    expect(clearFinishedAttempt('user-9')).toBe(false)
  })
})
