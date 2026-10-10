// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
}))

vi.mock('../tutor/OnboardingTour.jsx', () => ({
  default: () => null,
  useScreenTour: () => ({ open: false, start: () => {}, finish: () => {} }),
}))

import LearningPage from './LearningPage.jsx'

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

function draw(userLevel) {
  return render(
    <I18nProvider>
      <LearningPage userLevel={userLevel} userName="Тест" token="T" onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

describe('карта «Повторения»', () => {
  it('у B1 открыты уровни ниже и свой, закрыты выше', () => {
    const { container } = draw('B1')
    const nodes = [...container.querySelectorAll('.lp-node')]
    const byLevel = Object.fromEntries(
      nodes.map((n) => [n.querySelector('.lp-node__label').textContent.replace('Уровень ', ''), n]),
    )

    expect(byLevel.A0.classList.contains('is-locked')).toBe(false)
    expect(byLevel.A1.classList.contains('is-locked')).toBe(false)
    expect(byLevel.A2.classList.contains('is-locked')).toBe(false)
    expect(byLevel.B1.classList.contains('is-locked')).toBe(false)
    expect(byLevel.B1.classList.contains('is-current')).toBe(true)
    expect(byLevel.B2.classList.contains('is-locked')).toBe(true)
    expect(byLevel.C1.classList.contains('is-locked')).toBe(true)
  })
})
