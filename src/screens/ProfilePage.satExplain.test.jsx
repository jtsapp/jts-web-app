// @vitest-environment jsdom
// Язык разборов SAT переехал с удалённого экрана «Когда вы реально можете заниматься?» в настройки профиля
// (ТЗ SAT 21.10, задача 3.1). Строка — только у тех, кто начал SAT.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const api = vi.hoisted(() => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getProfileStats: vi.fn(async () => ({ streak: 0, lessonsPassed: 0, lessonsSource: 'SELF_STUDY' })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getSatProfile: vi.fn(async () => ({ exists: true, explainLang: 'kk' })),
  saveSatProfile: vi.fn(async () => ({})),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 0, total: 0 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => ({})),
}))
vi.mock('../api.js', () => api)
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => null, loadSkillStatsRemote: vi.fn(async () => null) }))

import ProfilePage from './ProfilePage.jsx'

const TOKEN = `h.${btoa(JSON.stringify({ userId: 41 })).replace(/=+$/, '')}.s`
const show = () => render(
  <I18nProvider><ProfilePage userName="Сакен" userLevel="B1" token={TOKEN} onNav={() => {}} onLogout={() => {}} /></I18nProvider>,
)

describe('ProfilePage — язык разборов SAT', () => {
  beforeEach(() => vi.clearAllMocks())

  it('у начавшего SAT — строка с текущим языком, выбор сохраняется в профиль SAT', async () => {
    api.getSatMeCached.mockResolvedValue({ onboarded: true })
    show()
    const row = await screen.findByText('Язык разборов SAT')
    expect(row.closest('button').textContent).toContain('Қазақша')
    fireEvent.click(row)
    fireEvent.click(screen.getByText('English'))
    await waitFor(() => expect(api.saveSatProfile).toHaveBeenCalledWith(TOKEN, { explainLang: 'en' }))
  })

  it('без SAT строки нет', async () => {
    api.getSatMeCached.mockResolvedValue(null)
    show()
    await waitFor(() => expect(api.getSatMeCached).toHaveBeenCalled())
    expect(screen.queryByText('Язык разборов SAT')).toBeNull()
  })
})
