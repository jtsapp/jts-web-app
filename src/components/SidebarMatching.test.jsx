// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getMySections: vi.fn(async () => ({ known: false, allowed: [] })),
  getBalance: vi.fn().mockResolvedValue({ coins: 0, streak: 0, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false, purchased: false })),
  getSatMeCached: vi.fn(async () => ({ access: false, purchased: false })),
}))
vi.mock('../matching/matchingStore.js', () => ({ useMatching: vi.fn() }))
import { useMatching } from '../matching/matchingStore.js'

function tokenFor(role) {
  const b64 = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

const items = () => [...document.querySelectorAll('.sb__nav [data-nav]')].map((b) => b.dataset.nav)

// «Мой учитель» (ТЗ 08 §1): под «Главной», с бейджем, когда ждут действия ученика; без подбора на стенде — нет пункта.
describe('Sidebar — «Мой учитель»', () => {
  it('stands right after «Главная» with an action badge', async () => {
    useMatching.mockReturnValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self', tariffConfirmed: true, requests: [] }, handoffs: [] })
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    await waitFor(() => expect(items().slice(0, 2)).toEqual(['home', 'my-teacher']))
    expect(document.querySelector('[data-nav="my-teacher"] .sb__badge').textContent).toBe('1')
  })

  it('has no badge while waiting for teachers', () => {
    useMatching.mockReturnValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'sent', tariffConfirmed: true, requests: [] }, handoffs: [] })
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    expect(document.querySelector('[data-nav="my-teacher"] .sb__badge')).toBeNull()
  })

  it('is hidden when the backend has no matching v2', () => {
    useMatching.mockReturnValue({ status: 'unavailable', card: null, handoffs: [] })
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    expect(items()).not.toContain('my-teacher')
  })

  it('is never shown to a teacher', () => {
    useMatching.mockReturnValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self', tariffConfirmed: true, requests: [] }, handoffs: [] })
    render(<I18nProvider><Sidebar token={tokenFor('TEACHER')} onNav={() => {}} /></I18nProvider>)
    expect(items()).not.toContain('my-teacher')
  })
})
