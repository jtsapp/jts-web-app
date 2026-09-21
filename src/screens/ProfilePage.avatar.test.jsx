// @vitest-environment jsdom
// Фото профиля: как есть оно не влезало в localStorage и молча исчезало после
// перезагрузки. Теперь экран ужимает его, а не сумев — говорит об этом.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

vi.mock('../lib/shrinkImage.js', () => ({ shrinkImage: vi.fn() }))

import { shrinkImage } from '../lib/shrinkImage.js'
import ProfilePage from './ProfilePage.jsx'

const TOKEN = `h.${btoa(JSON.stringify({ userId: 41 })).replace(/=+$/, '')}.s`

function pick() {
  render(
    <I18nProvider>
      <ProfilePage userName="Сакен" userLevel="B1" token={TOKEN} onNav={() => {}} onLogout={() => {}} />
    </I18nProvider>,
  )
  const input = document.querySelector('input[type="file"]')
  fireEvent.change(input, { target: { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] } })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ProfilePage — фото профиля', () => {
  it('кладёт в хранилище уменьшенное фото, а не исходный файл', async () => {
    shrinkImage.mockResolvedValueOnce('data:image/webp;base64,SMALL')
    pick()
    await waitFor(() => expect(document.querySelector('.pf-avatar__img')?.getAttribute('src')).toBe('data:image/webp;base64,SMALL'))
    expect(localStorage.getItem('jts_profile_avatar:41')).toBe('data:image/webp;base64,SMALL')
  })

  it('не прочитав картинку, говорит об этом и не показывает фото', async () => {
    shrinkImage.mockRejectedValueOnce(new Error('not an image'))
    pick()
    expect(await screen.findByText(/не удалось сохранить фото/i)).toBeTruthy()
    expect(document.querySelector('.pf-avatar__img')).toBeNull()
  })

  it('не влезло в хранилище — говорит об этом, а не показывает фото до перезагрузки', async () => {
    shrinkImage.mockResolvedValueOnce('data:image/webp;base64,SMALL')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k) => {
      if (String(k).startsWith('jts_profile_avatar')) throw new DOMException('quota', 'QuotaExceededError')
    })
    pick()
    expect(await screen.findByText(/не удалось сохранить фото/i)).toBeTruthy()
    expect(document.querySelector('.pf-avatar__img')).toBeNull()
    spy.mockRestore()
  })
})
