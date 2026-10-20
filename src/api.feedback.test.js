// @vitest-environment jsdom
// Ручки отчётов о прогрессе. Веб выходит раньше бэкенда: пока ручки нет,
// карточка «Главной» спрашивала бы её на каждом заходе — 404 поэтому помнится.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import {
  getFeedbackReports, getFeedbackReport, markFeedbackReportSeen,
  getFeedbackReportByToken, markFeedbackReportOpened,
} from './api.js'

function answerWith(status, body = {}) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => '',
  }))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('кабинет ученика', () => {
  it('список — Bearer в /mobile/feedback-reports', async () => {
    answerWith(200, [{ id: 1 }])
    await expect(getFeedbackReports('t-ok')).resolves.toEqual([{ id: 1 }])
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/mobile\/feedback-reports$/)
    expect(opts.headers.Authorization).toBe('Bearer t-ok')
  })

  it('404 помнится 10 минут — «Главная» не дёргает бэкенд на каждом заходе', async () => {
    answerWith(404)
    await expect(getFeedbackReports('t-404')).rejects.toMatchObject({ status: 404 })
    await expect(getFeedbackReports('t-404')).rejects.toMatchObject({ status: 404 })
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1)
    answerWith(200, [])
    await expect(getFeedbackReports('t-404')).resolves.toEqual([])
  })

  it('5xx не запоминается: следующий заход спросит снова', async () => {
    answerWith(500)
    await expect(getFeedbackReports('t-500')).rejects.toMatchObject({ status: 500 })
    answerWith(200, [{ id: 3 }])
    await expect(getFeedbackReports('t-500')).resolves.toEqual([{ id: 3 }])
  })

  it('отчёт и отметка «просмотрен»', async () => {
    answerWith(200, { id: 7 })
    await getFeedbackReport('t', 7)
    expect(fetch.mock.calls[0][0]).toMatch(/\/mobile\/feedback-reports\/7$/)
    answerWith(204)
    await markFeedbackReportSeen('t', 7)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/mobile\/feedback-reports\/7\/seen$/)
    expect(opts.method).toBe('POST')
  })
})

describe('ссылка из мессенджера', () => {
  it('GET без авторизации, токен в пути экранирован', async () => {
    answerWith(200, { id: 1 })
    await getFeedbackReportByToken('a/b')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/feedback-reports\/link\/a%2Fb$/)
    expect(opts?.headers?.Authorization).toBeUndefined()
  })

  it('404 — ошибка со статусом, сеть — status 0', async () => {
    answerWith(404)
    await expect(getFeedbackReportByToken('x')).rejects.toMatchObject({ status: 404 })
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(getFeedbackReportByToken('x')).rejects.toMatchObject({ status: 0 })
  })

  it('«открыт» — отдельный POST', async () => {
    answerWith(204)
    await markFeedbackReportOpened('tok')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/feedback-reports\/link\/tok\/opened$/)
    expect(opts.method).toBe('POST')
  })
})
