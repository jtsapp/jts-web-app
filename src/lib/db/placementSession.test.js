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
    let found = [...rows.values()].filter((r) => r.profile_id === profileId)
    if (q.includes('and finished = false')) found = found.filter((r) => !r.finished)
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

// Пересдача из профиля. Первый законченный прогон по-прежнему решает, какой
// уровень у профиля, — пересдача его не трогает и уровень не пишет (это
// делает клиент: он просто не зовёт /api/placement/complete). Но проверять
// ответы без прогона нельзя, поэтому ей нужен свой, открытый прогон.
describe('openPlacementSession — пересдача', () => {
  it('при законченном прогоне заводит новый, а законченный не трогает', async () => {
    const first = await openPlacementSession({ profileId: 'user-3', variant: 'full' })
    Object.assign(rows.get(first.token), { finished: true, level: 'B1', answers: [{ id: 'q1', correct: 1 }] })

    const retake = await openPlacementSession({ profileId: 'user-3', variant: 'express', retake: true })

    expect(retake.token).toBeTruthy()
    expect(retake.token).not.toBe(first.token)
    expect(retake.blocked).toBeUndefined()
    expect(rows.get(first.token)).toMatchObject({ finished: true, level: 'B1', answers: [{ id: 'q1', correct: 1 }] })
  })

  it('брошенная пересдача начинается заново в той же строке', async () => {
    const first = await openPlacementSession({ profileId: 'user-4', variant: 'full' })
    Object.assign(rows.get(first.token), { finished: true, level: 'A2' })
    const retake = await openPlacementSession({ profileId: 'user-4', variant: 'full', retake: true })
    rows.get(retake.token).answers = [{ id: 'q1', correct: 0 }]

    const again = await openPlacementSession({ profileId: 'user-4', variant: 'express', retake: true })

    expect(again.token).toBe(retake.token)
    expect(rows.size).toBe(2)
    expect(rows.get(retake.token).answers).toEqual([])
  })

  it('без флага пересдачи законченный прогон всё так же закрывает тему', async () => {
    const first = await openPlacementSession({ profileId: 'user-5', variant: 'full' })
    Object.assign(rows.get(first.token), { finished: true, level: 'C1' })
    await openPlacementSession({ profileId: 'user-5', variant: 'full', retake: true })

    const plain = await openPlacementSession({ profileId: 'user-5', variant: 'full' })

    expect(plain).toEqual({ token: null, blocked: true, level: 'C1' })
  })
})
