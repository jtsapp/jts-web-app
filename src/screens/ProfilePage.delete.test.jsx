// @vitest-environment jsdom
// Удаление аккаунта из профиля (требование App Store): подтверждение отдельным шагом, один запрос на любое число
// нажатий, понятный текст на отказ и только после 200 — выход в «Аккаунт удалён» (onAccountDeleted у App).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getProfileStats: vi.fn(async () => ({ streak: 0, lessonsPassed: 0, lessonsSource: 'SELF_STUDY' })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getLearningPath: vi.fn(async () => null),
  countProgress: vi.fn(() => ({ done: 0, total: 0 })),
  updateUser: vi.fn(async () => ({})),
  getCurrentUser: vi.fn(async () => ({})),
  deleteMyAccount: vi.fn(),
}))

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => null,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

import ProfilePage from './ProfilePage.jsx'
import AccountDeletedPage from './AccountDeletedPage.jsx'
import { deleteMyAccount } from '../api.js'
import { deletionErrorKey } from './profile/useAccountDeletion.js'

function renderProfile(props = {}) {
  const onAccountDeleted = vi.fn()
  render(
    <I18nProvider>
      <ProfilePage userName="Сакен" userLevel="B1" token="T" onNav={() => {}} onLogout={() => {}} onAccountDeleted={onAccountDeleted} {...props} />
    </I18nProvider>,
  )
  return { onAccountDeleted }
}

// Красная кнопка подтверждения. По тексту не ищем: «Удалить аккаунт» подписана и ссылка под «Выйти».
function confirmButton() {
  return document.querySelector('.pfd-del')
}

function openDesktopDialog() {
  fireEvent.click(document.querySelector('.pf-delete-link'))
  expect(screen.getByRole('dialog', { name: 'Удаление аккаунта' })).toBeTruthy()
}

// Текст отказа окна удаления (role="alert" на экране не один — свои плашки есть и у оболочки кабинета).
function findError() {
  return waitFor(() => {
    const el = document.querySelector('.pfd-err')
    if (!el) throw new Error('нет текста ошибки')
    return el
  })
}

// Телефон: useMediaQuery читает matchMedia, в jsdom его нет — даём ответ «≤560px».
function asPhone() {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(max-width: 560px)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  localStorage.clear()
  deleteMyAccount.mockReset()
  // Экраны стопки телефона открываются с верха страницы; в jsdom прокрутки нет.
  window.scrollTo = vi.fn()
})
afterEach(() => {
  delete window.matchMedia
})

describe('удаление аккаунта — компьютер', () => {
  it('успех: подтверждение, один запрос на двойное нажатие, выход в «Аккаунт удалён»', async () => {
    let resolve
    deleteMyAccount.mockImplementation(() => new Promise((r) => (resolve = r)))
    const { onAccountDeleted } = renderProfile()
    // Ссылка сама ничего не удаляет — только открывает подтверждение.
    openDesktopDialog()
    expect(deleteMyAccount).not.toHaveBeenCalled()

    fireEvent.click(confirmButton())
    fireEvent.click(confirmButton())
    expect(deleteMyAccount).toHaveBeenCalledTimes(1)
    expect(deleteMyAccount).toHaveBeenCalledWith('T')
    expect(confirmButton().disabled).toBe(true)
    expect(screen.getByText('Удаляем…')).toBeTruthy()

    await act(async () => resolve({ success: true }))
    expect(onAccountDeleted).toHaveBeenCalledTimes(1)
  })

  it('403: аккаунт сотрудника — понятный текст, выхода нет, можно закрыть', async () => {
    deleteMyAccount.mockRejectedValue(Object.assign(new Error('x'), { status: 403 }))
    const { onAccountDeleted } = renderProfile()
    openDesktopDialog()
    fireEvent.click(confirmButton())
    expect((await findError()).textContent).toBe('Аккаунт сотрудника удаляет администратор. Напишите в службу поддержки.')
    expect(onAccountDeleted).not.toHaveBeenCalled()
    expect(confirmButton().disabled).toBe(false)
    fireEvent.click(screen.getByText('Оставить аккаунт'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('сбой сети: текст про связь и повтор тем же нажатием', async () => {
    deleteMyAccount.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 0 }))
    deleteMyAccount.mockResolvedValueOnce({ success: true })
    const { onAccountDeleted } = renderProfile()
    openDesktopDialog()
    fireEvent.click(confirmButton())
    expect((await findError()).textContent).toMatch(/Нет связи с сервером/)
    expect(onAccountDeleted).not.toHaveBeenCalled()

    fireEvent.click(confirmButton())
    await waitFor(() => expect(onAccountDeleted).toHaveBeenCalledTimes(1))
    expect(deleteMyAccount).toHaveBeenCalledTimes(2)
  })

  it('404 (бэкенд без ручки): кнопка не прячется, говорим, что удаление пока недоступно', async () => {
    deleteMyAccount.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }))
    renderProfile()
    openDesktopDialog()
    fireEvent.click(confirmButton())
    expect((await findError()).textContent).toMatch(/пока недоступно/)
  })

  it('«Оставить аккаунт» закрывает окно без запроса', () => {
    renderProfile()
    openDesktopDialog()
    fireEvent.click(screen.getByText('Оставить аккаунт'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(deleteMyAccount).not.toHaveBeenCalled()
  })
})

describe('удаление аккаунта — телефон', () => {
  it('профиль → настройки → «Удалить аккаунт» → подтверждение', async () => {
    asPhone()
    deleteMyAccount.mockResolvedValue({ success: true })
    const { onAccountDeleted } = renderProfile()
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }))
    fireEvent.click(document.querySelector('.pfm-out__del'))
    expect(screen.getByText('Удалить аккаунт навсегда?')).toBeTruthy()
    expect(deleteMyAccount).not.toHaveBeenCalled()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(onAccountDeleted).toHaveBeenCalledTimes(1))
    expect(deleteMyAccount).toHaveBeenCalledTimes(1)
  })

  it('«Оставить аккаунт» возвращает в настройки', () => {
    asPhone()
    renderProfile()
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }))
    fireEvent.click(document.querySelector('.pfm-out__del'))
    fireEvent.click(screen.getByText('Оставить аккаунт'))
    expect(screen.getByText('Помощь и документы')).toBeTruthy()
    expect(deleteMyAccount).not.toHaveBeenCalled()
  })
})

describe('экран «Аккаунт удалён»', () => {
  it('«На главную» уводит на приветствие', () => {
    const onHome = vi.fn()
    render(
      <I18nProvider>
        <AccountDeletedPage onHome={onHome} />
      </I18nProvider>,
    )
    expect(screen.getByText('Аккаунт удалён')).toBeTruthy()
    fireEvent.click(screen.getByText('На главную'))
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})

describe('deletionErrorKey', () => {
  it('код отказа → текст', () => {
    expect(deletionErrorKey({ status: 403 })).toBe('profile.delete.errStaff')
    expect(deletionErrorKey({ status: 404 })).toBe('profile.delete.errUnavailable')
    expect(deletionErrorKey({ status: 0 })).toBe('profile.delete.errNetwork')
    expect(deletionErrorKey(new Error('x'))).toBe('profile.delete.errNetwork')
    expect(deletionErrorKey({ status: 500 })).toBe('profile.delete.errServer')
  })
})
