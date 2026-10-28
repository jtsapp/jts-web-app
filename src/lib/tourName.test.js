import { describe, it, expect } from 'vitest'
import { isTourName, parseTourKey, tourKeyFor, tourKeyForOwner } from './tourName.js'

describe('tourName', () => {
  it('ключ и разбор сходятся, вариант экрана — часть имени', () => {
    expect(parseTourKey(tourKeyFor('user-7', 'home'))).toEqual({ scope: 'home', owner: 'user-7', variant: null, name: 'home' })
    expect(parseTourKey(`${tourKeyFor('user-7', 'home')}:ge`)).toEqual({
      scope: 'home',
      owner: 'user-7',
      variant: 'ge',
      name: 'home:ge',
    })
    // Тьюторский тур — по умолчанию 'dash': его отметки ставились так с самого начала.
    expect(parseTourKey(tourKeyFor('dev-abc')).name).toBe('dash')
  })

  it('ключ без владельца и чужие ключи не разбираются — они остаются в браузере', () => {
    expect(parseTourKey('jts_tour_ielts_shadowing')).toBeNull()
    expect(parseTourKey('jts_level_goal:7')).toBeNull()
    expect(parseTourKey(null)).toBeNull()
  })

  it('тот же тур у другого владельца', () => {
    const parsed = parseTourKey('jts_tour_home:user-7:ge')
    expect(tourKeyForOwner(parsed, 'dev-abc')).toBe('jts_tour_home:dev-abc:ge')
    expect(tourKeyForOwner(parseTourKey('jts_tour_practice:user-7'), 'dev-abc')).toBe('jts_tour_practice:dev-abc')
  })

  it('имя тура для сервера — только то, что собирается из ключа', () => {
    for (const ok of ['home', 'home:ge', 'ge-plan', 'dash']) expect(isTourName(ok)).toBe(true)
    for (const bad of ['', 'Home', 'home:ge:x', 'a'.repeat(25), 'home page', 42, null]) expect(isTourName(bad)).toBe(false)
  })
})
