// @vitest-environment jsdom
// Ревью Практики 08.10.2026, #76: серия дней караоке считалась по дате UTC.
// В Казахстане (UTC+5) песня в 03:00 по местному — это ещё вчера по UTC, и
// «спел вчера ночью и сегодня вечером» рвало серию, а «спел в 23:00 и в 01:00»
// засчитывалось одним днём. День ученика — местный.
//
// Пояс задаём сами: на сервере сборки он UTC, и там старый и новый счёт
// совпадали бы — тест ничего бы не различал.
process.env.TZ = 'Asia/Almaty'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../api.js', () => ({}))
const { saveKaraokeResult, karaokeStreak } = await import('./karaokeData.js')

const at = (y, mo, d, h) => vi.setSystemTime(new Date(y, mo - 1, d, h, 0, 0))

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('серия дней караоке — по местной дате', () => {
  it('пояс теста правда UTC+5', () => {
    expect(new Date(2026, 9, 12, 3).getTimezoneOffset()).toBe(-300)
  })

  it('ночью в 03:00 и на следующий вечер — два дня подряд', () => {
    at(2026, 10, 12, 3)
    saveKaraokeResult('yesterday', { score: 70 })
    at(2026, 10, 13, 20)
    saveKaraokeResult('yesterday', { score: 80 })
    expect(karaokeStreak()).toEqual({ days: 2, lastDate: '2026-10-13' })
  })

  it('в 23:00 и в 01:00 — это два разных дня', () => {
    at(2026, 10, 12, 23)
    saveKaraokeResult('yesterday', { score: 70 })
    at(2026, 10, 13, 1)
    saveKaraokeResult('yesterday', { score: 70 })
    expect(karaokeStreak().days).toBe(2)
  })

  it('пропущенный день начинает серию заново, тот же день не добавляет', () => {
    at(2026, 10, 12, 10)
    saveKaraokeResult('a', { score: 70 })
    saveKaraokeResult('a', { score: 70 })
    expect(karaokeStreak().days).toBe(1)
    at(2026, 10, 14, 10)
    saveKaraokeResult('a', { score: 70 })
    expect(karaokeStreak()).toEqual({ days: 1, lastDate: '2026-10-14' })
  })
})
