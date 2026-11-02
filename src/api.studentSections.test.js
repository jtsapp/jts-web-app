// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMySections, getIeltsMe, getSatMeCached, EXAM_ACCESS_RECHECK_MS } from './api.js'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body })

describe('свежие настройки разделов', () => {
  it('не держит старый тариф в кэше и передаёт сигнал отмены в fetch', async () => {
    const first = { known: true, allowed: ['lessons'] }
    const second = { known: true, allowed: ['sat'] }
    const fetch = vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response(second))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    expect(await getMySections('sections-fresh', { signal })).toMatchObject(first)
    expect(await getMySections('sections-fresh')).toMatchObject(second)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][0]).toMatch(/\/cabinet\/my-sections$/)
    expect(fetch.mock.calls[0][1]).toMatchObject({ signal, headers: { Authorization: 'Bearer sections-fresh' } })
  })

  it.each([null, {}, { known: false }, { known: true, allowed: [42] }])('не маскирует некорректный ответ %j под отсутствие тарифа', async (body) => {
    vi.stubGlobal('fetch', vi.fn(async () => response(body)))
    await expect(getMySections('sections-invalid')).rejects.toThrow('Invalid section access')
  })

  it('ошибки HTTP и сети доходят до состояния ошибки меню', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({}, 503)).mockRejectedValueOnce(new TypeError('offline')))
    await expect(getMySections('sections-offline')).rejects.toMatchObject({ status: 503 })
    await expect(getMySections('sections-offline')).rejects.toThrow()
  })

  it('успешное обновление разделов сбрасывает кэш доступов IELTS/SAT', async () => {
    let purchased = true
    const fetch = vi.fn(async (url) => response(url.endsWith('/cabinet/my-sections')
      ? { known: true, allowed: ['ielts', 'sat'] } : { purchased }))
    vi.stubGlobal('fetch', fetch)
    const token = 'sections-exams'
    expect((await getIeltsMe(token)).purchased).toBe(true)
    expect((await getSatMeCached(token)).purchased).toBe(true)
    purchased = false
    await getMySections(token)
    expect((await getIeltsMe(token)).purchased).toBe(false)
    expect((await getSatMeCached(token)).purchased).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  it('тот же ответ разделов при опросе не перезапрашивает IELTS/SAT; изменение или срок — перезапрашивает', async () => {
    let allowed = ['ielts', 'sat']
    const fetch = vi.fn(async (url) => response(url.endsWith('/cabinet/my-sections') ? { known: true, allowed } : { purchased: true }))
    vi.stubGlobal('fetch', fetch)
    const token = 'sections-poll'
    const exams = async () => { await getIeltsMe(token); await getSatMeCached(token) }
    const examCalls = () => fetch.mock.calls.filter(([url]) => !url.endsWith('/cabinet/my-sections')).length
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)

    expect((await getMySections(token)).examsRechecked).toBe(true); await exams()
    expect(examCalls()).toBe(2)
    expect((await getMySections(token)).examsRechecked).toBeUndefined(); await exams()
    expect(examCalls()).toBe(2)

    allowed = ['ielts']
    await getMySections(token); await exams()
    expect(examCalls()).toBe(4)

    now.mockReturnValue(1_000_000 + EXAM_ACCESS_RECHECK_MS)
    await getMySections(token); await exams()
    expect(examCalls()).toBe(6)
  })
})
