// @vitest-environment jsdom
// Профиль по ТЗ v2.0, 5.8 (задача 190 «Добавить правила на главную»): группы Учёба · Аккаунт · Помощь · Документы,
// «Правила школы» ведут во вкладку «Правила» «Уроков», четыре плитки шапки (уровень, дни, уроки, токены) и НЕТ блока
// навыков — навыки только на «Главной» (ТЗ 5.5: две копии расчёта уже расходились, 32 % против 73 %).
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
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 0, total: 0 })),
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

const tile = (key) => document.querySelector(`.pf-stat[data-stat="${key}"]`)

beforeEach(() => {
  vi.clearAllMocks()
  phone.value = false
})

describe('Профиль — группы и правила (ТЗ 5.8)', () => {
  it('«Правила школы» в «Учёбе» открывают вкладку «Правила» «Уроков»', () => {
    const onNav = renderProfile()
    const study = document.querySelector('[data-section="study"]')
    expect(within(study).getByText('Тест на уровень')).toBeTruthy()
    fireEvent.click(within(study).getByText('Правила школы'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'rules' })
  })

  it('группы по ТЗ: «Аккаунт» и «Помощь», документы одним блоком, без дублей строк', () => {
    renderProfile()
    const account = document.querySelector('[data-section="account"]')
    expect(within(account).getByText('Редактировать профиль')).toBeTruthy()
    expect(within(account).getByText('Язык')).toBeTruthy()
    const help = document.querySelector('[data-section="help"]')
    expect(within(help).getByText('Обратная связь')).toBeTruthy()
    expect(within(help).getByText('Служба поддержки')).toBeTruthy()
    expect(within(help).getByText('Поделиться приложением')).toBeTruthy()
    // Документы — блок «Документы платформы»; строк «Политика конфиденциальности» в списках больше нет.
    expect(screen.getByText('Документы платформы')).toBeTruthy()
    expect(document.querySelector('.pf-row[data-key="privacy"]')).toBeNull()
    expect(document.querySelector('.pf-row[data-key="terms"]')).toBeNull()
  })

  it('блока «Навыки» нет — навыки только на «Главной»', () => {
    renderProfile()
    expect(screen.queryByText('Навыки')).toBeNull()
    expect(document.querySelector('.pf-skills')).toBeNull()
  })

  it('четыре плитки: уровень, дни подряд, уроки, токены', async () => {
    renderProfile()
    expect(tile('level').querySelector('b').textContent).toBe('B1')
    await waitFor(() => expect(tile('tokens')?.querySelector('b').textContent).toMatch(/1.?250/))
    expect(tile('streak').querySelector('b').textContent).toBe('3')
    expect(tile('lessons').querySelector('b').textContent).toBe('8')
    expect(document.querySelector('.pf-stats').style.getPropertyValue('--pf-stats')).toBe('4')
  })

  it('уровня не знаем — плитка с прочерком, а не стартовым «A1»', () => {
    renderProfile({ userLevel: 'A1', levelUnknown: true })
    expect(tile('level').querySelector('b').textContent).toBe('—')
  })

  it('на телефоне: «Правила школы» есть, карточки навыков нет', () => {
    phone.value = true
    const onNav = renderProfile()
    expect(document.querySelector('.pfm-skill')).toBeNull()
    fireEvent.click(screen.getByText('Правила школы'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'rules' })
  })
})
