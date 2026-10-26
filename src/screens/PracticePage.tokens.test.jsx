// @vitest-environment jsdom
// «+N токенов» на плитках практики (ТЗ кабинетов, раздел 6): бейдж берётся из правил токенов ученика.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const RULES = [
  { name: 'Сказка пройдена', points: 6 },
  { name: 'Мемы и рилсы — 5 штук', points: 1 },
  { name: 'Тренажёр аудирования / чтения / письма / говорения', points: 4 },
]

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true, limit: 1, source: 'PLAN', sourceName: null, check: vi.fn() }),
}))

import { getMyTokens } from '../api.js'
import { resetPracticeTokenRulesCache } from '../practice/practiceTokens.js'
import PracticePage from './PracticePage.jsx'

vi.setConfig({ testTimeout: 30_000 })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  resetPracticeTokenRulesCache()
})

describe('PracticePage — бейдж «+N токенов»', () => {
  it('секции, за которые начисляются токены, подписаны; остальные нет', async () => {
    getMyTokens.mockResolvedValue({ practiceRules: RULES })
    const { container } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )

    await waitFor(() => expect(container.querySelectorAll('[data-testid=practice-token-badge]').length).toBeGreaterThan(0))
    const badges = Array.from(container.querySelectorAll('[data-testid=practice-token-badge]')).map((node) => node.textContent)
    expect(badges).toContain('+6 токенов')
    expect(badges).toContain('+1 токен')
  })

  it('правил нет — плитки без бейджа', async () => {
    getMyTokens.mockResolvedValue({ practiceRules: [] })
    const { container } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>,
    )

    await waitFor(() => expect(getMyTokens).toHaveBeenCalled())
    expect(container.querySelector('[data-testid=practice-token-badge]')).toBeNull()
  })
})
