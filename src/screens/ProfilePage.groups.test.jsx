// @vitest-environment jsdom
// Профиль на компьютере — задача 214 доски (ТЗ и прототип 18.11.2026): шапка с одним уровнем, «Обучение»,
// «Настройки», «Аккаунт и помощь»; «Правила школы» и документы — одной строкой «Правила школы и документы», окном.
// Блока навыков нет — навыки только на «Главной» (ТЗ v2.0, 5.5: две копии расчёта уже расходились, 32 % против 73 %).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const phone = { value: false }

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getProfileStats: vi.fn(async () => ({ streak: 3, lessonsPassed: 8, lessonsSource: 'TEACHER' })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getLearningPath: vi.fn(async () => ({})),
  countProgress: vi.fn(() => ({ done: 7, total: 12 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => ({})),
  getMyTokens: vi.fn(async () => ({ period: { balance: 1250 }, prizes: [] })),
}))

vi.mock('../lib/useMediaQuery.js', async (orig) => ({ ...(await orig()), useMediaQuery: () => phone.value }))

import ProfilePage from './ProfilePage.jsx'

function renderProfile(props = {}) {
  const onNav = vi.fn()
  render(
    <I18nProvider>
      <ProfilePage userName="Сакен" userLevel="B1" token="T" onNav={onNav} onLogout={() => {}} onLevelTest={() => {}} {...props} />
    </I18nProvider>,
  )
  return onNav
}

const stat = (key) => document.querySelector(`.pf2-stat[data-stat="${key}"]`)
const section = (key) => document.querySelector(`[data-section="${key}"]`)

beforeEach(() => {
  vi.clearAllMocks()
  phone.value = false
  // правила открываются с начала документа (openRules поднимает окно); у jsdom scrollTo нет
  window.scrollTo = vi.fn()
})

describe('Профиль на компьютере — задача 214', () => {
  it('уровень в содержимом профиля один раз — чипом звания в шапке', () => {
    renderProfile()
    expect(document.querySelector('.pf2-chip[data-chip="rank"]').textContent).toBe('Барон · B1')
    const main = document.querySelector('.pf2')
    expect(main.textContent.match(/B1/g)).toHaveLength(2) // чип и «Тест на уровень · B1»
    expect(stat('level')).toBeNull()
  })

  it('полоса до следующего звания — с числами', async () => {
    renderProfile()
    const bar = await waitFor(() => {
      const el = document.querySelector('.pf2-prog__bar')
      expect(el.getAttribute('aria-valuenow')).toBe('7')
      return el
    })
    expect(bar.getAttribute('role')).toBe('progressbar')
    expect(bar.getAttribute('aria-valuemax')).toBe('12')
    expect(document.querySelector('.pf2-prog__row').textContent).toMatch(/До звания «Виконт».*7.*из 12 заданий/)
  })

  it('цифры шапки: дни подряд, уроки, токены', async () => {
    renderProfile()
    await waitFor(() => expect(stat('tokens')?.querySelector('b').textContent).toMatch(/1.?250/))
    expect(stat('streak').querySelector('b').textContent).toBe('3')
    expect(stat('lessons').querySelector('b').textContent).toBe('8')
  })

  it('уровня не знаем — ни чипа звания, ни полосы; в «Целях» тест не пройден и подсвечен', () => {
    renderProfile({ userLevel: 'A1', levelUnknown: true })
    expect(document.querySelector('.pf2-chip[data-chip="rank"]')).toBeNull()
    expect(document.querySelector('.pf2-prog')).toBeNull()
    const row = section('goals').querySelector('[data-key="level-test"]')
    expect(row.textContent).toMatch(/Не пройден/)
    expect(row.querySelector('.pf2-row__v.is-warn')).toBeTruthy()
  })

  it('порядок разделов: Обучение → Настройки → Аккаунт и помощь', () => {
    renderProfile()
    const titles = [...document.querySelectorAll('.pf2-sect')].map((n) => n.textContent)
    expect(titles).toEqual(['Обучение', 'Настройки', 'Аккаунт и помощь'])
  })

  it('«Аккаунт и помощь»: язык, оформление, помощь, правила и документы, поделиться, выход', () => {
    renderProfile()
    const keys = [...section('account').querySelectorAll('[data-key]')].map((n) => n.dataset.key)
    expect(keys).toEqual(['lang', 'custom', 'help', 'docs', 'share', 'logout'])
    expect(section('account').querySelector('[data-key="logout"]').classList.contains('is-danger')).toBe(true)
    // Документы не дублируют футер на странице: блок — в окне строки «Правила школы и документы».
    expect(screen.queryByText('Документы платформы')).toBeNull()
  })

  it('«Правила школы и документы» — окно: правила ведут во вкладку «Правила» «Уроков», документы там же', () => {
    const onNav = renderProfile()
    fireEvent.click(section('account').querySelector('[data-key="docs"]'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Документы платформы')).toBeTruthy()
    fireEvent.click(within(dialog).getByText('Правила школы'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'rules' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('«Поддержка и обратная связь» — окно с двумя путями', () => {
    const onNav = renderProfile()
    fireEvent.click(section('account').querySelector('[data-key="help"]'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Служба поддержки')).toBeTruthy()
    fireEvent.click(within(dialog).getByText('Обратная связь'))
    expect(onNav).toHaveBeenCalledWith('feedback')
  })

  it('окно закрывается по Esc', () => {
    renderProfile()
    fireEvent.click(section('account').querySelector('[data-key="help"]'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('«Удалить аккаунт» — тихая ссылка под карточкой и подтверждение окном', () => {
    renderProfile()
    expect(section('account').querySelector('.pf-delete-link')).toBeNull()
    fireEvent.click(document.querySelector('.pf2-delete .pf-delete-link'))
    expect(screen.getByRole('dialog', { name: 'Удаление аккаунта' })).toBeTruthy()
  })

  it('блока «Навыки» нет — навыки только на «Главной»', () => {
    renderProfile()
    expect(screen.queryByText('Навыки')).toBeNull()
    expect(document.querySelector('.pf-skills')).toBeNull()
  })

  it('на телефоне: «Правила школы» есть, карточки навыков нет', () => {
    phone.value = true
    const onNav = renderProfile()
    expect(document.querySelector('.pfm-skill')).toBeNull()
    fireEvent.click(screen.getByText('Правила школы'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'rules' })
  })
})
