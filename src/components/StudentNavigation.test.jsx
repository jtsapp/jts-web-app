// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://dev-tutor.justtostudy.kz/"}
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import ServicesPage from '../screens/ServicesPage.jsx'
import MobileTabBar from './MobileTabBar.jsx'
import { getMySections } from '../api.js'

vi.mock('../api.js', () => ({
  getMySections: vi.fn(),
  getIeltsMe: vi.fn(async () => ({ purchased: true })),
  getSatMeCached: vi.fn(async () => ({ purchased: true })),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false })),
  getUnreadNotificationCount: vi.fn(async () => 0),
}))
vi.mock('../matching/matchingStore.js', () => ({ useMatching: () => ({ status: 'unavailable', card: null, handoffs: [] }) }))
vi.mock('../contracts/useContracts.js', () => ({ useContractsBadge: () => 0 }))

const token = `e30.${btoa(JSON.stringify({ userId: 221, role: 'STUDENT' }))}.sig`
const access = (allowed) => ({ known: true, tariff: 'GENERAL', format: 'INDIVIDUAL', allowed })
const menuKeys = (root) => [...root.querySelectorAll('.sb__nav [data-nav]')].map((item) => item.dataset.nav)
const tabKeys = (root) => [...root.querySelectorAll('[data-tab]')].map((item) => item.dataset.tab)
const tileNames = (root) => [...root.querySelectorAll('.svc-tile__name')].map((item) => item.textContent)
beforeEach(() => { getMySections.mockReset() })

function draw() {
  return render(<I18nProvider>
    <ServicesPage token={token} onNav={() => {}} />
    <MobileTabBar token={token} active="services" onNav={() => {}} />
  </I18nProvider>)
}

describe('одни права для компьютера и телефона', () => {
  it('открытые меню и плитки обновляются вместе после смены тарифа без перемонтирования', async () => {
    getMySections.mockResolvedValue(access(['lessons', 'sat']))
    const { container } = draw()
    expect(menuKeys(container)).not.toContain('lessons')
    await waitFor(() => expect(tileNames(container)).toContain('SAT'))
    expect(menuKeys(container)).toContain('sat')
    expect(tabKeys(container)).toEqual(['home', 'lessons', 'services'])
    expect(getMySections).toHaveBeenCalledTimes(1)

    getMySections.mockResolvedValue(access(['practice', 'ielts']))
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    await waitFor(() => expect(tileNames(container)).toContain('IELTS'))
    expect(tileNames(container)).not.toContain('SAT')
    expect(menuKeys(container)).toContain('practice')
    expect(menuKeys(container)).not.toContain('lessons')
    expect(tabKeys(container)).toEqual(['home', 'practice', 'services'])
    expect(getMySections).toHaveBeenCalledTimes(2)
  })

  it('сбой обновления скрывает старые вкладки на всех поверхностях, а повтор восстанавливает', async () => {
    getMySections.mockResolvedValue(access(['lessons', 'sat']))
    const { container } = draw()
    await waitFor(() => expect(tileNames(container)).toContain('SAT'))
    getMySections.mockRejectedValue(new Error('offline'))
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    await waitFor(() => expect(menuKeys(container)).not.toContain('lessons'))
    expect(tileNames(container)).not.toContain('SAT')
    expect(tabKeys(container)).toEqual(['home', 'services'])
    expect(menuKeys(container)).toContain('contracts')
    getMySections.mockResolvedValue(access(['lessons']))
    fireEvent.click(within(container.querySelector('.svc')).getByRole('button', { name: 'Повторить проверку' }))
    await waitFor(() => expect(tabKeys(container)).toContain('lessons'))
    expect(menuKeys(container)).toContain('lessons')
    expect(container.querySelector('[data-testid="section-access-notice"]')).toBeNull()
  })
})
