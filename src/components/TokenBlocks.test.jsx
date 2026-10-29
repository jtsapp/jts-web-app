// @vitest-environment jsdom
// Блоки токенов кабинета студента на главной и в «Практике» (ТЗ кабинетов, раздел 5).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ getMyTokens: vi.fn() }))

import { getMyTokens } from '../api.js'
import { resetPracticeTokenRulesCache } from '../practice/practiceTokens.js'
import TokenBlocks, { CoinLegend, PracticeTokenTable, TokenPilotBar } from './TokenBlocks.jsx'

const DATA = {
  period: { label: 'Октябрь – декабрь', balance: 120, idlePoints: 15, silver: 200, purple: 200, gold: 200, max: 600 },
  prizes: [{ costTokens: 100, name: 'Стикеры' }, { costTokens: 300, name: 'Урок' }],
  lessonPoints: { gen: 1, prem: 2 },
  dailyCap: 40,
  practiceRules: [{ section: 'Практика', name: 'Юнит грамматики', points: 5 }],
  pilot: { from: '2026-11-01', to: '2026-11-30', active: true },
}

const wrap = (node) => render(<I18nProvider>{node}</I18nProvider>)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  resetPracticeTokenRulesCache()
})

describe('TokenBlocks на главной', () => {
  it('показывает токены, ближайший приз, пилот, предупреждение о неактивности и три карточки', async () => {
    getMyTokens.mockResolvedValue(DATA)
    const onNav = vi.fn()
    wrap(<TokenBlocks token="T" onNav={onNav} />)

    await waitFor(() => expect(screen.getByTestId('home-token-blocks')).toBeTruthy())
    const text = screen.getByTestId('home-token-blocks').textContent
    expect(text).toContain('120 токенов')
    expect(text).toContain('До приза «Урок» осталось 180')
    expect(text).toContain('Призы 1/2')
    expect(screen.getByTestId('token-pilot')).toBeTruthy()
    expect(screen.getByTestId('home-idle-warning').textContent).toContain('15 токенов')
    expect(text).toContain('Не больше 40 в день')

    fireEvent.click(screen.getByText('К практике'))
    expect(onNav).toHaveBeenCalledWith('practice')
    fireEvent.click(screen.getByText('Написать'))
    expect(onNav).toHaveBeenCalledWith('feedback')
  })

  it('без штрафа и без пилота этих плашек нет; все призы открыты — об этом сказано', async () => {
    getMyTokens.mockResolvedValue({ ...DATA, period: { ...DATA.period, balance: 500, idlePoints: 0 }, pilot: null })
    wrap(<TokenBlocks token="T" onNav={() => {}} />)

    await waitFor(() => expect(screen.getByTestId('home-token-blocks')).toBeTruthy())
    expect(screen.queryByTestId('home-idle-warning')).toBeNull()
    expect(screen.queryByTestId('token-pilot')).toBeNull()
    expect(screen.getByTestId('home-token-blocks').textContent).toContain('Все призы периода открыты!')
  })

  it('сервер недоступен — блока нет, главная работает', async () => {
    getMyTokens.mockRejectedValue(new Error('offline'))
    wrap(<TokenBlocks token="T" onNav={() => {}} />)

    await waitFor(() => expect(getMyTokens).toHaveBeenCalled())
    expect(screen.queryByTestId('home-token-blocks')).toBeNull()
  })
})

describe('остальные блоки', () => {
  it('легенда монет: границы серебряной, фиолетовой и золотой и максимум', () => {
    wrap(<CoinLegend period={DATA.period} />)
    const text = screen.getByTestId('coin-legend').textContent
    expect(text).toContain('Серебряная — 0–199')
    expect(text).toContain('Фиолетовая — 200–399')
    expect(text).toContain('Золотая — 400–600')
    expect(text).toContain('Максимум за период — 600')
  })

  it('таблица «Все начисления за практику» со строкой урока; без правил её нет', () => {
    const { unmount } = wrap(<PracticeTokenTable data={DATA} />)
    // Свёрнута по умолчанию (редизайн 29.10.2026): в шапке — число строк, включая строку урока.
    const head = screen.getByRole('button', { name: /все начисления за практику/i })
    expect(head.getAttribute('aria-expanded')).toBe('false')
    expect(head.textContent).toContain('2 пункта')
    expect(screen.getByTestId('practice-token-table').querySelector('table')).toBeNull()
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    const text = screen.getByTestId('practice-token-table').textContent
    expect(text).toContain('Юнит грамматики')
    expect(text).toContain('+5')
    expect(text).toContain('+1 / +2')
    unmount()
    wrap(<PracticeTokenTable data={{ practiceRules: [] }} />)
    expect(screen.queryByTestId('practice-token-table')).toBeNull()
  })

  it('пилот показывается только пока идёт', () => {
    const { unmount } = wrap(<TokenPilotBar pilot={{ from: '2026-11-01', to: '2026-11-30', active: false }} />)
    expect(screen.queryByTestId('token-pilot')).toBeNull()
    unmount()
    wrap(<TokenPilotBar pilot={{ from: '2026-11-01', to: '2026-11-30', active: true }} />)
    expect(screen.getByTestId('token-pilot').textContent).toContain('Пилот токенов')
  })
})
