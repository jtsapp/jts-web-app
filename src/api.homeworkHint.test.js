// @vitest-environment jsdom
// Ступень подсказки Луны в домашке (ТЗ v2.0, 7.2б; контракт homework-hint-contract.md, backend V543): сразу ручкой
// …/hint и пакетом в теле сдачи. Ответ ученика ступени не несёт.
import { describe, it, expect, vi } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { saveHomeworkAnswer, saveHomeworkHint, submitHomework } from './api.js'

const reply = (status, body = null) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => '' })
const calls = () => fetch.mock.calls.map(([url, opts]) => ({ url, method: opts.method, body: opts.body == null ? null : JSON.parse(opts.body) }))

describe('ступень подсказки в домашке', () => {
  it('сразу: PUT …/exercises/{id}/hint { hintLevel }', async () => {
    globalThis.fetch = vi.fn(async () => reply(204))
    await saveHomeworkHint(7, 12, 't', 2)
    expect(calls()).toEqual([{ url: expect.stringMatching(/\/admin\/homework\/7\/exercises\/12\/hint$/), method: 'PUT', body: { hintLevel: 2 } }])
  })

  it('сдача: без ступеней — пустой PUT, как раньше; со ступенями — тело hintLevels', async () => {
    globalThis.fetch = vi.fn(async () => reply(200, { id: 7 }))
    await submitHomework('t', 7)
    await submitHomework('t', 7, { hintLevels: {} })
    await submitHomework('t', 7, { hintLevels: { 12: 2, 13: 1 } })
    expect(calls()).toEqual([
      { url: expect.stringMatching(/\/admin\/homework\/7\/submit$/), method: 'PUT', body: null },
      { url: expect.stringMatching(/\/admin\/homework\/7\/submit$/), method: 'PUT', body: null },
      { url: expect.stringMatching(/\/admin\/homework\/7\/submit$/), method: 'PUT', body: { hintLevels: { 12: 2, 13: 1 } } },
    ])
  })

  it('ответ на задание — без ступени', async () => {
    globalThis.fetch = vi.fn(async () => reply(200, { id: 7 }))
    await saveHomeworkAnswer(7, 12, 't', 'went', false)
    expect(calls()[0].body).toEqual({ answer: 'went', correct: false })
  })
})
