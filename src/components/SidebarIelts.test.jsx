// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 7, streak: 2, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  // аккаунт IELTS ставит админка (V304) — сайдбар узнаёт о нём ручкой /mobile/ielts/plan/me
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: true })),
}))

function tokenFor(role) {
  const b64 = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

// Дизайн «IELTS new»: у аккаунта IELTS в меню ровно эти разделы — без «Повторения» (курс General English), счётчиков
// и плашки уровня, с «Настройками» внизу.
describe('Sidebar — аккаунт IELTS', () => {
  it('показывает только разделы из макета', async () => {
    const onProfile = vi.fn()
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={onProfile} />
      </I18nProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Настройки' })).toBeTruthy())
    const items = [...document.querySelectorAll('.sb__nav .sb__item')].map((b) => b.textContent)
    expect(items).toEqual(['Главная', 'Практика', 'Speaking Buddy', 'Уроки', 'Домашняя работа', 'Словарь', 'IELTS'])
    expect(screen.queryByText('Повторение')).toBeNull()
    expect(document.querySelector('.sb__balance')).toBeNull()
    expect(document.querySelector('.sb__role')).toBeNull()
    screen.getByRole('button', { name: 'Настройки' }).click()
    expect(onProfile).toHaveBeenCalled()
  })
})
