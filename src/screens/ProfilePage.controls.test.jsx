// @vitest-environment jsdom
// Мёртвые элементы профиля: выглядели рабочими, но ничего не делали.
// - «Push-уведомления» писали флаг, который никто не читал; у веба пушей нет,
//   а настоящая настройка кабинета — звук уведомлений (lib/notifySound.js).
// - «Оценить приложение» делало то же, что «Поделиться»: оценивать в вебе негде.
// - «Разговорных клубов: 0» — клубов нет, счётчик всегда ноль.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 0, total: 0 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => ({})),
}))

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => null,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

import ProfilePage from './ProfilePage.jsx'
import { isSoundEnabled } from '../lib/notifySound.js'

function renderProfile() {
  return render(
    <I18nProvider>
      <ProfilePage userName="Сакен" userLevel="B1" token="T" onNav={() => {}} onLogout={() => {}} />
    </I18nProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('ProfilePage — только работающие элементы', () => {
  it('нет «Оценить приложение» и счётчика клубов', () => {
    renderProfile()
    expect(screen.queryByText('Оценить приложение')).toBeNull()
    expect(screen.queryByText(/разговорных клубов/i)).toBeNull()
    // «Поделиться» остаётся — он работает.
    expect(screen.getByText('Поделиться приложением')).toBeTruthy()
  })

  it('переключатель в «Уведомлениях» управляет звуком уведомлений кабинета', () => {
    renderProfile()
    expect(isSoundEnabled()).toBe(true)
    fireEvent.click(screen.getByText('Уведомления'))
    fireEvent.click(screen.getByText('Звук уведомлений'))
    expect(isSoundEnabled()).toBe(false)
    fireEvent.click(screen.getByText('Звук уведомлений'))
    expect(isSoundEnabled()).toBe(true)
  })
})
