import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getIsBoothAccount, enterTrialBooth } from '../api.js'

// Обёртки класса преподавателя. Мокаем транспорт (fetch), а не модуль целиком:
// проверять тут нечего, кроме пути, метода, Bearer и разбора ответа, — то есть
// ровно того, чем обёртка и является. Тот же приём, что в
// src/screens/schedule/scheduleApi.test.js.
beforeEach(() => {
  global.fetch = vi.fn()
})

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const fail = (status) => ({ ok: false, status, json: async () => ({}) })

describe('getIsBoothAccount', () => {
  // Канонический контракт: boothAccount — ПЛОСКОЕ булево поле рядом с
  // isDemoAccount, а не объект с описанием класса. Имя класса, преподаватель и
  // состояние клиенту не нужны вовсе: он этим признаком решает ровно один
  // вопрос — вести в кабинет или в класс.
  it('GET /user/me с Bearer, признак берётся из boothAccount', async () => {
    global.fetch.mockResolvedValueOnce(ok({ id: 501, boothAccount: true }))

    const is = await getIsBoothAccount('TOK')
    const [url, opts] = global.fetch.mock.calls[0]

    expect(String(url)).toContain('/user/me')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(is).toBe(true)
  })

  // Поля в ответе может не быть вовсе (обычный ученик) — это «нет», а не
  // undefined: на undefined ветвление молча свалилось бы в «не класс» и в
  // обратную сторону тоже прошло бы незамеченным.
  it('обычный ученик — false, а не undefined', async () => {
    global.fetch.mockResolvedValueOnce(ok({ id: 7, name: 'Асель' }))

    expect(await getIsBoothAccount('TOK')).toBe(false)
  })

  // Осечка сети не должна ронять вход: человек попадёт в обычный кабинет, а
  // F5 спросит снова. Настоящий запрет всё равно живёт на бэкенде.
  it('осечка запроса — false, без исключения', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'))

    expect(await getIsBoothAccount('TOK')).toBe(false)
  })

  it('без токена в сеть не ходит', async () => {
    expect(await getIsBoothAccount(null)).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('enterTrialBooth', () => {
  // Тело ответа каноническое целиком — { sessionId, lessonId, resumed }.
  // Обёртка отдаёт его как есть и ничего не выбирает: sessionId и resumed
  // клиенту не нужны (см. «Контракт с бэкендом»), но и мешать не должны — этот
  // тест ловит попытку «почистить» ответ до одного поля.
  it('POST /trial/booth/enter с Bearer, отдаёт lessonId', async () => {
    global.fetch.mockResolvedValueOnce(ok({ sessionId: 12, lessonId: 77, resumed: false }))

    const data = await enterTrialBooth('TOK')
    const [url, opts] = global.fetch.mock.calls[0]

    expect(String(url)).toContain('/trial/booth/enter')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data.lessonId).toBe(77)
  })

  // По статусу экран и различает свои два состояния: 403/404 — «класс закрыт»
  // (повторять нечего), всё остальное — подождать и войти снова. Поэтому статус
  // обязан доехать полем ошибки, а не строкой сообщения.
  it('403 приезжает статусом на ошибке', async () => {
    global.fetch.mockResolvedValueOnce(fail(403))

    await expect(enterTrialBooth('TOK')).rejects.toMatchObject({ status: 403 })
  })

  it('осечка бэкенда тоже несёт статус', async () => {
    global.fetch.mockResolvedValueOnce(fail(503))

    await expect(enterTrialBooth('TOK')).rejects.toMatchObject({ status: 503 })
  })
})
