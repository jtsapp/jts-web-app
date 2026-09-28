import { describe, it, expect, vi } from 'vitest'
import { listAssistantErrorReports, saveAssistantErrorReport } from './assistantErrorReports.js'

describe('saveAssistantErrorReport', () => {
  function recorder() {
    const calls = []
    const sql = (strings, ...values) => {
      calls.push({ q: strings.join('?'), values })
      return Promise.resolve()
    }
    sql.json = (v) => ({ json: v })
    return { sql, calls }
  }

  const row = {
    profileId: 'user-7',
    userId: 7,
    lang: 'ru',
    screenId: 'lesson-workspace',
    pageUrl: 'https://app.example/lesson/12',
    userAgent: 'Mozilla/5.0',
    userMessage: 'урок не открывается, белый экран',
    assistantSummary: 'Раздел: Урок\nкнопка «Начать» не отвечает',
    screenText: 'Начать урок',
    clientErrors: [{ at: 1, message: 'TypeError: x', source: 'app.js:10' }],
  }

  it('без sql не ходит в базу и не бросает', async () => {
    expect(await saveAssistantErrorReport(row, null)).toBe(false)
  })

  it('без сообщения ученика не пишет', async () => {
    const { sql, calls } = recorder()
    expect(await saveAssistantErrorReport({ ...row, userMessage: '' }, sql)).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('кладёт раздел, адрес, текст ученика и клиентские сбои', async () => {
    const { sql, calls } = recorder()
    expect(await saveAssistantErrorReport(row, sql)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].q).toMatch(/insert into assistant_error_reports/)
    expect(calls[0].values).toEqual([
      'user-7',
      7,
      'ru',
      'lesson-workspace',
      'https://app.example/lesson/12',
      'Mozilla/5.0',
      'урок не открывается, белый экран',
      'Раздел: Урок\nкнопка «Начать» не отвечает',
      'Начать урок',
      { json: row.clientErrors },
    ])
  })

  it('падение INSERT — false, без исключения наружу', async () => {
    const sql = () => Promise.reject(new Error('db down'))
    sql.json = (v) => v
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await saveAssistantErrorReport(row, sql)).toBe(false)
    errSpy.mockRestore()
  })
})

describe('listAssistantErrorReports', () => {
  it('без sql — пустой список, не бросает', async () => {
    expect(await listAssistantErrorReports({}, null)).toEqual({ items: [], total: 0 })
  })

  it('отдаёт свежие сверху и человеческое имя раздела', async () => {
    const calls = []
    const sql = (strings, ...values) => {
      calls.push({ q: strings.join('?'), values })
      if (strings.join('?').includes('count(*)')) return Promise.resolve([{ total: 1 }])
      return Promise.resolve([{
        id: 9,
        created_at: new Date('2026-09-28T06:00:00Z'),
        profile_id: 'user-7',
        user_id: 7,
        lang: 'ru',
        screen_id: 'lesson-workspace',
        page_url: 'https://app.example/lesson/12',
        user_agent: 'Mozilla/5.0',
        user_message: 'белый экран',
        assistant_summary: 'Раздел: Урок',
        screen_text: 'Начать урок',
        client_errors: [{ message: 'ChunkLoadError' }],
      }])
    }
    const got = await listAssistantErrorReports({ limit: 10, offset: 0 }, sql)
    expect(got.total).toBe(1)
    expect(got.items[0]).toMatchObject({
      id: 9,
      userId: 7,
      screenId: 'lesson-workspace',
      screenName: 'Урок',
      userMessage: 'белый экран',
      assistantSummary: 'Раздел: Урок',
    })
    expect(got.items[0].createdAt).toBe('2026-09-28T06:00:00.000Z')
    expect(calls[1].q).toContain('order by created_at desc')
  })

  it('поиск идёт в ilike, без % из запроса', async () => {
    const calls = []
    const sql = (strings, ...values) => {
      calls.push({ q: strings.join('?'), values })
      if (strings.join('?').includes('count(*)')) return Promise.resolve([{ total: 0 }])
      return Promise.resolve([])
    }
    await listAssistantErrorReports({ q: 'белый%экран' }, sql)
    expect(calls[0].values).toContain('%белыйэкран%')
  })
})
