import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getLanguageLevel } from './api.js'

// `GET /user/language-level` у нового аккаунта отвечает 404: своего уровня ещё
// нет, а вывести его из опросника не из чего. Это «тест не пройден», а не сбой,
// и вход обязан отличать одно от другого — иначе пропустивший тест студент не
// увидит его больше никогда.
describe('getLanguageLevel', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const respond = (status, body) => {
    global.fetch.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  }

  it('отдаёт уровень строкой', async () => {
    respond(200, 'B1')
    expect(await getLanguageLevel('TOK')).toBe('B1')
  })

  it('понимает объектную форму ответа', async () => {
    respond(200, { languageLevel: 'A2' })
    expect(await getLanguageLevel('TOK')).toBe('A2')
  })

  it('404 — это «уровня нет», а не ошибка', async () => {
    respond(404, null)
    expect(await getLanguageLevel('TOK')).toBeNull()
  })

  it('другие ошибки пробрасываются: «не знаю» ≠ «нет»', async () => {
    respond(500, null)
    await expect(getLanguageLevel('TOK')).rejects.toThrow('500')
  })

  it('обрыв сети пробрасывается', async () => {
    global.fetch.mockRejectedValue(new Error('offline'))
    await expect(getLanguageLevel('TOK')).rejects.toThrow('Нет связи с сервером.')
  })
})
