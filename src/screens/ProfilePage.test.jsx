// @vitest-environment jsdom
// Форма «Редактировать профиль». Из /user/me подтягивалась только дата
// рождения — email и город открывались пустыми, и ученик думал, что данные
// пропали. А переключатель пола сохранял в никуда: у бэкенда нет такого поля
// ни в ответе, ни в UpdateUserRequest, при этом тост говорил «Сохранено».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const me = { value: {} }

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 0, total: 0 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => me.value),
}))

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => null,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

import { updateUser } from '../api.js'
import ProfilePage from './ProfilePage.jsx'

function renderProfile() {
  return render(
    <I18nProvider>
      <ProfilePage userName="Сакен" userLevel="B1" userPhone="77001234567" token="T" onNav={() => {}} onLogout={() => {}} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  me.value = { name: 'Сакен', email: 'saken@example.kz', city: 'Алматы', birthDate: '2001-05-04' }
})

describe('ProfilePage — форма редактирования', () => {
  it('подставляет email и город из профиля', async () => {
    renderProfile()
    fireEvent.click(screen.getByText('Редактировать профиль'))
    await waitFor(() => expect(screen.getByDisplayValue('saken@example.kz')).toBeTruthy())
    expect(screen.getByDisplayValue('Алматы')).toBeTruthy()
  })

  it('не предлагает выбрать пол — сохранить его бэкенду некуда', async () => {
    renderProfile()
    fireEvent.click(screen.getByText('Редактировать профиль'))
    await waitFor(() => expect(screen.getByDisplayValue('saken@example.kz')).toBeTruthy())
    expect(document.querySelector('.pf-seg')).toBeNull()
  })

  it('сохраняет подставленные значения, а не пустые', async () => {
    renderProfile()
    fireEvent.click(screen.getByText('Редактировать профиль'))
    await waitFor(() => expect(screen.getByDisplayValue('Алматы')).toBeTruthy())
    fireEvent.click(screen.getByText('Сохранить'))
    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    const body = updateUser.mock.calls[0][1]
    expect(body).toMatchObject({ email: 'saken@example.kz', city: 'Алматы' })
    expect(body).not.toHaveProperty('gender')
  })
})
