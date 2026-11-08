// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROACTIVE, PROACTIVE_KEY, readProactiveLevel, writeProactiveLevel } from './proactiveSetting.js'

describe('«Подсказки Луны» — на устройстве', () => {
  beforeEach(() => {
    localStorage.clear()
    writeProactiveLevel(DEFAULT_PROACTIVE)
  })

  it('по умолчанию — «часто», как в ТЗ', () => {
    expect(DEFAULT_PROACTIVE).toBe('often')
    expect(readProactiveLevel()).toBe('often')
    expect(localStorage.getItem(PROACTIVE_KEY)).toBe(null)
  })

  it('выбор запоминается; мусор — значение по умолчанию', () => {
    writeProactiveLevel('manual')
    expect(localStorage.getItem(PROACTIVE_KEY)).toBe('manual')
    expect(readProactiveLevel()).toBe('manual')
    writeProactiveLevel('громко')
    expect(readProactiveLevel()).toBe('often')
  })
})
