import { describe, it, expect } from 'vitest'
import { errorText, isQuotaError, usageRows } from './examQuota.js'

const t = (k, v) => (k === 'exam.quota.type.SAT_PRACTICE' ? `practice ${v.n}` : k)

describe('квоты экзаменов (E2)', () => {
  it('исчерпание — по code, а не по 403: замок доступа квотой не считается', () => {
    expect(isQuotaError({ status: 403, code: 'CONTENT_QUOTA_EXCEEDED' })).toBe(true)
    expect(isQuotaError({ status: 403, serverMessage: 'Нет доступа' })).toBe(false)
    expect(isQuotaError({ status: 429 })).toBe(true)
    expect(isQuotaError({ status: 500 })).toBe(false)
    expect(isQuotaError(null)).toBe(false)
  })

  it('текст: сервера, иначе по типу контента, иначе общий', () => {
    expect(errorText({ status: 403, code: 'CONTENT_QUOTA_EXCEEDED', serverMessage: 'Лимит 30' }, t)).toBe('Лимит 30')
    expect(errorText({ status: 403, code: 'CONTENT_QUOTA_EXCEEDED', contentType: 'SAT_PRACTICE', limit: 30 }, t)).toBe('practice 30')
    expect(errorText({ status: 403, code: 'CONTENT_QUOTA_EXCEEDED', contentType: 'X' }, t)).toBe('exam.quota.text')
    expect(errorText({ status: 403, code: 'CONTENT_QUOTA_EXCEEDED', demoExpired: true }, t)).toBe('exam.quota.expired')
    expect(errorText({ status: 500 }, t)).toBe('sat.study.netError')
    expect(errorText({ status: 400, serverMessage: 'Плохо' }, t)).toBe('Плохо')
  })

  it('плашка: только ограниченные типы, остаток считается, если сервер не прислал', () => {
    expect(usageRows([
      { contentType: 'SAT_PRACTICE', limit: 30, used: 12 },
      { contentType: 'SAT_MOCK', limit: null, used: 0 },
      { contentType: 'SAT_WEEKLY', limit: 1, used: 1, remaining: 0 },
    ]).map((r) => [r.contentType, r.remaining])).toEqual([['SAT_PRACTICE', 18], ['SAT_WEEKLY', 0]])
    expect(usageRows(null)).toEqual([])
  })
})
