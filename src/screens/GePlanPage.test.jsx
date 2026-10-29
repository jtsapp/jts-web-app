// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import GePlanPage from './GePlanPage.jsx'
import { getGePlan, moveGeTask } from '../api.js'

// Экран «План» общего курса (спека 2026-10-13, секция 4): пустые состояния ведут к недостающему шагу, три вида над
// одними задачами, перенос своей задачи перечитывает план.

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getSatMeCached: vi.fn(async () => null),
  getLevelProgress: vi.fn(async () => ({ level: 'A2', percent: 40 })),
  getGePlan: vi.fn(async () => null),
  moveGeTask: vi.fn(async () => ({})),
  getLessonModules: vi.fn(async () => []),
  getLessonProgress: vi.fn(async () => ({ done: [] })),
}))
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`
const plan = {
  today: '2026-10-14',
  state: 'ready',
  route: 'self_study',
  dailyMinutes: 30,
  planStart: '2026-10-12',
  planUntil: '2026-11-22',
  liveMissing: false,
  week: { done: 0, total: 3 },
  tasks: [
    { id: 1, date: '2026-10-14', kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: false, movable: true },
    { id: 2, date: '2026-10-14', kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'available', overdue: false, movable: true },
    { id: 3, date: '2026-10-15', kind: 'practice', module: 'workbooks', minutes: 15, got: 0, status: 'planned', overdue: false, movable: true },
  ],
}

function renderPage(props) {
  render(
    <I18nProvider>
      <LanguageProvider>
        <GePlanPage token={TOKEN} userName="Сакен" userLevel="A2" {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jts_tours_off', '1')
  window.history.replaceState(null, '', '/?screen=ge-plan')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
  getGePlan.mockReset().mockResolvedValue(plan)
  moveGeTask.mockClear()
})

describe('GePlanPage', () => {
  it('формата нет — объясняет и ведёт выбирать формат', async () => {
    getGePlan.mockResolvedValue({ ...plan, state: 'no_route', tasks: [] })
    const onGeRoute = vi.fn()
    renderPage({ onGeRoute })
    await waitFor(() => expect(screen.getByText(/Выберите, как будете заниматься/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Выбрать формат/ }))
    expect(onGeRoute).toHaveBeenCalled()
  })

  it('роадмап: панель сегодняшнего дня с задачами и «Начать» в раздел', async () => {
    const onNav = vi.fn()
    renderPage({ onNav })
    const panel = await screen.findByRole('complementary', { name: 'Задачи дня' })
    expect(within(panel).getByText('Урок курса')).toBeTruthy()
    fireEvent.click(within(panel).getAllByRole('button', { name: 'Начать' })[1])
    expect(onNav).toHaveBeenCalledWith('tutor')
    expect(screen.getByText('Самостоятельно · 30 мин в день')).toBeTruthy()
  })

  it('неделя: перенос своей задачи зовёт бэкенд и перечитывает план', async () => {
    renderPage()
    await screen.findByRole('complementary', { name: 'Задачи дня' })
    fireEvent.click(screen.getByRole('tab', { name: 'Неделя' }))
    expect(window.location.search).toContain('gePlanView=week')
    fireEvent.click(screen.getByRole('button', { name: /Воркбук/ }))
    fireEvent.click(screen.getByRole('button', { name: /Перенести/ }))
    fireEvent.change(screen.getByLabelText('Перенести на'), { target: { value: '2026-10-16' } })
    await waitFor(() => expect(moveGeTask).toHaveBeenCalledWith(TOKEN, 3, '2026-10-16'))
    await waitFor(() => expect(getGePlan).toHaveBeenCalledTimes(2))
  })

  it('первый заход — тур экрана: виды, дорога, задачи дня, перенос', async () => {
    localStorage.removeItem('jts_tours_off')
    renderPage({ tourKey: 'jts_tour_ge-plan:user-7' })
    const next = (d) => fireEvent.click(within(d).getByRole('button', { name: /ОК|Далее|Готово/ }))
    // Тур вида «Главной» начинается приветствием — шаги после «Показать».
    const intro = await screen.findByRole('dialog', { name: 'Это раздел' })
    fireEvent.click(within(intro).getByRole('button', { name: /Показать/ }))
    next(await screen.findByRole('dialog', { name: 'Три вида плана' }))
    next(await screen.findByRole('dialog', { name: 'Дорога по дням' }))
    next(await screen.findByRole('dialog', { name: 'Задачи дня' }))
    const move = await screen.findByRole('dialog', { name: 'Перенос задачи' })
    expect(within(move).getByText(/Перенести/)).toBeTruthy()
  })

  it('месяц: сетка с короткими подписями задач', async () => {
    renderPage()
    await screen.findByRole('complementary', { name: 'Задачи дня' })
    fireEvent.click(screen.getByRole('tab', { name: 'Месяц' }))
    expect(screen.getByText('Октябрь 2026')).toBeTruthy()
    expect(screen.getAllByText(/Урок/).length).toBeGreaterThan(0)
  })
})
