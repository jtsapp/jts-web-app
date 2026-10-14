// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import HomePage from './HomePage.jsx'
import { getGePlan } from '../api.js'

// «Главная» General English (спека 2026-10-12, секция 3): верхний блок по профилю — прежняя карточка без профиля,
// приглашение, следующий шаг и блок цели.

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => ({ requested: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getMyHomework: vi.fn(async () => []),
  requestTrialLesson: vi.fn(async () => ({ requested: true })),
  getLevelProgress: vi.fn(async () => ({ level: 'A2', next: 'B1', percent: 40, done: 14, total: 36, remaining: 22 })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getIeltsPlan: vi.fn(async () => null),
  getGePlan: vi.fn(async () => null),
  getLessonModules: vi.fn(async () => []),
  getLessonProgress: vi.fn(async () => ({ done: [] })),
}))
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => ({}), loadSkillStatsRemote: vi.fn(async () => null) }))
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= function () {}

const TOKEN = `h.${btoa(JSON.stringify({ userId: 7 }))}.s`
const goal = {
  onboarded: true,
  purpose: 'work',
  targetLevel: 'B2',
  fromLevel: 'A2',
  dailyMinutes: 30,
  deadlineWindow: 'none',
  route: 'self_study',
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 40 }, target: 'B2', reached: false },
}
function renderHome(props) {
  return render(
    <I18nProvider>
      <LanguageProvider>
        <HomePage userLevel="A2" userName="Сакен" token={TOKEN} {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('jts_tours_off', '1')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ configured: false }) })))
})

describe('HomePage — General English', () => {
  it('без профиля — прежняя карточка уровня', async () => {
    renderHome({ geProfile: null })
    await waitFor(() => expect(document.querySelector('.hm-level')).toBeTruthy())
    expect(document.querySelector('.ge-invite')).toBe(null)
  })

  // С 14.10.2026 анкету «Главной» заменила анкета теста v16: до него роадмап закрыт блюром и зовёт на тест.
  it('анкеты нет — роадмап закрыт и зовёт на тест (с уровнем и без)', async () => {
    for (const levelUnknown of [false, true]) {
      const onGeStart = vi.fn()
      const { unmount } = renderHome({ geProfile: { onboarded: false }, levelUnknown, onGeStart })
      await waitFor(() => expect(screen.getByText('Пройдите тест — построим ваш маршрут')).toBeTruthy())
      expect(document.querySelector('.hm-level')).toBe(null)
      // образец маршрута под блюром недоступен ни скринридеру, ни клавиатуре
      const preview = document.querySelector('.ge-locked__preview')
      expect(preview.getAttribute('aria-hidden')).toBe('true')
      expect(preview.hasAttribute('inert')).toBe(true)
      fireEvent.click(within(document.querySelector('.ge-locked__veil')).getByRole('button', { name: 'Пройти тест' }))
      expect(onGeStart).toHaveBeenCalled()
      unmount()
    }
  })

  // Учившимся до теста v16 тест не навязываем (решение владельца 14.10): без блюра, но «не пройден» видно.
  it('учившийся до теста, анкеты нет — обычная карточка «тест не пройден», без блюра', async () => {
    const onGeStart = vi.fn()
    renderHome({ geProfile: { onboarded: false }, existingStudent: true, onGeStart })
    await waitFor(() => expect(screen.getByText('Тест уровня не пройден')).toBeTruthy())
    expect(document.querySelector('.ge-locked')).toBe(null)
    fireEvent.click(within(document.querySelector('.ge-invite')).getByRole('button', { name: 'Пройти тест' }))
    expect(onGeStart).toHaveBeenCalled()
  })

  it('учившийся до теста с блоком цели — блок на месте, под ним «Тест уровня · Не пройден»', async () => {
    const onStartLevelTest = vi.fn()
    renderHome({ geProfile: goal, existingStudent: true, onStartLevelTest })
    await waitFor(() => expect(document.querySelector('.pl-report--missing')).toBeTruthy())
    expect(document.querySelector('.ge-goal')).toBeTruthy()
    expect(document.querySelector('.pl-report--missing').textContent).toContain('Не пройден')
    fireEvent.click(within(document.querySelector('.pl-report--missing')).getByRole('button', { name: 'Пройти тест' }))
    expect(onStartLevelTest).toHaveBeenCalled()
  })

  it('новый ученик с блоком цели и без теста — отметки «не пройден» нет', async () => {
    renderHome({ geProfile: goal })
    await waitFor(() => expect(document.querySelector('.ge-goal')).toBeTruthy())
    expect(document.querySelector('.pl-report--missing')).toBe(null)
  })

  it('анкета есть, формата нет — шаг «выберите формат»', async () => {
    const onGeRoute = vi.fn()
    renderHome({ geProfile: { ...goal, route: null }, onGeRoute })
    await waitFor(() => expect(screen.getByText('Выберите, как будете заниматься')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать формат' }))
    expect(onGeRoute).toHaveBeenCalled()
  })

  it('всё есть — блок цели: дорожка, срок не указан, правка', async () => {
    const onGeEdit = vi.fn()
    renderHome({ geProfile: goal, onGeEdit })
    await waitFor(() => expect(document.querySelector('.ge-goal')).toBeTruthy())
    expect(screen.getByText('Срок не указан')).toBeTruthy()
    expect([...document.querySelectorAll('.ge-goal .ih-gb__track li span')].map((n) => n.textContent)).toEqual(['A2', 'A2', 'Сейчас · 40%', 'B2'])
    fireEvent.click(screen.getByRole('button', { name: /Указать срок/ }))
    expect(onGeEdit).toHaveBeenCalled()
  })
  it('план собран — «Сегодня» вместо «Что сделать сегодня», «Начать» ведёт в раздел', async () => {
    getGePlan.mockResolvedValueOnce({
      today: '2026-10-14',
      state: 'ready',
      route: 'self_study',
      week: { done: 1, total: 6 },
      liveMissing: false,
      tasks: [
        { id: 11, date: '2026-10-14', kind: 'practice', module: 'ai_tutor', minutes: 15, got: 6, status: 'in_progress', overdue: false },
        { id: 12, date: '2026-10-14', kind: 'practice', module: 'vocabulary_sr', minutes: 15, got: 0, status: 'available', overdue: false },
      ],
    })
    const onNav = vi.fn()
    renderHome({ geProfile: goal, onNav })
    await waitFor(() => expect(document.querySelector('.ge-today')).toBeTruthy())
    expect(document.querySelector('.hm-recommend')).toBe(null)
    expect(screen.getByText('Неделя: 1 из 6')).toBeTruthy()
    expect(screen.getByText('6 / 15 мин')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(onNav).toHaveBeenCalledWith('tutor')
    fireEvent.click(screen.getByRole('button', { name: /Весь план/ }))
    expect(onNav).toHaveBeenCalledWith('ge-plan')
  })

  it('группа без занятий — плашка «запишитесь», план без ручки — прежняя карточка', async () => {
    getGePlan.mockResolvedValueOnce({ today: '2026-10-14', state: 'ready', route: 'group', week: null, liveMissing: true, tasks: [] })
    renderHome({ geProfile: { ...goal, route: 'group' } })
    await waitFor(() => expect(screen.getByText(/Занятий с преподавателем пока нет/)).toBeTruthy())
    expect(screen.getByText('Сегодня задач нет.')).toBeTruthy()
  })
})

// Тур «Главной» общего курса: профиль анкеты приезжает асинхронно (App: getIeltsMe → getGeProfile), и пока он в пути,
// null читался как «ручки нет» — экран рисовал старую карточку уровня, а тур успевал стартовать по старым шагам
// (выбор цели на старой дорожке) и больше не перерешал.
describe('HomePage — тур общего курса', () => {
  const plan = {
    today: '2026-10-14',
    state: 'ready',
    route: 'self_study',
    week: { done: 0, total: 4 },
    liveMissing: false,
    tasks: [{ id: 1, date: '2026-10-14', kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'available', overdue: false }],
  }
  const tree = (props) => (
    <I18nProvider>
      <LanguageProvider>
        <HomePage userLevel="A2" userName="Сакен" token={TOKEN} tourKey="jts_tour_home:user-7" {...props} />
      </LanguageProvider>
    </I18nProvider>
  )
  const next = (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: /ОК|Далее|Готово/ }))

  beforeEach(() => {
    localStorage.removeItem('jts_tours_off')
  })

  it('пока профиль грузится — ни старой карточки уровня, ни тура', async () => {
    render(tree({ geProfile: null, geLoaded: false }))
    await new Promise((r) => setTimeout(r, 30))
    expect(document.querySelector('.hm-level')).toBe(null)
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  it('профиль приехал после монтирования — тур идёт по новой «Главной»: цель, путь, навыки, «Сегодня», задача, весь план', async () => {
    getGePlan.mockResolvedValue(plan)
    const { rerender } = render(tree({ geProfile: null, geLoaded: false }))
    await new Promise((r) => setTimeout(r, 30))
    rerender(tree({ geProfile: goal, geLoaded: true }))
    const first = await screen.findByRole('dialog', { name: 'Ваша цель и срок' })
    expect(within(first).queryAllByRole('radio')).toHaveLength(0)
    // шаги — только под блоки на экране: цель, путь, навыки, «Сегодня», задача, весь план, практика, расписание, домашка
    expect(within(first).getByText('1/9')).toBeTruthy()
    next(first)
    next(await screen.findByRole('dialog', { name: 'Путь до цели' }))
    next(await screen.findByRole('dialog', { name: 'Сильные и слабые стороны' }))
    next(await screen.findByRole('dialog', { name: 'План на сегодня' }))
    const task = await screen.findByRole('dialog', { name: 'Задача' })
    expect(within(task).getByText(/6 \/ 15 мин/)).toBeTruthy()
    next(task)
    expect(await screen.findByRole('dialog', { name: 'Весь план' })).toBeTruthy()
    getGePlan.mockReset().mockResolvedValue(null)
  })

  it('видевший старый тур увидит обновлённый один раз', async () => {
    localStorage.setItem('jts_tour_home:user-7', '1')
    render(tree({ geProfile: goal, geLoaded: true }))
    expect(await screen.findByRole('dialog', { name: 'Ваша цель и срок' })).toBeTruthy()
  })
})
