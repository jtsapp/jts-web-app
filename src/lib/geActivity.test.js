import { describe, it, expect, vi } from 'vitest'
import { backendUserId, dayMinutes, geActivityKey, pushGeActivity } from './geActivity.js'

// Минуты дня уходят на бэкенд в план общего курса (спека 2026-10-13, секция 3): только вошедшим, только со служебным
// ключом, итогом дня, и сбой отправки не роняет запрос, который её вызвал.

// Заглушка sql-тега: на каждый из трёх запросов отдаёт свою строку по имени таблицы.
function fakeSql({ voice = 0, credits = 0, activity = [] } = {}) {
  return (strings) => {
    const q = strings.join('?')
    if (q.includes('voice_usage')) return Promise.resolve([{ seconds: voice }])
    if (q.includes('shadowing_assess')) return Promise.resolve([{ used: credits }])
    return Promise.resolve(activity)
  }
}

const env = { IELTS_GRADER_KEY: '﻿secret ' }

describe('geActivity', () => {
  it('ученик бэкенда — только из user-<id>', () => {
    expect(backendUserId('user-42')).toBe(42)
    expect(backendUserId('d2c1-device')).toBe(null)
    expect(backendUserId(null)).toBe(null)
  })

  it('ключ: свой важнее грейдерского, BOM срезается', () => {
    expect(geActivityKey(env)).toBe('secret')
    expect(geActivityKey({ GE_ACTIVITY_KEY: 'own', IELTS_GRADER_KEY: 'x' })).toBe('own')
    expect(geActivityKey({})).toBe('')
  })

  it('минуты дня: тьютор, кредиты шэдоуинга по 30 с, разделы activity_time', () => {
    expect(dayMinutes({ voiceSeconds: 750, shadowingCredits: 10, activitySeconds: { workbooks: 600, media_practice: 90, vocabulary_sr: 29 } }))
      .toEqual({ ai_tutor: 13, workbooks: 10, shadowing: 5, media_practice: 2, vocabulary_sr: 0 })
    expect(dayMinutes()).toEqual({ ai_tutor: 0, workbooks: 0, shadowing: 0, media_practice: 0, vocabulary_sr: 0 })
  })

  it('анониму и без ключа ничего не шлёт', async () => {
    const fetchImpl = vi.fn()
    expect(await pushGeActivity('device-1', '2026-10-14', { sql: fakeSql(), fetchImpl, env })).toEqual({ sent: false, reason: 'anonymous' })
    expect(await pushGeActivity('user-7', '2026-10-14', { sql: fakeSql(), fetchImpl, env: {} })).toEqual({ sent: false, reason: 'no_key' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('шлёт итог дня с ключом в заголовке', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const sql = fakeSql({ voice: 1200, credits: 4, activity: [{ module: 'workbooks', seconds: 300 }] })
    const out = await pushGeActivity('user-7', '2026-10-14', { sql, fetchImpl, env, backendUrl: 'https://b' })
    expect(out).toEqual({ sent: true })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://b/integrations/web/ge-activity')
    expect(init.method).toBe('PUT')
    expect(init.headers['X-Ge-Activity-Key']).toBe('secret')
    expect(JSON.parse(init.body)).toEqual({
      userId: 7,
      day: '2026-10-14',
      minutes: { ai_tutor: 20, workbooks: 5, shadowing: 2, media_practice: 0, vocabulary_sr: 0 },
    })
  })

  it('отказ бэкенда и обрыв сети — не исключение, а ответ', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = await pushGeActivity('user-7', '2026-10-14', { sql: fakeSql(), env, backendUrl: 'https://b', fetchImpl: async () => ({ ok: false, status: 404 }) })
    expect(bad).toEqual({ sent: false, reason: 'http_404' })
    const down = await pushGeActivity('user-7', '2026-10-14', {
      sql: fakeSql(),
      env,
      backendUrl: 'https://b',
      fetchImpl: async () => {
        throw new TypeError('fetch failed')
      },
    })
    expect(down).toEqual({ sent: false, reason: 'network' })
    warn.mockRestore()
  })
})
