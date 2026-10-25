// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://ai-tutor.justtostudy.kz/" }
// На проде (ai-tutor.justtostudy.kz) раздел SAT в меню показывается так же, как на деве: ученику с открытым доступом
// он виден (раньше по домену скрывался).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 7, streak: 2, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false, access: false })),
  getSatMeCached: vi.fn(async () => ({ access: true, purchased: true })),
}))

function tokenFor(role) {
  const b64 = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

describe('Sidebar — SAT виден на проде', () => {
  it('у ученика с доступом к SAT пункт «SAT» в меню есть', async () => {
    expect(window.location.hostname).toBe('ai-tutor.justtostudy.kz')
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'SAT' })).toBeTruthy())
    const items = [...document.querySelectorAll('.sb__nav .sb__item')].map((b) => b.textContent)
    expect(items).toContain('SAT')
    expect(items).toContain('Главная')
    expect(items.length).toBeGreaterThan(3)
  })
})
