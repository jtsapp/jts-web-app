// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import HomePage from './HomePage.jsx'

// Цель уровня на «Главной»: выбор в первом шаге тура и кликом по медали,
// дорожка от ближайшего уровня до цели, кадр «цель достигнута».
//
// Отдельным файлом от HomePage.test.jsx: здесь нужен токен (цель только у
// залогиненного) и настоящий тур, а там экран проверяется без них.

const levelProgress = { value: null }
vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => ({ requested: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getMyHomework: vi.fn(async () => []),
  requestTrialLesson: vi.fn(async () => ({ requested: true })),
  getLevelProgress: vi.fn(async () => levelProgress.value),
}))

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => ({}),
  loadSkillStatsRemote: vi.fn(async () => null),
}))

// Тур меряет подсветку ResizeObserver'ом и скроллит к ней — в jsdom нет ни того, ни другого.
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

// Токен с userId: по нему ключуется кэш цели (lib/levelGoal.js).
const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`
const serverGoal = { value: null }
let fetchMock

function renderHome(props = {}) {
  const onOpenPricing = vi.fn()
  render(
    <I18nProvider>
      <LanguageProvider>
        <HomePage userLevel="A0" userName="Сакен" token={TOKEN} onOpenPricing={onOpenPricing} {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
  return { onOpenPricing }
}

const stopLabels = () => [...document.querySelectorAll('.hm-level__track .hm-level__lbl')].map((n) => n.textContent)
const goalPuts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT').map(([, init]) => JSON.parse(init.body))

beforeEach(() => {
  localStorage.clear()
  levelProgress.value = { level: 'A0', next: 'A1', percent: 10, done: 2, total: 24, remaining: 22 }
  serverGoal.value = null
  fetchMock = vi.fn(async (url, init) => ({
    ok: true,
    json: async () =>
      String(url).includes('level-goal')
        ? { configured: true, goal: init?.method === 'PUT' ? JSON.parse(init.body) : serverGoal.value }
        : {},
  }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Цель уровня на «Главной»', () => {
  it('A0 с целью B2: ступени A1, A2, B1 и «Финиш · B2», медаль — «Цель — B2»', async () => {
    serverGoal.value = { target: 'B2', from: 'A0' }
    renderHome()

    expect(await screen.findByText('Финиш · B2')).toBeTruthy()
    expect(stopLabels()).toEqual(['Старт', 'A1', 'A2', 'B1', 'Финиш · B2'])
    expect(screen.getByText('Цель — B2')).toBeTruthy()
  })

  it('без цели дорожка прежняя: ближайший уровень, следующий и «Финиш»', async () => {
    renderHome()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(stopLabels()).toEqual(['Старт', 'Уровень A1', 'Уровень A2', 'Финиш'])
    expect(screen.getByText('Цель — A1')).toBeTruthy()
  })

  it('первый шаг тура — выбор цели: «ОК» заперта, пока цель не выбрана', async () => {
    renderHome({ tourKey: 'jts_tour_home:user-7' })

    const tour = await screen.findByRole('dialog', { name: 'Твоя цель' })
    const next = within(tour).getByRole('button', { name: 'ОК' })
    expect(next.disabled).toBe(true)

    // Выбор — с A1 (ближайшая ступень) до C2; A0 позади.
    const chips = within(tour).getAllByRole('radio').map((c) => c.querySelector('b').textContent)
    expect(chips).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

    fireEvent.click(within(tour).getByRole('radio', { name: /B2/ }))
    expect(next.disabled).toBe(false)
    expect(goalPuts()).toEqual([{ target: 'B2', from: 'A0' }])
    expect(stopLabels()).toEqual(['Старт', 'A1', 'A2', 'B1', 'Финиш · B2'])

    // Кэш держит выбор: следующий заход нарисует дорожку сразу, до ответа сервера.
    expect(JSON.parse(localStorage.getItem('jts_level_goal:7'))).toEqual({ target: 'B2', from: 'A0' })
  })

  it('ответ сервера, пришедший после выбора, выбор не перетирает', async () => {
    let release
    serverGoal.value = null
    fetchMock.mockImplementationOnce(
      () => new Promise((r) => { release = () => r({ ok: true, json: async () => ({ configured: true, goal: null }) }) }),
    )
    renderHome({ tourKey: 'jts_tour_home:user-7' })
    const tour = await screen.findByRole('dialog', { name: 'Твоя цель' })
    fireEvent.click(within(tour).getByRole('radio', { name: /B1/ }))
    release()
    await waitFor(() => expect(goalPuts()).toEqual([{ target: 'B1', from: 'A0' }]))
    await new Promise((r) => setTimeout(r, 0))
    expect(stopLabels()).toEqual(['Старт', 'Уровень A1', 'Уровень A2', 'Финиш · B1'])
  })

  it('клик по медали открывает выбор, новая цель сразу на дорожке', async () => {
    serverGoal.value = { target: 'B2', from: 'A0' }
    renderHome()
    fireEvent.click(await screen.findByRole('button', { name: /Цель — B2/ }))

    const dlg = screen.getByRole('dialog', { name: 'Ваша цель' })
    fireEvent.click(within(dlg).getByRole('radio', { name: /A2/ }))

    expect(screen.queryByRole('dialog', { name: 'Ваша цель' })).toBe(null)
    expect(stopLabels()).toEqual(['Старт', 'Уровень A1', 'Финиш · A2'])
    expect(goalPuts()).toEqual([{ target: 'A2', from: 'A0' }])
  })

  it('профиль дорос до цели — «Теперь ваш уровень», вся дорожка и покупка курса', async () => {
    levelProgress.value = { level: 'B2', next: 'C1', percent: 0, done: 0, total: 48, remaining: 48 }
    serverGoal.value = { target: 'B2', from: 'A1' }
    const { onOpenPricing } = renderHome({ userLevel: 'B2' })

    expect(await screen.findByText('ТЕПЕРЬ ВАШ УРОВЕНЬ')).toBeTruthy()
    expect(stopLabels()).toEqual(['Старт', 'Уровень A2', 'Уровень B1', 'Финиш · B2'])
    expect(document.querySelector('.hm-level__fill')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: /Приобрести новый курс/ }))
    expect(onOpenPricing).toHaveBeenCalled()
  })
})
