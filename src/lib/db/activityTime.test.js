// Запись активного времени: потолки и то, что день ставит сервер. БД не трогаем —
// подсовываем поддельный sql-тег и смотрим, что в него ушло.
import { describe, it, expect } from 'vitest'
import {
  CLIENT_TRACKED_MODULES,
  MAX_BATCH_SEC,
  DAY_CAP_SEC,
  isClientTrackedModule,
  clampBatchSeconds,
  utcDay,
  addActivitySeconds,
} from './activityTime.js'

describe('белый список модулей', () => {
  it('принимает только то, что сервер сам не меряет', () => {
    expect(CLIENT_TRACKED_MODULES).toEqual(['workbooks', 'vocabulary_sr'])
    expect(isClientTrackedModule('workbooks')).toBe(true)
    expect(isClientTrackedModule('vocabulary_sr')).toBe(true)
  })

  // Время тьютора и шэдоуинга уже лежит в своих таблицах: запись от клиента
  // дала бы двойной счёт и накрутку речи без звонка.
  it('не принимает тьютора и шэдоуинг', () => {
    expect(isClientTrackedModule('ai_tutor')).toBe(false)
    expect(isClientTrackedModule('shadowing')).toBe(false)
    expect(isClientTrackedModule('media_practice')).toBe(false)
    expect(isClientTrackedModule('')).toBe(false)
  })
})

describe('clampBatchSeconds', () => {
  it('режет пачку по потолку', () => {
    expect(clampBatchSeconds(61)).toBe(61)
    expect(clampBatchSeconds(10_000)).toBe(MAX_BATCH_SEC)
  })

  it('мусор, ноль и минус — ноль', () => {
    for (const bad of [0, -5, 'abc', null, undefined, NaN, Infinity]) {
      expect(`${bad} → ${clampBatchSeconds(bad)}`).toBe(`${bad} → 0`)
    }
  })

  it('дробь отбрасывает', () => {
    expect(clampBatchSeconds(59.9)).toBe(59)
  })
})

describe('utcDay', () => {
  // Позднний вечер в Алматы (UTC+5) — ещё прошлые сутки по UTC, как и в сводке.
  it('берёт дату по UTC, а не по часам сервера', () => {
    expect(utcDay(new Date('2026-09-10T02:30:00+05:00'))).toBe('2026-09-09')
  })
})

describe('addActivitySeconds', () => {
  function recorder(result = [{ seconds: 42 }]) {
    const calls = []
    const sql = (strings, ...values) => {
      calls.push({ q: strings.join('?'), values })
      return Promise.resolve(result)
    }
    return { sql, calls }
  }

  it('пишет пачку в сегодняшнюю строку и возвращает сумму за сутки', async () => {
    const { sql, calls } = recorder()
    const total = await addActivitySeconds('user-1', 'workbooks', 61, new Date('2026-09-11T08:00:00Z'), sql)
    expect(total).toBe(42)
    expect(calls).toHaveLength(1)
    expect(calls[0].values).toEqual(['user-1', 'workbooks', '2026-09-11', 61, DAY_CAP_SEC])
    expect(calls[0].q).toContain('on conflict (profile_id, module, day)')
  })

  it('пачку сверх потолка режет ещё до базы', async () => {
    const { sql, calls } = recorder()
    await addActivitySeconds('user-1', 'workbooks', 99_999, new Date('2026-09-11T08:00:00Z'), sql)
    expect(calls[0].values[3]).toBe(MAX_BATCH_SEC)
  })

  it('пустая пачка в базу не ходит', async () => {
    const { sql, calls } = recorder()
    expect(await addActivitySeconds('user-1', 'workbooks', 0, new Date(), sql)).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('без базы тихо ничего не делает', async () => {
    expect(await addActivitySeconds('user-1', 'workbooks', 60, new Date(), null)).toBeNull()
  })
})
