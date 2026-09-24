// @vitest-environment jsdom
// Сказки и мемы открываются оверлеем поверх «Практики», без ухода с экрана.
// Решение «можно ли» бралось из ответа квоты, снятого при открытии страницы, и
// больше не обновлялось: демо-ученик с лимитом открывал первую сказку — и
// дальше листал сколько угодно, пока не ушёл с экрана. Перед стартом нужен
// свежий ответ (check), как уже сделано в Listening и Shadowing. Но сервер
// открытых сказок не считает — completed у них всегда 0, и свежий ответ
// всегда «можно». Поэтому счёт ведёт сам экран (overlaySeen.js).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
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
