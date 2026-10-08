import { describe, it, expect, vi } from 'vitest'
import {
  listAssistantErrorReports,
  saveAssistantErrorReport,
  updateAssistantErrorReport,
  deleteAssistantErrorReport,
} from './assistantErrorReports.js'

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

  it('updateLatest при свежей строке — UPDATE, не вторая карточка', async () => {
    const calls = []
    const sql = (strings, ...values) => {
      calls.push({ q: strings.join('?'), values })
      if (strings.join('?').includes('update assistant_error_reports')) {
        return Promise.resolve([{ id: 9 }])
      }
      return Promise.resolve()
    }
    sql.json = (v) => ({ json: v })
    expect(await saveAssistantErrorReport({
      ...row,
      updateLatest: true,
      userMessage: 'Ученик: На сайте ошибка\n\nУченик: аудио обрывается',
    }, sql)).toBe(true)
    expect(calls[0].q).toMatch(/update assistant_error_reports/)
    expect(calls.some((c) => c.q.includes('insert into assistant_error_reports'))).toBe(false)
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

describe('updateAssistantErrorReport / deleteAssistantErrorReport', () => {
  function fake(rowsFor = {}) {
    const calls = []
    const sql = (strings, ...values) => {
      const q = strings.join('?')
      calls.push({ q, values })
      if (q.includes('update assistant_error_reports')) return Promise.resolve(rowsFor.update ?? [{ id: 7 }])
      if (q.includes('delete from')) return Promise.resolve(rowsFor.delete ?? [{ id: 7 }])
      return Promise.resolve(rowsFor.select ?? [{
        id: 7, created_at: new Date('2026-09-28T06:00:00Z'), profile_id: 'user-7', user_id: 7,
        user_message: 'м', assistant_summary: 'новый', client_errors: [],
        note: 'взяли в работу', note_author_name: 'Алия', note_updated_at: new Date('2026-10-02T10:00:00Z'),
        edited_at: new Date('2026-10-02T10:00:00Z'),
      }])
    }
    return { sql, calls }
  }

  it('без sql — no_db, не бросает', async () => {
    expect(await updateAssistantErrorReport(7, { note: 'x' }, {}, null)).toEqual({ ok: false, reason: 'no_db' })
    expect(await deleteAssistantErrorReport(7, null)).toBe('no_db')
  })

  it('правка текста ставит edited_at и возвращает карточку с примечанием', async () => {
    const { sql, calls } = fake()
    const res = await updateAssistantErrorReport(7, { summary: '  новый  ' }, { name: 'Алия' }, sql)
    expect(res.ok).toBe(true)
    expect(calls[0].q).toMatch(/set assistant_summary = \?, edited_at = now\(\)/)
    expect(calls[0].values).toEqual(['новый', 7])
    expect(res.item).toMatchObject({ id: 7, note: 'взяли в работу', noteAuthorName: 'Алия' })
    expect(res.item.editedAt).toBe('2026-10-02T10:00:00.000Z')
  })

  it('примечание подписывается автором; пустое — стирает вместе с подписью', async () => {
    const { sql, calls } = fake()
    await updateAssistantErrorReport(7, { note: ' передали разработчикам ' }, { name: 'Алия' }, sql)
    expect(calls[0].values.slice(0, 2)).toEqual(['передали разработчикам', 'Алия'])
    expect(calls[0].values[2]).toBeInstanceOf(Date)

    const cleared = fake()
    await updateAssistantErrorReport(7, { note: '   ' }, { name: 'Алия' }, cleared.sql)
    expect(cleared.calls[0].values.slice(0, 3)).toEqual([null, null, null])
  })

  it('пустое описание и пустая правка — invalid, в базу не ходим', async () => {
    const { sql, calls } = fake()
    expect(await updateAssistantErrorReport(7, { summary: '  ' }, {}, sql)).toEqual({ ok: false, reason: 'invalid' })
    expect(await updateAssistantErrorReport(7, {}, {}, sql)).toEqual({ ok: false, reason: 'invalid' })
    expect(await updateAssistantErrorReport('abc', { note: 'x' }, {}, sql)).toEqual({ ok: false, reason: 'invalid' })
    expect(calls).toHaveLength(0)
  })

  it('нет такой записи — not_found', async () => {
    const { sql } = fake({ update: [] })
    expect(await updateAssistantErrorReport(7, { note: 'x' }, {}, sql)).toEqual({ ok: false, reason: 'not_found' })
  })

  it('delete: удалил / не нашёл / упало', async () => {
    expect(await deleteAssistantErrorReport(7, fake().sql)).toBe('deleted')
    expect(await deleteAssistantErrorReport(7, fake({ delete: [] }).sql)).toBe('not_found')
    expect(await deleteAssistantErrorReport(0, fake().sql)).toBe('invalid')
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await deleteAssistantErrorReport(7, () => Promise.reject(new Error('down')))).toBe('failed')
    errSpy.mockRestore()
  })
})