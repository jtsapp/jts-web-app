// @vitest-environment jsdom
// «Дней подряд» и «уроков пройдено» берутся с сервера одним запросом: серия — по входам, уроки — занятия с
// преподавателем или, если их нет, «Самостоятельно». Раньше обе цифры считались на клиенте и у всех были нулями.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const stats = { value: { streak: 0, lessonsPassed: 0, lessonsSource: 'SELF_STUDY' } }

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 99, streakActiveToday: false })),
  getProfileStats: vi.fn(async () => stats.value),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getSatMeCached: vi.fn(async () => ({ access: false })),
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 7, total: 10 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => ({})),
}))

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => null,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

import ProfilePage from './ProfilePage.jsx'

const tileValue = (label) => screen.getByText(label).parentElement.querySelector('b').textContent

beforeEach(() => vi.clearAllMocks())

describe('ProfilePage — цифры статистики', () => {
  it('показывает серию и уроки из ответа сервера, а не из тропы «Повторения»', async () => {
    stats.value = { streak: 5, lessonsPassed: 12, lessonsSource: 'TEACHER' }
    render(
      <I18nProvider>
        <ProfilePage userName="Сакен" userLevel="A1" token="T" onNav={() => {}} onLogout={() => {}} />
      </I18nProvider>,
    )

    await waitFor(() => expect(tileValue('дней подряд')).toBe('5'))
    expect(tileValue('уроков пройдено')).toBe('12')
  })
})
