// @vitest-environment jsdom
// Сказки и мемы открываются оверлеем поверх «Практики», без ухода с экрана.
// Решение «можно ли» бралось из ответа квоты, снятого при открытии страницы, и
// больше не обновлялось: демо-ученик с лимитом открывал первую сказку — и
// дальше листал сколько угодно, пока не ушёл с экрана. Перед стартом нужен
// свежий ответ (check), как уже сделано в Listening и Shadowing. Но сервер
// открытых сказок не считает — completed у них всегда 0, и свежий ответ
// всегда «можно». Поэтому счёт ведёт сам экран (overlaySeen.js).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Всё API — пустыми ответами: экрану нужны только карточки сказок из статики.
vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

// Квота — ровно как отвечает настоящий роут: лимит 1, completed 0, «можно».
const check = vi.fn(async () => ({ loading: false, allowed: true, limit: 1, completed: 0, source: 'PLAN' }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true, limit: 1, source: 'PLAN', sourceName: null, check }),
}))

const openTaleWorld = vi.fn()
vi.mock('../practice/fairytale/taleWorld.js', () => ({ openTaleWorld }))

import PracticePage from './PracticePage.jsx'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('PracticePage — квота сказок проверяется в момент открытия', () => {
  it('лимит 1: первая сказка открывается, вторая — экран лимита, первая снова — можно', async () => {
    const { container } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )
    const cards = await waitFor(() => {
      const els = container.querySelectorAll('.pk-tale')
      expect(els.length).toBeGreaterThan(1)
      return els
    })

    fireEvent.click(cards[0])
    await waitFor(() => expect(openTaleWorld).toHaveBeenCalledTimes(1))
    expect(check).toHaveBeenCalled()

    fireEvent.click(cards[1])
    await waitFor(() => expect(container.querySelector('.pl-limit')).toBeTruthy())
    expect(openTaleWorld).toHaveBeenCalledTimes(1)
  })

  it('уже открытая сказка лимит не тратит', async () => {
    const { container } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )
    const card = await waitFor(() => {
      const el = container.querySelector('.pk-tale')
      expect(el).toBeTruthy()
      return el
    })
    fireEvent.click(card)
    await waitFor(() => expect(openTaleWorld).toHaveBeenCalledTimes(1))
    fireEvent.click(card)
    await waitFor(() => expect(openTaleWorld).toHaveBeenCalledTimes(2))
    expect(container.querySelector('.pl-limit')).toBeNull()
  })
})

// Ревью 08.10.2026 (#80): квота мемов проверялась только на входе в ленту, а
// лента листается дальше — демо-ученик с лимитом 1 смотрел все ролики подряд.
describe('PracticePage — квота мемов на каждый ролик ленты', () => {
  const CLIPS = [1, 2, 3].map((n) => ({ id: 'c' + n, mediaUrl: '/m' + n + '.mp4', thumbnailUrl: '/t' + n + '.jpg', title: 'Meme ' + n, views: 1 }))
  let io

  beforeEach(async () => {
    const api = await import('../api.js')
    api.getMediaClips.mockImplementation(async () => CLIPS)
    // Ролик «в кадре» сообщает IntersectionObserver — подменяем его, чтобы
    // листать ленту из теста.
    io = null
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb) {
        this.cb = cb
        io = this
      }
      observe() {}
      disconnect() {}
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function scrollTo(container, k) {
    const el = container.querySelector(`.rl__item[data-idx="${k}"]`)
    act(() => io.cb([{ isIntersecting: true, target: el }]))
  }

  async function openFirstMeme() {
    const view = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )
    const cards = await waitFor(() => {
      const els = view.container.querySelectorAll('.pk-meme')
      expect(els.length).toBe(3)
      return els
    })
    fireEvent.click(cards[0])
    await waitFor(() => expect(view.container.querySelector('.rl')).toBeTruthy())
    return view
  }

  it('лимит 1: долистал до второго ролика — экран лимита', async () => {
    const { container } = await openFirstMeme()
    scrollTo(container, 0)
    expect(container.querySelector('.pl-limit')).toBeNull()
    scrollTo(container, 1)
    await waitFor(() => expect(container.querySelector('.pl-limit')).toBeTruthy())
    expect(container.querySelector('.rl')).toBeNull()
  })

  it('уже просмотренный ролик лимит не тратит', async () => {
    localStorage.setItem('jts_memes_seen', JSON.stringify(['c2']))
    check.mockResolvedValueOnce({ loading: false, allowed: true, limit: 2, completed: 0, source: 'PLAN' })
    const { container } = await openFirstMeme()
    scrollTo(container, 1)
    expect(container.querySelector('.pl-limit')).toBeNull()
    expect(container.querySelector('.rl')).toBeTruthy()
  })
})
