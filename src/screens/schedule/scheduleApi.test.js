import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMyLessonOccurrences,
  getLessonsSummary,
  getTrialRequestState,
  requestTrialLesson,
} from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ lessonId: 14 }] }))
})

describe('schedule api', () => {
  it('getMyLessonOccurrences GETs /admin/lessons/occurrences with a Bearer token', async () => {
    const data = await getMyLessonOccurrences('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/occurrences')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data).toEqual([{ lessonId: 14 }])
  })

  it('getLessonsSummary GETs /admin/lessons/summary with a Bearer token', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 }) }))
    const data = await getLessonsSummary('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/summary')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data.remaining).toBe(1)
  })
})

// Обёртки заявки на пробный урок исполнялись ровно нулём тестов: экранные тесты
// мокают api.js целиком, а e2e-стаб отдавал «преподаватель есть» — карточка не
// рисовалась, POST не уходил, и сломанный GET проглотил бы .catch(() => null).
// Спека осталась бы зелёной при любом промахе в пути, методе или разборе ответа.
describe('trial request api', () => {
  const backendState = {
    requested: true, requestedAt: '2026-08-30T12:00:00', teacherAssigned: false, managerAssigned: true,
  }

  it('getTrialRequestState GETs /mobile/trial-request with a Bearer token', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => backendState }))
    const data = await getTrialRequestState('TOK')
    const [url, opts] = global.fetch.mock.calls[0]

    expect(String(url)).toContain('/mobile/trial-request')
    expect(opts?.method ?? 'GET').toBe('GET')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data).toEqual(backendState)
  })

  it('requestTrialLesson POSTs to the same path', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => backendState }))
    const data = await requestTrialLesson('TOK')
    const [url, opts] = global.fetch.mock.calls[0]

    expect(String(url)).toContain('/mobile/trial-request')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data.requested).toBe(true)
  })

  // Экран читает четыре поля и решает по ним, что показать. Ответ без них —
  // это «ничего не просил, преподавателя нет», а не undefined в разметке.
  it('пустой ответ бэкенда превращается в полное состояние, а не в дыры', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    const data = await getTrialRequestState('TOK')

    expect(data).toEqual({
      requested: false, requestedAt: null, teacherAssigned: false, managerAssigned: false,
    })
  })
})
