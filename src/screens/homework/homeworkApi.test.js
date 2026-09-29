import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveHomeworkFeedback, submitHomework } from '../../api.js'

/**
 * Отказ сервера в сдаче объясняет сам себя: GlobalExceptionHandler отдаёт
 * GeneralResponse `{ messages: ["Работа пустая: …"] }`. authPut тело отказа не
 * читал вовсе — экран знал только код и показывал общее «не удалось».
 */
const отказ = (status, body) => ({
  ok: false,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
    return body
  },
})

let fetchBefore
beforeEach(() => { fetchBefore = global.fetch })
afterEach(() => { global.fetch = fetchBefore })

describe('authPut: текст отказа сервера', () => {
  it('кладёт первую строку GeneralResponse на ошибку, код и message — прежние', async () => {
    global.fetch = vi.fn(async () => отказ(400, { messages: ['Работа пустая: прикрепите файл или решите хотя бы одно задание'] }))

    const e = await submitHomework('TOK', 7).catch((err) => err)

    expect(e.status).toBe(400)
    expect(e.serverMessage).toBe('Работа пустая: прикрепите файл или решите хотя бы одно задание')
    // Вызывающие, что показывают свою подпись или смотрят в message, ничего не заметят.
    expect(e.message).toBe('request failed: 400')
  })

  it('тело без текста или не JSON — serverMessage пустой, ошибка та же', async () => {
    global.fetch = vi.fn(async () => отказ(502))
    const безТела = await saveHomeworkFeedback('TOK', 7, 'ok').catch((err) => err)
    expect(безТела.status).toBe(502)
    expect(безТела.serverMessage).toBeNull()

    global.fetch = vi.fn(async () => отказ(410, { messages: [] }))
    const пустое = await submitHomework('TOK', 7).catch((err) => err)
    expect(пустое.status).toBe(410)
    expect(пустое.serverMessage).toBeNull()
  })
})
