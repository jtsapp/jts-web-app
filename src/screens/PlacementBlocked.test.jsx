// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../practice/placement/engine.js', () => ({
  loadPlacementBank: vi.fn(async () => ({ bank: { items: [] }, manifest: {}, vocab: {} })),
  createPlacementSession: vi.fn(() => ({})),
  audioUrl: (f) => f,
}))

import PlacementTestPage from './PlacementTestPage.jsx'

// Уровень профиль определяет один раз — при регистрации. Если тест уже пройден,
// экран не должен предлагать его заново (и тем более записывать новый уровень).
describe('PlacementTestPage — тест уже пройден', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ configured: true, completed: true, level: 'A2' }),
    }))
  })
  afterEach(() => vi.restoreAllMocks())

  it('показывает уже определённый уровень вместо нового прогона', async () => {
    const onDone = vi.fn()
    render(
      <I18nProvider>
        <PlacementTestPage lang="ru" onDone={onDone} onLevel={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Уровень уже определён')).toBeTruthy())
    expect(screen.getByText('A2')).toBeTruthy()
    // Уровня в аккаунте нет, а прогон закончен: сохраняем его результат, а
    // пройти ещё раз для проверки отправляем в профиль.
    expect(screen.getByText(/сохраним этот результат/)).toBeTruthy()
    // Выбора варианта теста нет — начать заново нечем.
    expect(screen.queryByText('Выберите вариант теста')).toBeNull()

    fireEvent.click(screen.getByText('Продолжить'))
    expect(onDone).toHaveBeenCalledWith('A2')
  })

  it('если тест ещё не проходили — обычный экран выбора варианта', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ configured: true, completed: false, level: null }),
    }))

    render(
      <I18nProvider>
        <PlacementTestPage lang="ru" onDone={() => {}} onLevel={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Выберите вариант теста')).toBeTruthy())
  })

  // Пересдача из профиля нужна как раз тем, у кого уровень уже есть: законченный
  // прогон её не останавливает, и спрашивать о нём сервер незачем.
  it('пересдача не спрашивает «уже проходил» и предупреждает, что уровень не изменится', async () => {
    render(
      <I18nProvider>
        <PlacementTestPage lang="ru" retake currentLevel="B1" onDone={() => {}} onLevel={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Выберите вариант теста')).toBeTruthy())
    expect(screen.getByText(/уровень в аккаунте \(B1\) не изменится/)).toBeTruthy()
    expect(screen.queryByText('Уровень уже определён')).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
