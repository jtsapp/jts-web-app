import { describe, it, expect, beforeEach } from 'vitest'
import { MAX_ERRORS, recordError, recentErrors, resetErrorLog } from './errorLog.js'

describe('кольцо сбоев вкладки', () => {
  beforeEach(() => resetErrorLog())

  it('пустой журнал — пустой массив', () => {
    expect(recentErrors()).toStrictEqual([])
  })

  it('не кладёт запись без текста', () => {
    recordError({ message: '   ' })
    expect(recentErrors()).toHaveLength(0)
  })

  it('отдаёт копии: правка снаружи журнал не портит', () => {
    recordError({ message: 'boom', source: 'a.js:1' })
    const a = recentErrors()
    a[0].message = 'changed'
    expect(recentErrors()[0].message).toBe('boom')
  })

  it('держит только последние MAX_ERRORS', () => {
    for (let i = 0; i < MAX_ERRORS + 5; i += 1) recordError({ message: `e${i}` })
    const got = recentErrors().map((e) => e.message)
    expect(got).toHaveLength(MAX_ERRORS)
    expect(got[0]).toBe('e5')
    expect(got.at(-1)).toBe(`e${MAX_ERRORS + 4}`)
  })
})
