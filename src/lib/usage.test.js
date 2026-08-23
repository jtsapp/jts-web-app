import { describe, it, expect } from 'vitest'
import { billableSeconds, HEARTBEAT_GRACE_SEC } from './usage.js'

const T0 = Date.parse('2026-08-23T10:00:00Z')
const at = (sec) => new Date(T0 + sec * 1000)

describe('billableSeconds', () => {
  it('тьютор не подключился — платить не за что', () => {
    // Ровно та дыра, из-за которой минуты капали, пока ученик ждал соединения.
    expect(billableSeconds({ armedAt: null, lastSeenAt: null, now: at(600) })).toBe(0)
  })

  it('идущий разговор считает от подключения тьютора до сейчас', () => {
    expect(
      billableSeconds({ armedAt: at(0), lastSeenAt: at(100), now: at(110) })
    ).toBe(110)
  })

  it('пульс пропал — окно замирает на последнем пульсе плюс запас', () => {
    // Ученик положил трубку и ушёл читать разбор: комната ещё жива, но лимит
    // больше не тает. До фикса здесь было бы 900 секунд.
    const sec = billableSeconds({ armedAt: at(0), lastSeenAt: at(100), now: at(900) })
    expect(sec).toBe(100 + HEARTBEAT_GRACE_SEC)
  })

  it('одиночный пропуск пульса разговор не рвёт', () => {
    // Пинг раз в 20 с; один потерянный запрос не должен обрубать сессию.
    expect(billableSeconds({ armedAt: at(0), lastSeenAt: at(300), now: at(320) })).toBe(320)
  })

  it('без единого пульса окно закрывается сразу после подключения', () => {
    // Строки из старой схемы (armed_at есть, пульса не было никогда) не должны
    // расти по настенным часам.
    expect(billableSeconds({ armedAt: at(0), lastSeenAt: null, now: at(5000) })).toBe(
      HEARTBEAT_GRACE_SEC
    )
  })

  it('режется по потолку сессии', () => {
    const sec = billableSeconds({ armedAt: at(0), lastSeenAt: at(9000), now: at(9000) })
    expect(sec).toBe(1260)
  })

  it('часы уехали назад — не отрицательное значение', () => {
    expect(billableSeconds({ armedAt: at(100), lastSeenAt: at(100), now: at(50) })).toBe(0)
  })
})
