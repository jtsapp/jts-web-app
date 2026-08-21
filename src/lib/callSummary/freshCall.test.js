import { describe, it, expect } from 'vitest'

import { NO_PREVIOUS_CALL, classifyCall } from './freshCall.js'

describe('classifyCall', () => {
  it('другой id, чем до разговора — это наш звонок', () => {
    expect(classifyCall('42', '41')).toEqual({ baseline: '41', fresh: true })
  })

  it('тот же id — звонок ещё не записан, ждём', () => {
    expect(classifyCall('41', '41')).toEqual({ baseline: '41', fresh: false })
  })

  it('до разговора звонков не было — любая строка наша', () => {
    expect(classifyCall('1', NO_PREVIOUS_CALL)).toEqual({
      baseline: NO_PREVIOUS_CALL,
      fresh: true,
    })
  })

  it('строки ещё нет — baseline не трогаем', () => {
    expect(classifyCall(null, '41')).toEqual({ baseline: '41', fresh: false })
    expect(classifyCall(undefined, NO_PREVIOUS_CALL)).toEqual({
      baseline: NO_PREVIOUS_CALL,
      fresh: false,
    })
  })

  describe('baseline неизвестен (предзапрос не прошёл)', () => {
    it('первую увиденную строку НЕ выдаём за свежую', () => {
      // Иначе ученик увидит разбор прошлого разговора как итог этого.
      expect(classifyCall('41', null)).toEqual({ baseline: '41', fresh: false })
    })

    it('но следующую, другую — уже да', () => {
      const first = classifyCall('41', null)
      expect(classifyCall('42', first.baseline)).toEqual({ baseline: '41', fresh: true })
    })
  })
})
