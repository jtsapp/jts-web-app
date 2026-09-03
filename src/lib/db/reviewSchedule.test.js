// Расписание повторений: что происходит со строкой review_item, когда её
// показали тьютору (touchServedReviews) и когда тьютор всё-таки отчитался
// (reviewItem). Обе функции проверяются на фейковом sql-таге — по образцу
// makeFakeSql из writingBudget.test.js: точность самого SQL остаётся на
// Postgres, здесь проверяется JS-контракт (какая коробка, какой интервал).

import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = { rows: [], updates: [] }

// Фейк повторяет ровно те запросы, которые шлют эти две функции.
const fakeSql = (strings, ...vals) => {
  const q = strings.join(' ').replace(/\s+/g, ' ').trim().toLowerCase()
  if (q.includes('select id, box, serves')) {
    const keys = vals[1]
    return Promise.resolve(store.rows.filter((r) => keys.includes(r.item_key)))
  }
  if (q.includes('select id, box, item, item_key')) {
    return Promise.resolve(store.rows)
  }
  if (q.startsWith('update review_item')) {
    // Порядок плейсхолдеров повторяет порядок в исходнике обеих функций.
    store.updates.push({ query: q, vals })
    return Promise.resolve([])
  }
  return Promise.resolve([])
}

vi.mock('./sql.js', () => ({
  getSql: () => fakeSql,
  isDbConfigured: () => true,
}))

const { touchServedReviews, reviewItem } = await import('./profile.js')

const ITEM =
  'wrong tense in response: I don\'t. → No, I didn\'t. / Yes, I did. (When someone asks a Past Simple question with "did", answer with "did" too.)'

function seed(overrides = {}) {
  store.rows = [
    { id: 'r1', box: 0, serves: 0, item: ITEM, item_key: ITEM.toLowerCase(), ...overrides },
  ]
  store.updates = []
}

describe('touchServedReviews', () => {
  beforeEach(() => seed())

  it('показ отодвигает следующий показ — строка не возвращается в тот же день', async () => {
    await touchServedReviews('user-114', [ITEM])
    expect(store.updates).toHaveLength(1)
    const [box, serves, days] = store.updates[0].vals
    expect(box).toBe(0) // коробка ещё не двигается
    expect(serves).toBe(1)
    expect(days).toBe(1) // LEITNER_DAYS[0] — сутки паузы вместо «каждый звонок»
  })

  it('после третьего показа без ответа коробка двигается сама', async () => {
    seed({ serves: 2 })
    await touchServedReviews('user-114', [ITEM])
    const [box, serves, days] = store.updates[0].vals
    expect(box).toBe(1)
    expect(serves).toBe(0) // счётчик сброшен под новую коробку
    expect(days).toBe(3) // LEITNER_DAYS[1]
  })

  it('коробка не уезжает выше последней ступени лестницы', async () => {
    seed({ box: 4, serves: 2 })
    await touchServedReviews('user-114', [ITEM])
    const [box, , days] = store.updates[0].vals
    expect(box).toBe(4)
    expect(days).toBe(60)
  })

  it('пустой список и мусор ничего не пишут', async () => {
    await touchServedReviews('user-114', [])
    await touchServedReviews('user-114', ['   ', null, undefined])
    await touchServedReviews('user-114', null)
    expect(store.updates).toHaveLength(0)
  })

  it('чужую строку не трогает', async () => {
    await touchServedReviews('user-114', ['совершенно другая ошибка'])
    expect(store.updates).toHaveLength(0)
  })
})

describe('reviewItem', () => {
  beforeEach(() => seed())

  it('находит строку по короткому ярлыку, а не только по точному тексту', async () => {
    // Раньше здесь стоял LIKE в обе стороны и промахивался: «questions» ≠ «question».
    await reviewItem('user-114', 'Past Simple questions with did', true)
    expect(store.updates).toHaveLength(1)
    const [box, lapses, days] = store.updates[0].vals
    expect(box).toBe(1) // верный ответ — ступень вверх
    expect(lapses).toBe(0)
    expect(days).toBe(3)
  })

  it('неверный ответ роняет в нулевую коробку', async () => {
    seed({ box: 3 })
    await reviewItem('user-114', ITEM, false)
    const [box, lapses, days] = store.updates[0].vals
    expect(box).toBe(0)
    expect(lapses).toBe(1)
    expect(days).toBe(1)
  })

  it('ответ тьютора сбрасывает счётчик показов', async () => {
    seed({ serves: 2 })
    await reviewItem('user-114', ITEM, true)
    expect(store.updates[0].query).toContain('serves = 0')
  })

  it('ярлык не про эту ошибку ничего не двигает', async () => {
    await reviewItem('user-114', 'missing article with musical instruments', true)
    expect(store.updates).toHaveLength(0)
  })
})
