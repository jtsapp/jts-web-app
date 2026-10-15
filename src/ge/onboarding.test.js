import { describe, it, expect } from 'vitest'
import { formFromProfile, nextAfterSave, onboardingBody, recommendedTarget, stepReady, stepsFor, targetTiles } from './onboarding.js'

describe('stepsFor', () => {
  it('без уровня пять шагов, с уровнем четыре, правка — три', () => {
    expect(stepsFor({ levelKnown: false, edit: false })).toEqual(['purpose', 'target', 'deadline', 'daily', 'start'])
    expect(stepsFor({ levelKnown: true, edit: false })).toEqual(['purpose', 'target', 'deadline', 'daily'])
    expect(stepsFor({ levelKnown: true, edit: true })).toEqual(['target', 'deadline', 'daily'])
  })
})

describe('targetTiles', () => {
  it('A0–C1; A0 и всё не выше уровня неактивны', () => {
    const tiles = targetTiles('A2')
    expect(tiles.map((x) => x.code)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'])
    expect(tiles.filter((x) => x.enabled).map((x) => x.code)).toEqual(['B1', 'B2', 'C1'])
    expect(tiles.find((x) => x.code === 'A2').mark).toBe('current')
    expect(tiles.find((x) => x.code === 'A1').mark).toBe('passed')
  })
  it('без уровня закрыт только A0', () => {
    expect(targetTiles(null).filter((x) => !x.enabled).map((x) => x.code)).toEqual(['A0'])
  })
})

describe('recommendedTarget', () => {
  it('по цели, но выше текущего уровня', () => {
    expect(recommendedTarget('work', 'A2')).toBe('B2')
    expect(recommendedTarget('travel', null)).toBe('B1')
    expect(recommendedTarget('travel', 'B1')).toBe('B2')
    expect(recommendedTarget('work', 'B2')).toBe('C1')
    expect(recommendedTarget('work', 'C1')).toBe(null)
  })
})

describe('stepReady / onboardingBody / nextAfterSave', () => {
  it('срок с датой требует саму дату', () => {
    expect(stepReady('deadline', { window: 'date' })).toBe(false)
    expect(stepReady('deadline', { window: 'date', date: '2027-01-01' })).toBe(true)
    expect(stepReady('deadline', { window: '3-6m' })).toBe(true)
    expect(stepReady('daily', { daily: 45 })).toBe(false)
  })
  it('тело PUT', () => {
    expect(onboardingBody({ purpose: 'work', target: 'B2', window: '3-6m', daily: 30, start: 'some' })).toEqual({
      purpose: 'work',
      targetLevel: 'B2',
      deadlineDate: null,
      deadlineWindow: '3-6m',
      dailyMinutes: 30,
      startMode: 'some',
    })
    expect(onboardingBody({ purpose: 'self', target: 'A2', window: 'date', date: '2027-02-01', daily: 15 }).deadlineDate).toBe('2027-02-01')
  })
  it('после сохранения: тест только тем, у кого уровня нет и кто не с нуля', () => {
    expect(nextAfterSave({ edit: false, levelKnown: false, start: 'some' })).toBe('test')
    expect(nextAfterSave({ edit: false, levelKnown: false, start: 'zero' })).toBe('route')
    expect(nextAfterSave({ edit: false, levelKnown: true, start: null })).toBe('route')
    expect(nextAfterSave({ edit: true, levelKnown: true, start: null })).toBe('route')
  })
  it('прошлые ответы: недостижимую уже цель не подставляем', () => {
    const p = { purpose: 'work', targetLevel: 'B1', deadlineWindow: 'none', deadlineDate: null, dailyMinutes: 60, startMode: 'some' }
    expect(formFromProfile(p, 'A2').target).toBe('B1')
    expect(formFromProfile(p, 'B1').target).toBe(null)
    expect(formFromProfile(p, 'A2').daily).toBe(60)
  })
})
