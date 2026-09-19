// Повторная попытка теста уровня. Клиент каждый раз начинает тест заново, с
// новым сидом и в основном с другими заданиями, а сервер «продолжал» старый
// прогон вместе с его ответами. Итог: ответы двух попыток копились в одном
// журнале, упирались в MAX_GRADED_PER_SESSION (409 навсегда, сбросить нечем),
// а уровень считался по смеси — ошибки брошенной попытки топили удачную.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rows = new Map()
const queries = []

function fakeSql(strings, ...vals) {
  const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase()
  queries.push(q)
  if (q.startsWith('select token, finished, level')) {
    const [profileId] = vals
    const found = [...rows.values()].filter((r) => r.profile_id === profileId)
    found.sort((a, b) => Number(b.finished) - Number(a.finished))
    return Promise.resolve(found.slice(0, 1))
  }
  if (q.startsWith('insert into placement_session')) {
    const [token, profileId, variant] = vals
    rows.set(token, { token, profile_id: profileId, variant, answers: [], finished: false, level: null })
    return Promise.resolve([])
  }
  if (q.startsWith('update placement_session set answers')) {
    const row = rows.get(vals[vals.length - 1])
    if (row && !row.finished) {
      row.answers = vals[0]
      if (vals.length === 3) row.variant = vals[1]
    }
    return Promise.resolve([])
  }
  throw new Error('неожиданный запрос: ' + q)
}
fakeSql.json = (v) => v

vi.mock('./sql.js', () => ({ getSql: () => fakeSql }))

const { openPlacementSession } = await import('./placementSession.js')

beforeEach(() => {
  rows.clear()
  queries.length = 0
})

describe('openPlacementSession — повторная попытка', () => {
  it('незаконченный прогон переиспользуется, но его ответы сбрасываются', async () => {
    const first = await openPlacementSession({ profileId: 'user-1', variant: 'full' })
    rows.get(first.token).answers = Array.from({ length: 40 }, (_, i) => ({ id: `q${i}`, correct: 0 }))

    const again = await openPlacementSession({ profileId: 'user-1', variant: 'express' })

    expect(again.token).toBe(first.token)
    expect(rows.size).toBe(1)
    expect(rows.get(first.token).answers).toEqual([])
    expect(rows.get(first.token).variant).toBe('express')
  })

  it('законченный прогон по-прежнему закрывает тему', async () => {
    const first = await openPlacementSession({ profileId: 'user-2', variant: 'full' })
    Object.assign(rows.get(first.token), { finished: true, level: 'B1' })

    const again = await openPlacementSession({ profileId: 'user-2', variant: 'full' })

    expect(again).toEqual({ token: null, blocked: true, level: 'B1' })
  })
})
