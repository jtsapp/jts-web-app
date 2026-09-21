// @vitest-environment jsdom
// Сказки и мемы открываются оверлеем поверх «Практики», без ухода с экрана.
// Решение «можно ли» бралось из ответа квоты, снятого при открытии страницы, и
// больше не обновлялось: демо-ученик с лимитом открывал первую сказку — и
// дальше листал сколько угодно, пока не ушёл с экрана. Перед стартом нужен
// свежий ответ (check), как уже сделано в Listening и Shadowing.
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

// Квота: при открытии страницы — «можно», свежая проверка — «лимит».
const check = vi.fn(async () => ({ loading: false, allowed: false, limit: 1, source: 'PLAN' }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true, limit: 1, source: 'PLAN', sourceName: null, check }),
}))

const openTaleWorld = vi.fn()
vi.mock('../practice/fairytale/taleWorld.js', () => ({ openTaleWorld }))

import PracticePage from './PracticePage.jsx'

beforeEach(() => vi.clearAllMocks())

describe('PracticePage — квота сказок проверяется в момент открытия', () => {
  it('исчерпанный лимит видно на клике, а не только после перезахода', async () => {
    const { container } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )
    const card = await waitFor(() => {
      const el = container.querySelector('.pp-tcard')
      expect(el).toBeTruthy()
      return el
    })
    fireEvent.click(card)

    await waitFor(() => expect(container.querySelector('.pl-limit')).toBeTruthy())
    expect(check).toHaveBeenCalled()
    expect(openTaleWorld).not.toHaveBeenCalled()
  })
})
