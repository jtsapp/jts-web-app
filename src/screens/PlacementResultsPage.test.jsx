// @vitest-environment jsdom
//
// «Результаты теста» своей страницей (ТЗ v2.0 «Луна-трекер», 5.5 и 5.7): полный отчёт теста уровня ушёл с «Главной»
// сюда. Пересдача — кнопкой здесь же (обратная связь 11.11); кнопка теста — тому, кто его не проходил.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import envelope from '../placement/__fixtures__/envelope-b1.json'

const latest = { value: null }
vi.mock('../placement/api.js', () => ({
  fetchLatestAttempt: vi.fn(async () => latest.value),
  saveAttempt: vi.fn(async () => true),
}))
vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getMySections: vi.fn(async () => ({ known: false, allowed: [] })),
  getMyHomework: vi.fn(async () => []),
  getMyMaterialAssignments: vi.fn(async () => []),
}))

import PlacementResultsPage from './PlacementResultsPage.jsx'

function draw(props = {}) {
  const onNav = vi.fn()
  const onStartTest = vi.fn()
  const onRetake = vi.fn()
  render(
    <I18nProvider>
      <PlacementResultsPage token="T" userName="Сакен" userLevel="B1" onNav={onNav} onStartTest={onStartTest} onRetake={onRetake} {...props} />
    </I18nProvider>,
  )
  return { onNav, onStartTest, onRetake }
}

beforeEach(() => {
  // страница прокручивает окно наверх при входе — в jsdom scrollTo нет
  window.scrollTo = vi.fn()
  localStorage.clear()
  latest.value = null
})

describe('PlacementResultsPage', () => {
  it('теста нет — «Не пройден» и кнопка теста, без «Скрыть»', async () => {
    const { onStartTest } = draw()
    expect(await screen.findByText('Не пройден')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Скрыть' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Пройти тест уровня' }))
    expect(onStartTest).toHaveBeenCalledTimes(1)
  })

  it('тест пройден — отчёт, «что дальше» и одна кнопка «Пройти тест заново»', async () => {
    latest.value = envelope
    const { onRetake, onStartTest } = draw()
    await waitFor(() => expect(document.querySelector('.pl-report__level')).toBeTruthy())
    expect(document.querySelector('.pl-report--missing')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Скрыть' })).toBeNull()
    const retake = screen.getAllByRole('button', { name: 'Пройти тест заново' })
    expect(retake).toHaveLength(1)
    fireEvent.click(retake[0])
    expect(onRetake).toHaveBeenCalledTimes(1)
    expect(onStartTest).not.toHaveBeenCalled()
  })

  it('«На главную» ведёт на «Главную»', async () => {
    const { onNav } = draw()
    fireEvent.click(screen.getByRole('button', { name: '← На главную' }))
    expect(onNav).toHaveBeenCalledWith('home')
  })
})
