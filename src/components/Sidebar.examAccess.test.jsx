// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const me = { ielts: { ieltsAccount: false }, sat: null }

vi.mock('../api.js', () => ({
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => me.ielts),
  getSatMeCached: vi.fn(async () => me.sat),
}))

import Sidebar from './Sidebar.jsx'
import { ieltsAccountRedirect } from '../lib/ieltsAccountRedirect.js'

function draw(onNav = () => {}) {
  return render(
    <I18nProvider>
      <Sidebar token="T" userName="Тест" active="home" onNav={onNav} onProfile={() => {}} />
    </I18nProvider>,
  )
}

const labels = () => [...document.querySelectorAll('.sb__nav .sb__item span')].map((s) => s.textContent)

// E3 (SAT-SYNC-PLAN): пункт «Повторение» (Review, nav.learning) виден ученику с доступом к IELTS или SAT, первым
// после «Главной», и ведёт на экран «Повторения», а не в IELTS.
describe('Sidebar: «Повторение» у учеников IELTS и SAT', () => {
  beforeEach(() => {
    me.ielts = { ieltsAccount: false }
    me.sat = null
  })

  it('у ученика с доступом к SAT меню экзаменов — с «Повторением» первым', async () => {
    me.sat = { access: true, purchased: true }
    draw()
    await waitFor(() => expect(labels()).toContain('SAT'))
    const l = labels()
    expect(l[0]).toBe('Главная')
    expect(l[1]).toBe('Повторение')
    expect(l).not.toContain('IELTS')
  })

  it('у аккаунта IELTS — тоже', async () => {
    me.ielts = { ieltsAccount: true }
    draw()
    await waitFor(() => expect(document.querySelector('.sb__item--settings')).not.toBeNull())
    expect(labels()[1]).toBe('Повторение')
  })

  it('нажатие ведёт на экран «Повторения» (learning), а App не уводит его в IELTS', async () => {
    me.sat = { access: true, purchased: true }
    const onNav = vi.fn()
    draw(onNav)
    await waitFor(() => expect(labels()).toContain('SAT'))
    fireEvent.click(screen.getByText('Повторение'))
    expect(onNav).toHaveBeenCalledWith('learning')
    // 'learning' открывает тропу kingdom; у ученика экзамена она остаётся на месте
    expect(ieltsAccountRedirect(true, 'kingdom')).toBeNull()
    expect(ieltsAccountRedirect(true, 'kingdom-interior')).toBeNull()
    // а письменный тест уровня General English на входе по-прежнему пропускается
    expect(ieltsAccountRedirect(true, 'test-intro')).toBe('home')
    expect(ieltsAccountRedirect(false, 'test-intro')).toBeNull()
  })
})
