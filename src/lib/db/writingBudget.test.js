// Чистая математика ключей бюджета Writing — без БД. Границы года выбраны не
// случайно: ISO-неделя определяется четвергом, и именно конец декабря / начало
// января ловит ошибку «неделя от 1 января», а dayKey/nextDayResetAt обязаны
// жить в UTC — локальная таймзона сервера сдвинула бы момент сброса лимита.

import { describe, it, expect } from 'vitest'
import {
  isoWeekKey,
  nextWeekResetAt,
  dayKey,
  nextDayResetAt,
  WEEKLY_CHECK_LIMIT,
  DEMO_WEEKLY_CHECK_LIMIT,
  DAILY_TRANSLATE_LIMIT,
  DEMO_DAILY_TRANSLATE_LIMIT,
  checkLimitFor,
  translateLimitFor,
  checkBudgetPayload,
  translateBudgetPayload,
  checkBudget,
  consumeCheck,
  translateBudget,
  consumeTranslate,
} from './writingBudget.js'

// Фейковый sql-таг: повторяет в памяти семантику атомарного consume (включая
// то, что путь INSERT лимит не проверяет), чтобы проверить JS-контракт обёрток —
// какой потолок подставлен и что возвращается. Точность самого SQL — на
// Postgres. По образцу makeFakeSql из tests/shadowing-budget.spec.js.
function makeFakeSql(store = {}) {
  const tag = async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    const table = q.includes('writing_assess') ? 'assess' : 'translate'
    const [profileId, key] = vals
    const k = `${table}|${profileId}|${key}`
    if (q.includes('insert into')) {
      const limit = vals[vals.length - 1]
      if (store[k] === undefined) {
        store[k] = 1 // первая запись периода: лимит не проверяется, но 1 <= любого потолка
        return [{ used: 1 }]
      }
      if (store[k] + 1 <= limit) {
        store[k] += 1
        return [{ used: store[k] }]
      }
      return [] // WHERE false → 0 строк → отказ
    }
    if (q.includes('select used from')) {
      return store[k] === undefined ? [] : [{ used: store[k] }]
    }
    return []
  }
  tag.store = store
  return tag
}

describe('isoWeekKey (реэкспорт из shadowingBudget)', () => {
  it('1 января, попавшее в неделю с четвергом того же года — W01', () => {
    // 2026-01-01 — четверг, значит вся неделя принадлежит 2026 году.
    expect(isoWeekKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-W01')
  })

  it('1 января в хвосте недели прошлого года — неделя прошлого года', () => {
    // 2023-01-01 — воскресенье: четверг этой недели — 29.12.2022 → 2022-W52.
    expect(isoWeekKey(new Date(Date.UTC(2023, 0, 1)))).toBe('2022-W52')
  })

  it('год с 53 неделями: 1 января пятницы уходит в W53 прошлого года', () => {
    // 2021-01-01 — пятница: четверг недели — 31.12.2020 → 2020-W53.
    expect(isoWeekKey(new Date(Date.UTC(2021, 0, 1)))).toBe('2020-W53')
  })

  it('31 декабря года, начавшегося с четверга — своя W53', () => {
    // 2026-12-31 — четверг, 2026 не високосный и стартовал четвергом → 53 недели.
    expect(isoWeekKey(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-W53')
  })
})

describe('nextWeekResetAt (реэкспорт из shadowingBudget)', () => {
  it('среди недели — ближайший понедельник 00:00 UTC', () => {
    // 2026-08-27 — четверг → понедельник 31.08.
    expect(nextWeekResetAt(new Date(Date.UTC(2026, 7, 27, 15, 30)))).toBe(
      '2026-08-31T00:00:00.000Z',
    )
  })

  it('в сам понедельник — СЛЕДУЮЩИЙ понедельник, не сегодняшний', () => {
    expect(nextWeekResetAt(new Date(Date.UTC(2026, 7, 31, 0, 0)))).toBe(
      '2026-09-07T00:00:00.000Z',
    )
  })
})

describe('dayKey', () => {
  it('UTC-дата с нулями в месяце и дне', () => {
    expect(dayKey(new Date(Date.UTC(2026, 2, 5, 9, 0)))).toBe('2026-03-05')
  })

  it('последняя минута года остаётся в старом году (UTC, не локаль)', () => {
    expect(dayKey(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12-31')
  })

  it('полночь UTC — уже новый день и новый год', () => {
    expect(dayKey(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01-01')
  })
})

describe('nextDayResetAt', () => {
  it('среди дня — ближайшая полночь UTC', () => {
    expect(nextDayResetAt(new Date('2026-08-27T15:30:00Z'))).toBe(
      '2026-08-28T00:00:00.000Z',
    )
  })

  it('граница года: 31 декабря сбрасывается 1 января следующего года', () => {
    expect(nextDayResetAt(new Date('2026-12-31T23:59:59Z'))).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })

  it('ровно в полночь — сброс в СЛЕДУЮЩУЮ полночь, не в текущую', () => {
    expect(nextDayResetAt(new Date('2026-08-27T00:00:00Z'))).toBe(
      '2026-08-28T00:00:00.000Z',
    )
  })
})

// ---------------------------------------------------------------------------
// Демо-лимиты: у демо-аккаунта свои потолки, и показываются/списываются они
// одним и тем же значением (иначе клиенту видно «осталось 0 из 10» там, где
// потолок 3).
// ---------------------------------------------------------------------------

describe('выбор лимита по демо-статусу', () => {
  it('проверки письма: 10 обычному, 3 демо', () => {
    expect(WEEKLY_CHECK_LIMIT).toBe(10)
    expect(DEMO_WEEKLY_CHECK_LIMIT).toBe(3)
    expect(checkLimitFor(false)).toBe(10)
    expect(checkLimitFor(true)).toBe(3)
  })

  it('переводы фрагмента: 100 в день обычному, 20 демо', () => {
    expect(DAILY_TRANSLATE_LIMIT).toBe(100)
    expect(DEMO_DAILY_TRANSLATE_LIMIT).toBe(20)
    expect(translateLimitFor(false)).toBe(100)
    expect(translateLimitFor(true)).toBe(20)
  })

  it('отсутствие флага — обычный потолок (аноним демо-аккаунтом не бывает)', () => {
    expect(checkLimitFor(undefined)).toBe(10)
    expect(translateLimitFor(undefined)).toBe(100)
  })
})

describe('клиенту отдаётся ВЫБРАННЫЙ лимит', () => {
  it('демо видит свой потолок проверок и остаток по нему', () => {
    expect(checkBudgetPayload(2, true)).toMatchObject({ limit: 3, used: 2, remaining: 1 })
  })

  it('обычный аккаунт видит десятку', () => {
    expect(checkBudgetPayload(2, false)).toMatchObject({ limit: 10, used: 2, remaining: 8 })
  })

  it('остаток не уходит в минус, если used выше потолка', () => {
    expect(checkBudgetPayload(5, true).remaining).toBe(0)
  })

  it('переводы: тот же выбор лимита, но дневной сброс', () => {
    const demo = translateBudgetPayload(1, true)
    expect(demo).toMatchObject({ limit: 20, used: 1, remaining: 19 })
    expect(demo.resetsAt).toBe(nextDayResetAt(new Date()))
    expect(translateBudgetPayload(1, false).limit).toBe(100)
  })

  it('без метрирования (used == null) — null, а не нули', () => {
    expect(checkBudgetPayload(null, true)).toBeNull()
    expect(translateBudgetPayload(null, false)).toBeNull()
  })
})

describe('списание отсекает по тому же лимиту', () => {
  it('демо: три проверки проходят, четвёртая — отказ', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 3; i++) expect(await consumeCheck('user-1', true, sql)).toBe(i)
    expect(await consumeCheck('user-1', true, sql)).toBeNull()
    // Показанный остаток совпадает с тем, по чему отсекли.
    expect(await checkBudget('user-1', true, sql)).toMatchObject({ limit: 3, used: 3, remaining: 0 })
  })

  it('обычному аккаунту те же три проверки лимит не закрывают', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 10; i++) expect(await consumeCheck('user-2', false, sql)).toBe(i)
    expect(await consumeCheck('user-2', false, sql)).toBeNull() // 11-я
    expect(await checkBudget('user-2', false, sql)).toMatchObject({ limit: 10, used: 10 })
  })

  it('переводы демо: двадцатый проходит, двадцать первый — отказ', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 20; i++) expect(await consumeTranslate('user-3', true, sql)).toBe(i)
    expect(await consumeTranslate('user-3', true, sql)).toBeNull()
    expect(await translateBudget('user-3', true, sql)).toMatchObject({ limit: 20, remaining: 0 })
  })

  it('без БД (sql=null) — метрирования нет, а не отказ', async () => {
    expect(await consumeCheck('user-1', true, null)).toBeNull()
    expect(await checkBudget('user-1', true, null)).toBeNull()
    expect(await consumeTranslate('user-1', true, null)).toBeNull()
    expect(await translateBudget('user-1', true, null)).toBeNull()
  })
})
