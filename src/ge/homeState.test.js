import { describe, it, expect } from 'vitest'
import { goalBannerState, homeTopState, sayKey } from './homeState.js'

describe('homeTopState', () => {
  const p = (x) => ({ onboarded: false, route: null, ...x })
  it('нет профиля — прежняя «Главная»', () => {
    expect(homeTopState({ geProfile: null, levelUnknown: false, level: 'A2' })).toBe('legacy')
  })
  it('до анкеты роадмап закрыт до теста — и без уровня, и с уровнем; C1+ — финиш курса', () => {
    expect(homeTopState({ geProfile: p(), levelUnknown: true, level: 'A1' })).toBe('locked')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'A2' })).toBe('locked')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'C1' })).toBe('finish')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'C2' })).toBe('finish')
  })
  it('учившийся до теста v16: без блюра — карточка «тест не пройден»', () => {
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'A2', existing: true })).toBe('notTested')
    expect(homeTopState({ geProfile: p(), levelUnknown: true, level: 'A1', existing: true })).toBe('notTested')
    expect(homeTopState({ geProfile: p(), levelUnknown: false, level: 'C1', existing: true })).toBe('finish')
    // анкета заполнена — его блок цели не трогаем
    expect(homeTopState({ geProfile: p({ onboarded: true, route: 'group' }), levelUnknown: false, level: 'A2', existing: true })).toBe('goal')
  })
  it('после анкеты: тест, формат, блок цели', () => {
    expect(homeTopState({ geProfile: p({ onboarded: true }), levelUnknown: true, level: 'A1' })).toBe('needTest')
    expect(homeTopState({ geProfile: p({ onboarded: true }), levelUnknown: false, level: 'A2' })).toBe('needRoute')
    expect(homeTopState({ geProfile: p({ onboarded: true, route: 'group' }), levelUnknown: false, level: 'A2' })).toBe('goal')
  })
})

describe('goalBannerState', () => {
  it('цель достигнута важнее срока', () => {
    expect(goalBannerState({ deadline: { state: 'passed' }, journey: { reached: true }, fit: 'late' })).toEqual({
      reached: true,
      say: 'reached',
      title: 'reached',
    })
  })
  it('реплика по сроку и темпу', () => {
    expect(goalBannerState({ deadline: { state: 'none' }, journey: {}, fit: null }).say).toBe('noDate')
    expect(goalBannerState({ deadline: { state: 'tomorrow' }, journey: {}, fit: 'fits' }).say).toBe('tomorrow')
    expect(goalBannerState({ deadline: { state: 'days' }, journey: {}, fit: 'late' }).say).toBe('late')
    expect(goalBannerState({ deadline: { state: 'days' }, journey: {}, fit: 'spare' }).say).toBe('onTrack')
  })
  it('срок окном — заголовок «≈ месяц год»', () => {
    expect(goalBannerState({ deadline: { state: 'days', approximate: true }, journey: {}, fit: null }).title).toBe('approx')
    expect(goalBannerState({ deadline: { state: 'days', approximate: false }, journey: {}, fit: null }).title).toBe('days')
  })
  it('варианты реплики', () => {
    expect(sayKey('onTrack', 0)).toBe('geGoal.say.onTrack')
    expect(sayKey('onTrack', 0.99)).toBe('geGoal.say.onTrack.3')
    expect(sayKey('today', 0.99)).toBe('geGoal.say.today')
  })
})
