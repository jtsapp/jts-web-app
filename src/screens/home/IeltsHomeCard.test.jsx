// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import IeltsHomeCard from './IeltsHomeCard.jsx'

// Карточка IELTS на «Главной»: «заявка принята» звала пройти диагностику и тогда, когда ученик её уже прошёл, — после
// диагностики ей место у результата, а не у повторного прохождения.

const state = { me: null, profile: null }
vi.mock('../../api.js', () => ({
  getIeltsMe: vi.fn(async () => state.me),
  getIeltsProfile: vi.fn(async () => state.profile),
}))

const renderCard = (onNav) =>
  render(
    <I18nProvider>
      <IeltsHomeCard token="tok" onNav={onNav} />
    </I18nProvider>,
  )

beforeEach(() => {
  state.me = { ieltsAccount: true, onboarded: true, access: false, track: 'academic' }
  state.profile = { onboarded: true, bands: null }
})

describe('IeltsHomeCard', () => {
  it('ждёт менеджера, диагностики нет — зовёт пройти её', async () => {
    const onNav = vi.fn()
    renderCard(onNav)
    fireEvent.click(await screen.findByRole('button', { name: 'Пройти диагностику' }))
    expect(onNav).toHaveBeenCalledWith('ielts-diagnostic')
  })

  it('ждёт менеджера, диагностика пройдена — ведёт к результату', async () => {
    state.profile = { onboarded: true, bands: { listening: 6, reading: 6.5, overall: 6.5 } }
    const onNav = vi.fn()
    renderCard(onNav)
    await waitFor(() => expect(screen.getByText(/Диагностика пройдена/)).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Пройти диагностику' })).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Мой результат' }))
    expect(onNav).toHaveBeenCalledWith('ielts-diagnostic-result')
  })

  it('доступ открыт — в раздел', async () => {
    state.me = { ...state.me, access: true }
    const onNav = vi.fn()
    renderCard(onNav)
    fireEvent.click(await screen.findByRole('button', { name: /Открыть план/ }))
    expect(onNav).toHaveBeenCalledWith('ielts')
  })
})
