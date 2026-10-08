// @vitest-environment jsdom
// Хелперы api.js сообщают о 401 — и только о нём.
//
// Раньше они просто бросали ошибку с кодом, и сессия, кончившаяся посреди
// работы, выглядела как «приложение сломалось»: каталоги пустые, кнопки молчат.
// Теперь 401 у запроса с токеном уходит в lib/session.js, который решает, срок
// это или права. Здесь проверяется только проводка: каждый из пяти хелперов
// сообщает о 401 и не сообщает ни о чём другом.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { reportUnauthorized } from './lib/session.js'
import {
  getLessonModules, // authGet
  completeCatalogLesson, // authPost
  uncompleteCatalogLesson, // authDelete
  submitHomework, // authPut
  editLessonMessage, // authPatch
  saveWord, // свой fetch — «В словарь» из читалок
} from './api.js'

const TOKEN = 'tok-1'

function answerWith(status) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => '',
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

const CALLS = {
  authGet: () => getLessonModules(TOKEN),
  authPost: () => completeCatalogLesson(TOKEN, 1),
  authDelete: () => uncompleteCatalogLesson(TOKEN, 1),
  authPut: () => submitHomework(TOKEN, 1),
  authPatch: () => editLessonMessage(TOKEN, 1, 2, 'текст'),
  // Ревью 08.10.2026: с протухшим токеном «Сохранить в словарь» бесконечно
  // показывало «Не сохранилось», а «Сессия истекла» не приходила.
  saveWord: () => saveWord(TOKEN, { word: 'ghost', translation: 'призрак' }),
}

describe.each(Object.entries(CALLS))('%s', (_name, call) => {
  it('401 с токеном — сообщает о нём и по-прежнему бросает ошибку', async () => {
    answerWith(401)

    await expect(call()).rejects.toMatchObject({ status: 401 })

    expect(reportUnauthorized).toHaveBeenCalledTimes(1)
    expect(reportUnauthorized).toHaveBeenCalledWith(TOKEN)
  })

  // 403 — это права, а 5xx — бэкенд: ни то ни другое не повод проверять сессию.
  it.each([403, 404, 500])('%i о сессии не сообщает', async (status) => {
    answerWith(status)

    await expect(call()).rejects.toBeTruthy()

    expect(reportUnauthorized).not.toHaveBeenCalled()
  })

  it('успех о сессии не сообщает', async () => {
    answerWith(200)

    await call()

    expect(reportUnauthorized).not.toHaveBeenCalled()
  })
})
