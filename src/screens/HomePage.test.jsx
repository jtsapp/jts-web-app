// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import HomePage from './HomePage.jsx'

vi.mock('../api.js', () => ({
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: true, expiresAt: null })),
}))

// Рейтинг навыков: локальное зеркало отдаём готовым, сеть не трогаем — экран
// проверяем по цифрам, а не по загрузке. Набор лежит в изменяемой переменной,
// потому что vi.mock поднимается наверх файла и подменить его внутри it нечем.
const FULL_STATS = {
  speaking: { done: 25, firstTry: 21 },
  listening: { done: 25, firstTry: 19 },
  vocab: { done: 25, firstTry: 17 },
  grammar: { done: 25, firstTry: 12 },
  writing: { done: 25, firstTry: 10 },
  reading: { done: 25, firstTry: 15 },
}
const localStats = { value: FULL_STATS }

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => localStats.value,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

function renderHome(props = {}) {
  const onOpenPricing = vi.fn()
  const onOpenTrial = vi.fn()
  const view = render(
    <I18nProvider>
      <HomePage
        userLevel="B1"
        userName="Сакен"
        isDemoAccount
        onOpenPricing={onOpenPricing}
        onOpenTrial={onOpenTrial}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...view, onOpenPricing, onOpenTrial }
}

beforeEach(() => {
  localStorage.clear()
  localStats.value = FULL_STATS
})

describe('Главная демо-аккаунта', () => {
  it('уровень с названием и целью — следующая ступень CEFR', () => {
    renderHome()
    expect(screen.getByText('B1 · Intermediate')).toBeTruthy()
    expect(screen.getByText('Цель — B2')).toBeTruthy()
  })

  it('прогресс до следующего уровня — среднее по навыкам', () => {
    const { container } = renderHome()
    // (84+76+68+48+40+60)/6 = 62.7 → 63
    expect(screen.getByText('63% до B2')).toBeTruthy()
    expect(container.querySelector('.hm-level__fill').style.width).toBe('63%')
  })

  it('сильная и слабая стороны названы', () => {
    renderHome()
    expect(screen.getByText('Сильнее всего — Говорение')).toBeTruthy()
    expect(screen.getByText('Стоит подтянуть — Письмо')).toBeTruthy()
  })

  it('навыки идут от сильного к слабому', () => {
    const { container } = renderHome()
    const names = [...container.querySelectorAll('.hm-skill__name')].map((n) => n.textContent)
    expect(names[0]).toBe('Говорение')
    expect(names[names.length - 1]).toBe('Письмо')
  })

  it('у новичка вместо цифр — приглашение позаниматься', () => {
    localStats.value = {}
    const { container } = renderHome()
    expect(container.querySelectorAll('.hm-skill')).toHaveLength(0)
    expect(screen.getByText(/Пройдите несколько заданий/)).toBeTruthy()
    // Нулевой прогресс — не повод обещать переход: план остаётся честным.
    expect(container.querySelector('.hm-level__fill').style.width).toBe('0%')
  })

  it('плашка демо есть только у демо-аккаунта', () => {
    const { container, rerender } = renderHome()
    expect(container.querySelector('.dm-banner')).toBeTruthy()
    rerender(
      <I18nProvider>
        <HomePage userLevel="B1" userName="Сакен" isDemoAccount={false} />
      </I18nProvider>,
    )
    expect(container.querySelector('.dm-banner')).toBeFalsy()
  })

  it('«Открыть полный доступ» и «Записаться» зовут свои обработчики', () => {
    const { onOpenPricing, onOpenTrial } = renderHome()
    fireEvent.click(screen.getByText('Открыть полный доступ'))
    expect(onOpenPricing).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Записаться'))
    expect(onOpenTrial).toHaveBeenCalled()
  })

  // Бессрочное демо (менеджер выдал доступ руками) — таймера нет вовсе, а не
  // «0 ч 0 мин».
  it('без срока таймер не рисуется', () => {
    const { container } = renderHome({ demoExpiresAt: null })
    expect(container.querySelector('.dm-banner__timer')).toBeFalsy()
  })

  it('со сроком таймер показывает остаток', () => {
    const until = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 19)
    const { container } = renderHome({ demoExpiresAt: `${until}Z` })
    expect(container.querySelector('.dm-banner__timer').textContent).toMatch(/осталось \d+ ч/)
  })
})
