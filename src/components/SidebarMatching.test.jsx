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
const ready = (matchStatus) => ({ status: 'ready', card: { apiVersion: 2, matchStatus, tariffConfirmed: true, requests: [] }, handoffs: [] })

// «Мой учитель» (ТЗ 08) с 17.11.2026 — вкладка «Уроков» (задача 219): пункта меню нет, а бейдж «ждут действия ученика»
// переехал на «Уроки».
describe('Sidebar — подбор учителя', () => {
  it('пункта «Мой учитель» нет, бейдж действия — на «Уроках»', async () => {
    useMatching.mockReturnValue(ready('self'))
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    await waitFor(() => expect(document.querySelector('[data-nav="lessons"] .sb__badge')?.textContent).toBe('1'))
    expect(items()).not.toContain('my-teacher')
  })

  it('пока ждём учителей, бейджа нет', async () => {
    useMatching.mockReturnValue(ready('sent'))
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    await waitFor(() => expect(items()).toContain('lessons'))
    expect(document.querySelector('[data-nav="lessons"] .sb__badge')).toBeNull()
  })

  it('без подбора на стенде бейджа нет', async () => {
    useMatching.mockReturnValue({ status: 'unavailable', card: null, handoffs: [] })
    render(<I18nProvider><Sidebar token={tokenFor('STUDENT')} onNav={() => {}} /></I18nProvider>)
    await waitFor(() => expect(items()).toContain('lessons'))
    expect(document.querySelector('[data-nav="lessons"] .sb__badge')).toBeNull()
  })

  it('у преподавателя бейджа подбора нет', () => {
    useMatching.mockReturnValue(ready('self'))
    render(<I18nProvider><Sidebar token={tokenFor('TEACHER')} onNav={() => {}} /></I18nProvider>)
    expect(items()).not.toContain('my-teacher')
    expect(document.querySelector('[data-nav="lessons"] .sb__badge')).toBeNull()
  })
})
