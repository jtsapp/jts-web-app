// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import HomePage from './HomePage.jsx'
import { getGePlan, getLessonModules, getLessonProgress } from '../api.js'

// «Главная» General English (спека 2026-10-12, секция 3): верхний блок по профилю — прежняя карточка без профиля,
// приглашение, следующий шаг и блок цели.

vi.mock('../api.js', () => ({
  getMySections: vi.fn(async () => ({ known: false, allowed: [] })),
  // Карточка «Новый отчёт о прогрессе» спрашивает список отчётов.
  getFeedbackReports: vi.fn(async () => []),
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => ({ requested: false })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getMyHomework: vi.fn(async () => []),
  requestTrialLesson: vi.fn(async () => ({ requested: true })),
  getLevelProgress: vi.fn(async () => ({ level: 'A2', next: 'B1', percent: 40, done: 14, total: 36, remaining: 22 })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getIeltsPlan: vi.fn(async () => null),
  getGePlan: vi.fn(async () => null),
  getLessonModules: vi.fn(async () => []),
  getLessonProgress: vi.fn(async () => ({ done: [] })),
}))
vi.mock('../practice/skillStats.js', () => ({ readLocalSkillStats: () => ({}), loadSkillStatsRemote: vi.fn(async () => null), readLocalLevelSkillStats: () => ({}), loadLevelSkillStatsRemote: vi.fn(async () => null) }))
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

  // С 14.10.2026 анкету «Главной» заменила анкета теста v16. С редизайна (21.10.2026) до теста сверху баннер
  // «Здесь будет твой маршрут», а на месте «Сегодня» — «Начни отсюда»: обе кнопки ведут на тест.
  it('анкеты нет — баннер «Здесь будет твой маршрут» и «Начни отсюда» зовут на тест (с уровнем и без)', async () => {
    for (const levelUnknown of [false, true]) {
      const onGeStart = vi.fn()
      const { unmount } = renderHome({ geProfile: { onboarded: false }, levelUnknown, onGeStart })
      await waitFor(() => expect(screen.getByText('Здесь будет твой маршрут')).toBeTruthy())
      expect(document.querySelector('.hm-level:not(.hm-level--phone)')).toBe(null)
      // телефон: карточка уровня замещает скрытый там блок GE (дизайн приложения)
      expect(document.querySelector('.hm-level--phone')).toBeTruthy()
      // класс ge-locked — якорь шага тура про закрытый маршрут
      expect(document.querySelector('.ge-start.ge-locked')).toBeTruthy()
      fireEvent.click(within(document.querySelector('.ge-start')).getByRole('button', { name: 'Пройти тест уровня' }))
      fireEvent.click(within(document.querySelector('.hm-start')).getByRole('button', { name: 'Пройти тест уровня' }))
      expect(onGeStart).toHaveBeenCalledTimes(2)
      unmount()
    }
  })

  // Учившимся до теста v16 тест не навязываем (решение владельца 14.10): тот же баннер, но без класса закрытого
  // маршрута — тур у них про приглашение, а не про замок.
  it('учившийся до теста, анкеты нет — баннер зовёт на тест, маршрут не «закрыт»', async () => {
    const onGeStart = vi.fn()
    renderHome({ geProfile: { onboarded: false }, existingStudent: true, onGeStart })
    await waitFor(() => expect(screen.getByText('Здесь будет твой маршрут')).toBeTruthy())
    expect(document.querySelector('.ge-locked')).toBe(null)
    fireEvent.click(within(document.querySelector('.ge-start.ge-invite')).getByRole('button', { name: 'Пройти тест уровня' }))
    expect(onGeStart).toHaveBeenCalled()
  })

  // ТЗ v2.0, 5.5 и 5.7: длинного отчёта теста и «Что делать дальше» на «Главной» нет — они на своей странице
  // (PlacementResultsPage.test.jsx), а в «Сильных и слабых сторонах» одна ссылка «Результаты теста →». Пустой блок
  // «Не пройден» с кнопкой теста живёт там же (решение владельца 21.10.2026 — тест числится непройденным).
  it('учившийся до теста с блоком цели — блок цели на месте, отчёта теста нет, ссылка ведёт на страницу результатов', async () => {
    const onNav = vi.fn()
    renderHome({ geProfile: goal, existingStudent: true, onNav })
    await waitFor(() => expect(document.querySelector('.ge-goal')).toBeTruthy())
    expect(document.querySelector('.pl-report')).toBe(null)
    expect(document.querySelector('.pl-next')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Результаты теста →' }))
    expect(onNav).toHaveBeenCalledWith('placement-results')
  })

  it('новый ученик без теста — на «Главной» ни отчёта, ни пересдачи', async () => {
    renderHome({ geProfile: { onboarded: false } })
    await waitFor(() => expect(screen.getByText('Здесь будет твой маршрут')).toBeTruthy())
    expect(document.querySelector('.pl-report')).toBe(null)
    expect(screen.queryByRole('button', { name: 'Пройти тест заново' })).toBe(null)
  })

  it('анкета есть, формата нет — шаг «выберите формат»', async () => {
    const onGeRoute = vi.fn()
    renderHome({ geProfile: { ...goal, route: null }, onGeRoute })
    await waitFor(() => expect(screen.getByText('Выбери, как будешь заниматься')).toBeTruthy())
    fireEvent.click(within(document.querySelector('.ge-start')).getByRole('button', { name: 'Выбрать формат' }))
    fireEvent.click(within(document.querySelector('.hm-start')).getByRole('button', { name: 'Выбрать формат' }))
    expect(onGeRoute).toHaveBeenCalledTimes(2)
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

  // Телефон (дизайн приложения): блока цели там нет, цель правится «Изменить» в карточке уровня — тем же экраном.
  it('телефон: «Изменить» в карточке уровня ведёт в правку цели', async () => {
    const onGeEdit = vi.fn()
    renderHome({ geProfile: goal, onGeEdit })
    await waitFor(() => expect(document.querySelector('.hm-level--phone .hm-level__goal')).toBeTruthy())
    // Цель — из профиля GE (B2), а не прежнего level_goal: его зеркало снято 13.10, и он отстаёт.
    expect(document.querySelector('.hm-level--phone .hm-level__goal').textContent).toContain('Цель — B2')
    fireEvent.click(document.querySelector('.hm-level--phone .hm-level__goal'))
    expect(onGeEdit).toHaveBeenCalledTimes(1)
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
    // шапка «Сегодня» по ТЗ v2.0 (5.2): сделанные минуты дня; у начатой практики — тип и «6 / 15 мин»
    expect(screen.getByText('6 из 30 мин')).toBeTruthy()
    expect(screen.getByText('Говорение · 6 / 15 мин')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(onNav).toHaveBeenCalledWith('tutor')
    fireEvent.click(screen.getByRole('button', { name: /Весь план/ }))
    expect(onNav).toHaveBeenCalledWith('ge-plan')
  })

  // ТЗ v2.0, 5.1 и 5.4. Уровень B1, а не A2 прочих тестов: каталог курса кэшируется по уровню на весь файл.
  it('баннер: «Сейчас · урок N из M» по тропе, облачко — от минут дня; у Self Study — «Ближайшее» с тестом курса', async () => {
    const index = {
      level: 'B1',
      units: [],
      lessons: [1, 2, 3].map((n) => ({ n, unit: 1, no: n, title: `Lesson ${n}` })),
      tests: [{ unit: 1, title: 'Unit 1 Review Test', items: 30, pass: 21 }],
    }
    fetch.mockImplementation(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/course/b1/index.json') ? index : { configured: false }),
    }))
    getLessonModules.mockResolvedValue([{ id: 9, level: 'B1' }])
    getLessonProgress.mockResolvedValue({ done: ['L1'] })
    getGePlan.mockResolvedValueOnce({
      today: '2026-10-14',
      state: 'ready',
      route: 'self_study',
      week: { done: 1, total: 6 },
      liveMissing: false,
      tasks: [
        { id: 21, date: '2026-10-14', kind: 'practice', module: 'ai_tutor', minutes: 15, got: 15, status: 'completed', overdue: false },
        { id: 22, date: '2026-10-14', kind: 'practice', module: 'vocabulary_sr', minutes: 15, got: 5, status: 'in_progress', overdue: false },
      ],
    })
    const profile = {
      ...goal,
      fromLevel: 'B1',
      deadline: { state: 'days', date: '2027-06-01', daysRemaining: 200, approximate: false },
      journey: { start: 'B1', current: { level: 'B1', percent: 10 }, target: 'B2', reached: false },
    }
    renderHome({ geProfile: profile, userLevel: 'B1' })
    await waitFor(() => expect(document.querySelector('.ge-goal .ih-gb__nowtag').textContent).toBe('Сейчас · урок 2 из 3'))
    await waitFor(() => expect(document.querySelector('.ge-goal .ih-gb__bubble').textContent).toBe('Сегодня уже 20 мин. Так держать!'))
    const near = document.querySelector('.hm-near')
    expect(near).toBeTruthy()
    expect(document.querySelector('.hm-tl')).toBe(null)
    expect(within(near).getByText('Unit 1 Review Test')).toBeTruthy()
    expect(within(near).getByText('30 вопросов · после урока 3')).toBeTruthy()
    // 7 строк «Нет уроков» прежнего расписания на компьютере больше нет (ТЗ 5.7)
    expect(screen.queryByText('Нет уроков')).toBe(null)
    getLessonModules.mockReset().mockResolvedValue([])
    getLessonProgress.mockReset().mockResolvedValue({ done: [] })
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
  const next = (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: /Далее|Готово/ }))
  const intro = () => screen.findByRole('dialog', { name: 'Добро пожаловать!' })
  const walkHints = async (first) => {
    next(await screen.findByRole('dialog', { name: first }))
    next(await screen.findByRole('dialog', { name: 'Ближайшие уроки и домашка' }))
    next(await screen.findByRole('dialog', { name: 'Разделы слева — что за что отвечает' }))
  }

  beforeEach(() => {
    localStorage.removeItem('jts_tours_off')
  })

  it('пока профиль грузится — ни старой карточки уровня, ни тура', async () => {
    render(tree({ geProfile: null, geLoaded: false }))
    await new Promise((r) => setTimeout(r, 30))
    expect(document.querySelector('.hm-level')).toBe(null)
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  // Макет «Первый заход и подсказки» (21.10.2026): приветствие по имени и три подсказки вместо девяти шагов по блокам.
  it('профиль приехал после монтирования — приветствие по имени и три подсказки: прогресс, расписание с домашкой, разделы', async () => {
    getGePlan.mockResolvedValue(plan)
    const { rerender } = render(tree({ geProfile: null, geLoaded: false }))
    await new Promise((r) => setTimeout(r, 30))
    rerender(tree({ geProfile: goal, geLoaded: true }))
    const hello = await intro()
    expect(within(hello).getByText('Сакен')).toBeTruthy()
    fireEvent.click(within(hello).getByRole('button', { name: /Показать/ }))

    const first = await screen.findByRole('dialog', { name: 'Здесь виден твой прогресс' })
    expect(first.querySelectorAll('.t-tour__dots i')).toHaveLength(3)
    next(first)
    next(await screen.findByRole('dialog', { name: 'Ближайшие уроки и домашка' }))
    // разделы — ровно пункты сайдбара этого ученика, без «Главной»
    const last = await screen.findByRole('dialog', { name: 'Разделы слева — что за что отвечает' })
    expect(within(last).getByText('Speaking Buddy')).toBeTruthy()
    expect(within(last).getByText('Разговор с тьютором голосом и ролевые сценарии')).toBeTruthy()
    expect(within(last).queryByText('Главная')).toBe(null)
    expect(within(last).queryByRole('button', { name: 'Пропустить' })).toBe(null)
    next(last)
    await waitFor(() => expect(localStorage.getItem('jts_tour_home:user-7:ge')).toBe('1'))
    getGePlan.mockReset().mockResolvedValue(null)
  })

  it('видевший старый тур увидит обновлённый один раз', async () => {
    localStorage.setItem('jts_tour_home:user-7', '1')
    render(tree({ geProfile: goal, geLoaded: true }))
    expect(await intro()).toBeTruthy()
  })

  // Решение владельца 21.10.2026: новому ученику тест — сразу после тура, как бы тур ни закрыли.
  it('новый ученик: после тура сразу тест — и по «Готово», и по «Пропустить»', async () => {
    for (const how of ['done', 'skip']) {
      localStorage.clear()
      const onGeStart = vi.fn()
      const { unmount } = render(tree({ geProfile: { onboarded: false }, levelUnknown: true, onGeStart }))
      const hello = await intro()
      if (how === 'skip') {
        fireEvent.click(within(hello).getByRole('button', { name: 'Пропустить' }))
      } else {
        fireEvent.click(within(hello).getByRole('button', { name: /Показать/ }))
        await walkHints('Здесь будет твой маршрут')
      }
      await waitFor(() => expect(onGeStart).toHaveBeenCalledTimes(1))
      // окно «Жёсткий режим» ждёт возвращения с пройденным тестом: поверх закрытого роадмапа его нет
      expect(screen.queryByRole('dialog', { name: 'Жесткий режим общения' })).toBe(null)
      unmount()
    }
  })

  it('учившийся до теста: тест остаётся на «Главной», после тура — окно «Жёсткий режим» один раз', async () => {
    const onGeStart = vi.fn()
    const onTemperChoice = vi.fn()
    const props = { geProfile: { onboarded: false }, existingStudent: true, onGeStart, onTemperChoice }
    const { unmount } = render(tree(props))
    fireEvent.click(within(await intro()).getByRole('button', { name: 'Пропустить' }))
    const invite = await screen.findByRole('dialog', { name: 'Жесткий режим общения' })
    expect(onGeStart).not.toHaveBeenCalled()
    fireEvent.click(within(invite).getByRole('button', { name: 'Попробовать жесткий режим' }))
    expect(onTemperChoice).toHaveBeenCalledWith('harsh')
    expect(screen.queryByRole('dialog', { name: 'Жесткий режим общения' })).toBe(null)
    unmount()

    render(tree(props))
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  it('«Оставить обычный режим» нрав не трогает; видевшим тур раньше окно не выходит', async () => {
    const onTemperChoice = vi.fn()
    const { unmount } = render(tree({ geProfile: goal, onTemperChoice }))
    fireEvent.click(within(await intro()).getByRole('button', { name: 'Пропустить' }))
    const invite = await screen.findByRole('dialog', { name: 'Жесткий режим общения' })
    fireEvent.click(within(invite).getByRole('button', { name: 'Оставить обычный режим' }))
    expect(onTemperChoice).not.toHaveBeenCalled()
    unmount()

    localStorage.clear()
    localStorage.setItem('jts_tour_home:user-7:ge', '1')
    render(tree({ geProfile: goal, onTemperChoice }))
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByRole('dialog')).toBe(null)
  })
})
