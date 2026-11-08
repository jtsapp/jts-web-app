// @vitest-environment jsdom
// Язык разборов SAT переехал с удалённого экрана «Когда вы реально можете заниматься?» в настройки профиля
// (ТЗ SAT 21.10, задача 3.1). Блок — только у тех, кто начал SAT.
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
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => null, loadSkillStatsRemote: vi.fn(async () => null), readLocalLevelSkillStats: () => null, loadLevelSkillStatsRemote: vi.fn(async () => null) }))

import ProfilePage from './ProfilePage.jsx'

const TOKEN = `h.${btoa(JSON.stringify({ userId: 41 })).replace(/=+$/, '')}.s`
const show = () => render(
  <I18nProvider><ProfilePage userName="Сакен" userLevel="B1" token={TOKEN} onNav={() => {}} onLogout={() => {}} /></I18nProvider>,
)

describe('ProfilePage — язык разборов SAT', () => {
  beforeEach(() => vi.clearAllMocks())

  it('у начавшего SAT — три варианта на странице, текущий отмечен, выбор сохраняется в профиль SAT (17:10151)', async () => {
    api.getSatMeCached.mockResolvedValue({ onboarded: true })
    show()
    expect(await screen.findByText('Язык объяснений')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Қазақша/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: /English/ }))
    await waitFor(() => expect(api.saveSatProfile).toHaveBeenCalledWith(TOKEN, { explainLang: 'en' }))
    expect(screen.getByRole('radio', { name: /English/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('без SAT блока нет', async () => {
    api.getSatMeCached.mockResolvedValue(null)
    show()
    await waitFor(() => expect(api.getSatMeCached).toHaveBeenCalled())
    expect(screen.queryByText('Язык объяснений')).toBeNull()
  })
})
