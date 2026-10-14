// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import HomePage from './HomePage.jsx'

// «Главная» General English (спека 2026-10-12, секция 3): верхний блок по профилю — прежняя карточка без профиля,
// приглашение, следующий шаг и блок цели.

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => ({ requested: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getMyHomework: vi.fn(async () => []),
  requestTrialLesson: vi.fn(async () => ({ requested: true })),
  getLevelProgress: vi.fn(async () => ({ level: 'A2', next: 'B1', percent: 40, done: 14, total: 36, remaining: 22 })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getIeltsPlan: vi.fn(async () => null),
}))
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => ({}), loadSkillStatsRemote: vi.fn(async () => null) }))
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`
const goal = {
  onboarded: true,
  purpose: 'work',
  targetLevel: 'B2',
  fromLevel: 'A2',
  dailyMinutes: 30,
  deadlineWindow: 'none',
  route: 'self_study',
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 40 }, target: 'B2', reached: false },
}
function renderHome(props) {
  render(
    <I18nProvider>
      <LanguageProvider>
        <HomePage userLevel="A2" userName="Сакен" token={TOKEN} {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jts_tours_off', '1')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ configured: false }) })))
})

describe('HomePage — General English', () => {
  it('без профиля — прежняя карточка уровня', async () => {
    renderHome({ geProfile: null })
    await waitFor(() => expect(document.querySelector('.hm-level')).toBeTruthy())
    expect(document.querySelector('.ge-invite')).toBe(null)
  })

  it('уровень есть, анкеты нет — приглашение', async () => {
    const onGeStart = vi.fn()
    renderHome({ geProfile: { onboarded: false }, onGeStart })
    await waitFor(() => expect(screen.getByText('Составим ваш план')).toBeTruthy())
    expect(document.querySelector('.hm-level')).toBe(null)
    fireEvent.click(within(document.querySelector('.ge-invite')).getByRole('button'))
    expect(onGeStart).toHaveBeenCalled()
  })

  it('анкета есть, формата нет — шаг «выберите формат»', async () => {
    const onGeRoute = vi.fn()
    renderHome({ geProfile: { ...goal, route: null }, onGeRoute })
    await waitFor(() => expect(screen.getByText('Выберите, как будете заниматься')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать формат' }))
    expect(onGeRoute).toHaveBeenCalled()
  })

  it('всё есть — блок цели: дорожка, срок не указан, правка', async () => {
    const onGeEdit = vi.fn()
    renderHome({ geProfile: goal, onGeEdit })
    await waitFor(() => expect(document.querySelector('.ge-goal')).toBeTruthy())
    expect(screen.getByText('Срок не указан')).toBeTruthy()
    expect([...document.querySelectorAll('.ge-goal .ih-gb__track li span')].map((n) => n.textContent)).toEqual(['A2', 'A2', 'Сейчас · 40%', 'B2'])
    fireEvent.click(screen.getByRole('button', { name: /Указать срок/ }))
    expect(onGeEdit).toHaveBeenCalled()
  })
})
