// Квота IELTS должна тратиться только на секции с внешней проверкой: Speaking
// (Azure + разбор моделью) и Writing (оценка моделью) - это ровно то, ради
// чего демо существует. Reading и Listening проверяются локально по ключам
// ответов (см. key-grading.js), не ходят ни в один платный API и ничего не
// демонстрируют - тратить на них единственную демо-попытку значит сжечь её
// впустую ещё до того, как студент дойдёт до Speaking/Writing.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock хостится в начало файла, поэтому фабрики не могут ссылаться на
// обычные const снаружи - только на то, что объявлено через vi.hoisted().
const authServer = vi.hoisted(() => ({
  resolveProfileId: vi.fn(),
  bearerFromRequest: vi.fn(() => 'token-123'),
  fetchContentQuota: vi.fn(),
}))
const dbIelts = vi.hoisted(() => ({
  countIeltsAttemptsSince: vi.fn(),
}))

vi.mock('../auth-server.js', () => authServer)
vi.mock('../db/ielts.js', () => dbIelts)

import { checkIeltsQuota, sectionConsumesQuota } from './quota.js'

describe('какие секции IELTS тратят демо-попытку', () => {
  it('Speaking и Writing — тратят: там внешняя проверка и они продают', () => {
    expect(sectionConsumesQuota('speaking')).toBe(true)
    expect(sectionConsumesQuota('writing')).toBe(true)
  })

  it('Reading и Listening — нет: внешних API там нет, экономить нечего', () => {
    expect(sectionConsumesQuota('reading')).toBe(false)
    expect(sectionConsumesQuota('listening')).toBe(false)
  })

  it('неизвестная и отсутствующая секция попытку не тратят', () => {
    expect(sectionConsumesQuota('unknown')).toBe(false)
    expect(sectionConsumesQuota(undefined)).toBe(false)
  })
})

// Регрессия на реальный механизм списания: checkIeltsQuota вызывает
// fetchContentQuota (биллинг-бэкенд) и countIeltsAttemptsSince (счётчик в
// БД). Мало вернуть blocked:false для reading/listening - если не остановить
// эти вызовы до похода в БД/бэкенд, а заодно не отфильтровать сам счётчик по
// платным секциям, то попытки Reading/Listening всё равно попадут в "used" и
// съедят квоту Speaking/Writing при следующей же проверке.
describe('checkIeltsQuota: реальное списание', () => {
  const fakeRequest = { headers: { get: () => null } }

  beforeEach(() => {
    authServer.resolveProfileId.mockReset().mockResolvedValue({ id: 'user-1' })
    authServer.fetchContentQuota
      .mockReset()
      .mockResolvedValue({ limit: 1, source: 'DEMO', sourceName: 'Demo' })
    dbIelts.countIeltsAttemptsSince.mockReset().mockResolvedValue(0)
  })

  it('reading/listening: не ходит ни в биллинг, ни в счётчик БД, не блокирует', async () => {
    const reading = await checkIeltsQuota(fakeRequest, null, 'reading')
    expect(reading.blocked).toBe(false)
    expect(authServer.fetchContentQuota).not.toHaveBeenCalled()
    expect(dbIelts.countIeltsAttemptsSince).not.toHaveBeenCalled()

    const listening = await checkIeltsQuota(fakeRequest, null, 'listening')
    expect(listening.blocked).toBe(false)
    expect(authServer.fetchContentQuota).not.toHaveBeenCalled()
    expect(dbIelts.countIeltsAttemptsSince).not.toHaveBeenCalled()
  })

  it('writing/speaking: считает used только по платным секциям', async () => {
    await checkIeltsQuota(fakeRequest, null, 'writing')
    expect(dbIelts.countIeltsAttemptsSince).toHaveBeenCalledTimes(1)
    const paidSections = dbIelts.countIeltsAttemptsSince.mock.calls[0][2]
    expect(new Set(paidSections)).toEqual(new Set(['speaking', 'writing']))
  })

  // Демо живёт 7–14 дней, и примерно у половины этот срок пересекает границу
  // месяца: календарное окно обнулялось посреди пробного периода и выдавало
  // вторые две платные секции. По спецификации это две попытки на демо, а не
  // две в месяц.
  it('демо считается за всё время, обычный ученик — с первого числа', async () => {
    authServer.resolveProfileId.mockResolvedValue({ id: 'user-1', isDemoAccount: true })
    await checkIeltsQuota(fakeRequest, null, 'writing')
    const demoSince = dbIelts.countIeltsAttemptsSince.mock.calls[0][1]
    expect(demoSince.getTime()).toBe(0)

    dbIelts.countIeltsAttemptsSince.mockClear()
    authServer.resolveProfileId.mockResolvedValue({ id: 'user-2', isDemoAccount: false })
    await checkIeltsQuota(fakeRequest, null, 'writing')
    const paidSince = dbIelts.countIeltsAttemptsSince.mock.calls[0][1]
    expect(paidSince.getDate()).toBe(1)
    expect(paidSince.getMonth()).toBe(new Date().getMonth())
    expect(paidSince.getHours()).toBe(0)
  })

  it('entitlement-проверка без section: считает реальную квоту, а не молча пропускает всё', async () => {
    dbIelts.countIeltsAttemptsSince.mockResolvedValue(1)
    const result = await checkIeltsQuota(fakeRequest, null)
    expect(authServer.fetchContentQuota).toHaveBeenCalled()
    expect(dbIelts.countIeltsAttemptsSince).toHaveBeenCalled()
    expect(result.blocked).toBe(true) // used(1) >= limit(1)
  })
})
