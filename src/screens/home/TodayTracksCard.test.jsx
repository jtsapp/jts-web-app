// @vitest-environment jsdom
// «Задачи на сегодня» по направлениям (задача 218): секции только по направлениям ученика, счётчик у каждой и общий в
// шапке, раскрытие мышью и клавиатурой, «+ ещё N», «Начать» ведёт туда же, куда кнопки разделов.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const api = vi.hoisted(() => ({
  ieltsMe: { onboarded: true, access: true, track: 'academic' },
  dash: null,
  satMe: { access: true },
  dashCalls: 0,
}))
vi.mock('../../api.js', async (orig) => ({
  ...(await orig()),
  getIeltsMe: async () => api.ieltsMe,
  getIeltsDashboard: async () => {
    api.dashCalls += 1
    return api.dash
  },
  getSatMeCached: async () => api.satMe,
  getSatRoadmap: async () => ({ roadmap: { active: 2, phases: [{ n: 2, kind: 'group' }] } }),
  getSatSchedule: async () => ({ lessons: [] }),
  getSatTodayTasks: async () => ({ practiceToday: 0, openErrors: 3, reviewedToday: 0 }),
  getGeProfile: async () => ({ targetLevel: 'B2' }),
  markGeTaskDone: vi.fn(),
}))
vi.mock('../../practice/practiceTokens.js', () => ({ useStudentTokens: () => ({}), taskTokenPoints: () => 0 }))
vi.mock('../../practice/skillStats.js', () => ({ readLocalLevelSkillStats: () => null, loadLevelSkillStatsRemote: async () => null }))

const { I18nProvider } = await import('../../i18n.jsx')
const { default: TodayTracksCard } = await import('./TodayTracksCard.jsx')

const TODAY = '2026-11-17'
const ieltsTask = (id, over) => ({ id, sec: 'reading', kind: 'type', sub: 'tfng', n: 1, minutes: 20, status: 'available', ...over })
const IELTS_DAY = [
  ieltsTask(1, { status: 'completed' }),
  ieltsTask(2, { sec: 'writing', kind: 't2', sub: 'opinion', minutes: 40 }),
  ieltsTask(3, { sec: 'listening', kind: 'dc', sub: null }),
  ieltsTask(4, { sec: 'speaking', kind: 'p2', sub: null }),
  ieltsTask(5, { sec: 'vocab', kind: 'vocab', sub: 'education', minutes: 10 }),
]
const geTask = (id, over) => ({ id, date: TODAY, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'available', overdue: false, ...over })
const GE = {
  plan: { today: TODAY, state: 'ready', route: 'self_study', tasks: [geTask(11), geTask(12, { module: 'workbooks' }), geTask(13, { module: 'vocabulary_sr', status: 'completed' })] },
  frontier: [],
  level: 'B1',
  onReload: () => {},
}

const show = (tracks, { onNav = () => {}, ge = GE } = {}) =>
  render(
    <I18nProvider>
      <TodayTracksCard tracks={tracks} ge={tracks.includes('ge') ? ge : null} token="TOK" onNav={onNav} />
    </I18nProvider>,
  )
const toggle = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const nameOf = (name) => toggle(name).getAttribute('aria-label')

beforeEach(() => {
  api.ieltsMe = { onboarded: true, access: true, track: 'academic' }
  api.dash = { programme: { enrollment: { status: 'active' }, tasks: IELTS_DAY } }
  api.satMe = { access: true }
  api.dashCalls = 0
  localStorage.clear()
})

describe('TodayTracksCard', () => {
  it('IELTS и General English: секции в порядке карточки, счётчики у каждой и общий в шапке', async () => {
    show(['ge', 'ielts'])
    await waitFor(() => expect(nameOf('IELTS')).toBe('IELTS, 4 задачи'))
    expect(nameOf('General English')).toBe('General English, 2 задачи')
    expect(screen.getByText('6 задач')).toBeTruthy()
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(names[0]).toMatch(/^IELTS/)
    expect(names[1]).toMatch(/^General English/)
    expect(screen.queryByText(/SAT/)).toBeNull()
    // дашборд IELTS — одним запросом
    expect(api.dashCalls).toBe(1)
  })

  it('раскрыта первая секция с задачами; шапка сворачивает и раскрывает её, Enter и пробел — тоже', async () => {
    show(['ge', 'ielts'])
    await waitFor(() => expect(toggle('IELTS').getAttribute('aria-expanded')).toBe('true'))
    const ge = toggle('General English')
    expect(ge.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('hm-trk-ge').hidden).toBe(true)
    fireEvent.click(ge)
    expect(ge.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('hm-trk-ge').hidden).toBe(false)
    // кнопка — настоящая <button>: Enter и пробел браузер превращает в click, фокус на ней держится
    ge.focus()
    expect(document.activeElement).toBe(ge)
    fireEvent.click(toggle('IELTS'))
    expect(toggle('IELTS').getAttribute('aria-expanded')).toBe('false')
    expect(toggle('IELTS').getAttribute('aria-controls')).toBe('hm-trk-ielts')
  })

  it('до «+ ещё N» видно три строки, сначала несделанные; «+ ещё» показывает все', async () => {
    show(['ielts', 'sat'])
    const region = await screen.findByRole('region', { name: /IELTS/ })
    await waitFor(() => expect(within(region).getAllByRole('listitem')).toHaveLength(3))
    expect(within(region).queryByText('Выполнено')).toBeNull()
    fireEvent.click(within(region).getByRole('button', { name: '+ ещё 2 задания' }))
    expect(within(region).getAllByRole('listitem')).toHaveLength(5)
    expect(within(region).getByText('Выполнено')).toBeTruthy()
    fireEvent.click(within(region).getByRole('button', { name: 'Свернуть' }))
    expect(within(region).getAllByRole('listitem')).toHaveLength(3)
  })

  it('«Начать» у задачи IELTS ведёт туда же, куда кнопка вкладки «Сегодня» IELTS', async () => {
    const onNav = vi.fn()
    show(['ielts', 'sat'], { onNav })
    const region = await screen.findByRole('region', { name: /IELTS/ })
    const row = await within(region).findByText(/Opinion/)
    fireEvent.click(within(row.closest('li')).getByRole('button', { name: 'Начать' }))
    expect(onNav).toHaveBeenCalledWith('ielts', { tab: 'learn', view: 'practice-list', list: 'writing:task2:opinion' })
  })

  it('одно направление — секция без сворачивания; у IELTS до анкеты — шаг старта', async () => {
    api.ieltsMe = { onboarded: false }
    const onNav = vi.fn()
    show(['ielts'], { onNav })
    await screen.findByText('Начнём подготовку к IELTS')
    expect(screen.queryByRole('button', { name: /^IELTS/ })).toBeNull()
    expect(screen.getByText('1 задача')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Начать подготовку' }))
    expect(onNav).toHaveBeenCalledWith('ielts-onboarding')
    expect(api.dashCalls).toBe(0)
  })

  it('SAT: задания вкладки «Сегодня», ошибки — с числом; слова — в «Словарь» с отметкой «начато»', async () => {
    const onNav = vi.fn()
    show(['ge', 'sat'], { onNav })
    // у General English два задания, у SAT три: раскрыта первая по порядку с задачами — General English
    await waitFor(() => expect(nameOf('SAT')).toBe('SAT, 3 задачи'))
    expect(toggle('General English').getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(toggle('SAT'))
    const region = screen.getByRole('region', { name: /SAT/ })
    expect(within(region).getByText('Работа над ошибками')).toBeTruthy()
    expect(within(region).getByText(/3 ошибки ждут разбора/)).toBeTruthy()
    fireEvent.click(within(within(region).getByText('Выучить 15–20 слов').closest('li')).getByRole('button'))
    expect(onNav).toHaveBeenCalledWith('vocab')
    expect(Object.keys(localStorage).filter((k) => k.startsWith('jts_sat_words_')).map((k) => localStorage.getItem(k))).toEqual(['partial'])
    fireEvent.click(within(within(region).getByText('Работа над ошибками').closest('li')).getByRole('button'))
    expect(onNav).toHaveBeenLastCalledWith('sat')
  })

  it('секция General English — то же «Сегодня»: «Весь план» и «Начать» на месте, своей рамки и заголовка нет', async () => {
    show(['ge', 'ielts'])
    await waitFor(() => expect(nameOf('IELTS')).toBe('IELTS, 4 задачи'))
    fireEvent.click(toggle('General English'))
    const region = screen.getByRole('region', { name: /General English/ })
    expect(region.querySelector('.ge-today--embedded')).toBeTruthy()
    expect(region.querySelector('.hm-card')).toBeNull()
    expect(within(region).queryByRole('heading', { name: 'Сегодня' })).toBeNull()
    expect(within(region).getByRole('button', { name: /Весь план/ })).toBeTruthy()
  })
})
