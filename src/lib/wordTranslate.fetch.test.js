// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Сетевой перевод слова (GET /translate). Ревью 08.10.2026:
//  - гость получал 401 всегда: брался только токен сессии, а демо-токен
//    Практики, с которым гость читает Книги, Комиксы и Чтение, не брался вовсе;
//  - кэш вёлся по слову в нижнем регистре, и «May» (май) отдавало перевод
//    «may» (может), «Turkey» — «turkey» (индейка).

const session = { token: null }
const getPracticeToken = vi.fn(async () => 'DEMO')
vi.mock('./session.js', () => ({ loadToken: () => session.token }))
vi.mock('../api.js', () => ({ getPracticeToken: (...a) => getPracticeToken(...a) }))

const TR = { May: 'май', may: 'может', ghost: 'призрак' }
const fetchMock = vi.fn(async (url) => {
  const q = new URL(url).searchParams.get('q')
  return { ok: true, json: async () => ({ tr: TR[q] || '', alternates: [] }) }
})

beforeEach(() => {
  localStorage.clear()
  session.token = null
  getPracticeToken.mockReset().mockResolvedValue('DEMO')
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

const load = () => import('./wordTranslate.js')
const authOf = (call) => call[1]?.headers?.Authorization

describe('translateWord — токен', () => {
  it('гость переводит с демо-токеном Практики', async () => {
    const { translateWord } = await load()
    await translateWord('ghost')
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer DEMO')
  })

  it('вошедший — со своим токеном, демо-токен не просит', async () => {
    session.token = 'USER'
    const { translateWord } = await load()
    await translateWord('ghost')
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer USER')
    expect(getPracticeToken).not.toHaveBeenCalled()
  })

  it('демо-доступа на стенде нет — запрос уходит без токена, как раньше', async () => {
    getPracticeToken.mockResolvedValueOnce(null)
    const { translateWord } = await load()
    await translateWord('ghost')
    expect(authOf(fetchMock.mock.calls[0])).toBeUndefined()
  })

  it('отказ в демо-токене не повторяется на каждый тап', async () => {
    // Без этого каждый тап гостя по непереведённому слову слал вход на бэкенд
    // (POST /api/practice/demo-token логинит демо-аккаунт).
    getPracticeToken.mockResolvedValue(null)
    const { translateWord } = await load()
    await translateWord('ghost')
    await translateWord('May')
    expect(getPracticeToken).toHaveBeenCalledTimes(1)
  })
})

describe('translateWord — кэш', () => {
  it('«May» и «may» — разные слова и разные записи кэша', async () => {
    session.token = 'USER'
    const { translateWord } = await load()
    expect((await translateWord('May')).tr).toBe('май')
    expect((await translateWord('may')).tr).toBe('может')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('прежний кэш v2 со смешанным регистром убирается', async () => {
    session.token = 'USER'
    localStorage.setItem('jts_word_tr_v2', JSON.stringify({ 'ru:may': { tr: 'май', alternates: [] } }))
    const { translateWord } = await load()
    expect((await translateWord('may')).tr).toBe('может')
    expect(localStorage.getItem('jts_word_tr_v2')).toBeNull()
  })
})
