// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { PUSH_TO_TALK_DEFAULT, getPushToTalk, setPushToTalk } from './pushToTalk.js'

const KEY = 'jts:tutor:pushToTalk'

describe('настройка рации', () => {
  beforeEach(() => window.localStorage.clear())

  it('рация — режим по умолчанию, пока ученик ничего не выбирал', () => {
    expect(PUSH_TO_TALK_DEFAULT).toBe(true)
    expect(getPushToTalk()).toBe(true)
  })

  it('явное выключение уважаем — его пишет только сам ученик', () => {
    window.localStorage.setItem(KEY, '0')
    expect(getPushToTalk()).toBe(false)
  })

  it('выбор переживает чтение заново', () => {
    setPushToTalk(false)
    expect(window.localStorage.getItem(KEY)).toBe('0')
    expect(getPushToTalk()).toBe(false)
    setPushToTalk(true)
    expect(getPushToTalk()).toBe(true)
  })

  it('мусор в хранилище читается как умолчание, а не как выключение', () => {
    window.localStorage.setItem(KEY, 'yes')
    expect(getPushToTalk()).toBe(true)
  })
})
