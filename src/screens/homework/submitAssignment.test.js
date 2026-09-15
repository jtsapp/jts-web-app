import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitAssignment } from '../../api.js'

// Обёртка сдачи урока, заданного на дом. Мокаем транспорт (fetch), а не модуль
// целиком: проверять тут нечего, кроме пути, метода, Bearer, ТЕЛА запроса и
// разбора ответа, — то есть ровно того, чем обёртка и является. Тот же приём,
// что в src/screens/boothApi.test.js.
//
// Тело проверяется поимённо и целиком: это единственное место в кабинете, где
// ловится расхождение контракта с бэкендом. Лишнее поле здесь — молчаливый 400
// у ученика на настоящем сервере, и оба репозитория при этом зелёные.
beforeEach(() => {
  global.fetch = vi.fn()
})

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const fail = (status) => ({ ok: false, status, json: async () => ({}) })

const НАЗНАЧЕНИЕ = {
  id: 9, wholeLesson: true, submittedAt: '2026-09-15T10:00:00',
  autoCorrect: 42, autoTotal: 54, autoPercent: 78,
}

describe('submitAssignment', () => {
  it('POST /student/assignments/{id}/submit с Bearer и телом {correct, total}', async () => {
    global.fetch.mockResolvedValueOnce(ok(НАЗНАЧЕНИЕ))

    const res = await submitAssignment('TOK', 9, { correct: 42, total: 54 })
    const [url, opts] = global.fetch.mock.calls[0]

    expect(String(url)).toContain('/student/assignments/9/submit')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    // Поимённо и без лишнего: процент считает сервер сам из этой пары.
    expect(JSON.parse(opts.body)).toEqual({ correct: 42, total: 54 })
    // Ответ — полное назначение, как у существующего grade: карточка ученика
    // чинится им на месте, без повторного похода за списком.
    expect(res).toEqual(НАЗНАЧЕНИЕ)
  })

  /**
   * Повторная сдача отбивается сервером (submitted_at непуст) — 400. Код нужен
   * вызывающему: «уже сдано» и «сеть отвалилась» — разные сообщения ученику, и
   * под общим отказом он жал бы кнопку ещё раз без всякого толку.
   */
  it('отказ сервера доносит свой код', async () => {
    global.fetch.mockResolvedValueOnce(fail(400))

    await expect(submitAssignment('TOK', 9, { correct: 1, total: 2 }))
      .rejects.toMatchObject({ status: 400 })
  })
})
