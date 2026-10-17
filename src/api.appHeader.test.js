import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginWithGoogle, loginWithPassword, verifyLoginOtp } from './api.js'

// Клиентская часть — только для студентов. Все входы сообщают об этом бэкенду заголовком X-App: он выдаёт токен
// ученика человеку с несколькими ролями и закрывает вход сотруднику без роли студента.
describe('вход в клиентскую часть: заголовок X-App', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stubFetch = (response) => {
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }
  const ok = () => ({ ok: true, status: 200, json: async () => ({ accessToken: 't' }) })

  it('пароль, код из письма и Google отправляют X-App: student', async () => {
    const fetchMock = stubFetch(ok())

    await loginWithPassword('+77001112233', 'secret')
    await verifyLoginOtp('+77001112233', '1234')
    await loginWithGoogle('id-token')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers['X-App']).toBe('student')
    }
  })

  it('сообщение бэкенда для сотрудника без роли студента доходит до экрана как есть', async () => {
    const message = 'В клиентскую часть входят только студенты. Зарегистрируйтесь как студент или обратитесь к менеджеру.'
    stubFetch({ ok: false, status: 403, json: async () => ({ messages: [message] }) })

    await expect(loginWithPassword('teacher@example.com', 'secret')).rejects.toMatchObject({
      status: 403,
      message,
    })
  })
})
