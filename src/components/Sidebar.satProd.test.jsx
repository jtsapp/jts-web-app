// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://ai-tutor.justtostudy.kz/" }
// На проде (ai-tutor.justtostudy.kz) раздел SAT в меню не показывается — даже ученику с открытым доступом;
// на деве и локально он виден (см. остальные Sidebar*.test.jsx).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 7, streak: 2, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false, access: false })),
  getSatMeCached: vi.fn(async () => ({ access: true })),
}))

function tokenFor(role) {
  const b64 = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

describe('Sidebar — SAT скрыт на проде', () => {
  it('у ученика с доступом к SAT пункта «SAT» нет, остальное меню на месте', async () => {
    expect(window.location.hostname).toBe('ai-tutor.justtostudy.kz')
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Настройки' })).toBeTruthy())
    const items = [...document.querySelectorAll('.sb__nav .sb__item')].map((b) => b.textContent)
    expect(items).not.toContain('SAT')
    expect(items).toContain('Главная')
    expect(items.length).toBeGreaterThan(3)
  })
})
