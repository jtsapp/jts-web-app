// @vitest-environment jsdom
// Ступень подсказки Луны уходит с ответом домашки (ТЗ v2.0, 7.2б; backend V543). Бэкенд без V543 отклоняет
// незнакомое поле 400 — ответ ученика тогда уходит ещё раз без ступени, а не теряется.
import { describe, it, expect, vi } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { saveHomeworkAnswer } from './api.js'

const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) })
const bodies = () => fetch.mock.calls.map(([, opts]) => JSON.parse(opts.body))

describe('saveHomeworkAnswer и ступень подсказки', () => {
  it('без подсказки — поля нет вовсе', async () => {
    globalThis.fetch = vi.fn(async () => reply(200, { id: 1 }))
    await saveHomeworkAnswer(1, 2, 't', 'went', true)
    await saveHomeworkAnswer(1, 2, 't', 'went', true, 0)
    expect(bodies()).toEqual([{ answer: 'went', correct: true }, { answer: 'went', correct: true }])
  })

  it('с подсказкой — hintStep в теле', async () => {
    globalThis.fetch = vi.fn(async () => reply(200, { id: 1 }))
    await saveHomeworkAnswer(1, 2, 't', 'went', false, 2)
    expect(bodies()).toEqual([{ answer: 'went', correct: false, hintStep: 2 }])
    expect(fetch.mock.calls[0][0]).toMatch(/\/admin\/homework\/1\/exercises\/2\/answer$/)
  })

  it('старый бэкенд ответил 400 — тот же ответ ещё раз, без ступени', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(reply(400, { message: 'Unrecognized field "hintStep"' })).mockResolvedValueOnce(reply(200, { id: 1 }))
    await expect(saveHomeworkAnswer(1, 2, 't', 'went', false, 1)).resolves.toEqual({ id: 1 })
    expect(bodies()).toEqual([{ answer: 'went', correct: false, hintStep: 1 }, { answer: 'went', correct: false }])
  })

  it('другая ошибка — не повторяем', async () => {
    globalThis.fetch = vi.fn(async () => reply(500))
    await expect(saveHomeworkAnswer(1, 2, 't', 'went', false, 1)).rejects.toMatchObject({ status: 500 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
