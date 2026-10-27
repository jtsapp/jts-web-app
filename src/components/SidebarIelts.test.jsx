// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://dev-tutor.justtostudy.kz/"}
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'
import { getIeltsMe, getSatMeCached } from '../api.js'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 7, streak: 2, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  // аккаунт IELTS ставит админка (V304) — сайдбар узнаёт о нём ручкой /mobile/ielts/plan/me
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: true, purchased: true })),
  getSatMeCached: vi.fn(async () => ({ access: false, purchased: true })),
}))

function tokenFor(role) {
  const b64 = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

// Дизайн «IELTS new»: у аккаунта IELTS в меню ровно эти разделы — без счётчиков и плашки уровня, с «Настройками»
// внизу. «Повторение» (Review) с 13.10.2026 в меню есть, первым после «Главной» (владелец, SAT-SYNC-PLAN E3).
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
    expect(items).toEqual(['Главная', 'Выбрать группу', 'Повторение', 'Практика', 'Speaking Buddy', 'Уроки', 'Домашняя работа', 'Словарь', 'IELTS', 'SAT', 'Мои токены', 'Призы', 'Feedback', 'Уведомления', 'Договоры'])
    expect(document.querySelector('.sb__balance')).toBeNull()
    expect(document.querySelector('.sb__role')).toBeNull()
    screen.getByRole('button', { name: 'Настройки' }).click()
    expect(onProfile).toHaveBeenCalled()
  })

  it('доступ к одному SAT даёт то же меню — с «Повторением», IELTS и SAT', async () => {
    getIeltsMe.mockResolvedValueOnce({ ieltsAccount: false, access: false, purchased: false })
    getSatMeCached.mockResolvedValueOnce({ access: true, purchased: true })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'SAT' })).toBeTruthy())
    const items = [...document.querySelectorAll('.sb__nav .sb__item')].map((b) => b.textContent)
    expect(items).not.toContain('IELTS')
    expect(items).toContain('SAT')
    expect(items[2]).toBe('Повторение')
    expect(items).toContain('Договоры')
    expect(items).toContain('Уведомления')
  })
})
