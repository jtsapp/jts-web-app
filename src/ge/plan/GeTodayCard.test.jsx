// @vitest-environment jsdom
// «Сегодня» на «Главной» по ТЗ v2.0, 5.2–5.3: минуты дня, «По порядку / По навыкам», «Зачем» у текущего шага,
// «Откроется» и переход к конкретному материалу, «готово · +N токенов».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

let rewards = true
vi.mock('../../config.js', async (orig) => ({ ...(await orig()), areRewardsEnabled: () => rewards }))
vi.mock('../../api.js', async (orig) => ({
  ...(await orig()),
  getGeProfile: async () => ({ targetLevel: 'B2' }),
  markGeTaskDone: vi.fn(),
}))
vi.mock('../../practice/practiceTokens.js', () => ({
  useStudentTokens: () => ({}),
  taskTokenPoints: (_data, task) => (task.module === 'vocabulary_sr' ? 2 : 0),
}))
// слабее всего — говорение: строка «Зачем» у шага Speaking Buddy говорит об этом
vi.mock('../../practice/skillStats.js', () => ({
  readLocalLevelSkillStats: () => null,
  loadLevelSkillStatsRemote: async () => ({
    listening: { done: 10, firstTry: 9 },
    speaking: { done: 10, firstTry: 4 },
    reading: { done: 10, firstTry: 8 },
  }),
}))
vi.mock('./taskTargets.js', async (orig) => {
  const real = await orig()
  const loaders = {
    workbook: async () => ({ n: 5, title: 'Getting to know you', started: true }),
    reading: async () => ({ id: 'a2-sci-pitch', title: 'The Longest Experiment in the World', started: false }),
    shadowing: async () => ({ id: 'v5', title: 'Barack Obama', started: false }),
  }
  return { ...real, materialTargets: (tasks, opts) => real.materialTargets(tasks, { ...opts, loaders }) }
})

const { I18nProvider } = await import('../../i18n.jsx')
const { resetTodayGoalCache } = await import('./useTodayExtras.js')
const { default: GeTodayCard } = await import('../../screens/home/GeTodayCard.jsx')

const TODAY = '2026-11-09'
const task = (id, over) => ({ id, date: TODAY, minutes: 15, got: 0, status: 'available', overdue: false, ...over })
const plan = (tasks) => ({ today: TODAY, state: 'ready', route: 'self_study', tasks })

const DAY = [
  task(1, { kind: 'course', minutes: 30 }),
  task(2, { kind: 'practice', module: 'ai_tutor', status: 'in_progress', got: 6 }),
  task(3, { kind: 'practice', module: 'vocabulary_sr', status: 'completed', got: 15 }),
  task(4, { kind: 'practice', module: 'workbooks' }),
]
const frontier = [{ code: 'L12', title: 'Famous people', unit: 4 }]

const show = (tasks, props = {}) =>
  render(
    <I18nProvider>
      <GeTodayCard plan={plan(tasks)} frontier={frontier} level="A2" token="TOK" onReload={() => {}} onNav={props.onNav || (() => {})} />
    </I18nProvider>,
  )

describe('GeTodayCard', () => {
  beforeEach(() => {
    rewards = true
    resetTodayGoalCache()
  })

  it('шапка — минуты своих задач дня; по порядку — тип, уровень, «Зачем» у текущего шага', async () => {
    show(DAY)
    expect(screen.getByText('21 из 75 мин')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('28')
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText(/Урок курса · 30 мин/)).toBeTruthy()
    expect(within(rows[0]).getByText('A2')).toBeTruthy()
    // текущий шаг — урок курса: следующий урок уровня и цель из анкеты
    await waitFor(() => expect(within(rows[0]).getByText(/Следующий урок курса A2 — шаг к цели B2\./)).toBeTruthy())
    expect(within(rows[0]).getByText('Откроется: Повторение → A2 → Юнит 4 → «Famous people»')).toBeTruthy()
    // «Зачем» — только у текущего шага
    expect(within(rows[1]).queryByText('Зачем:')).toBeNull()
  })

  it('«Начать» ведёт к материалу: урок воркбука уровня, начатый — «Продолжить»', async () => {
    const onNav = vi.fn()
    show(DAY, { onNav })
    const row = screen.getAllByRole('listitem')[3]
    await waitFor(() => expect(within(row).getByText('Откроется: Практика → Воркбук A2 → урок 5 «Getting to know you»')).toBeTruthy())
    fireEvent.click(within(row).getByRole('button', { name: 'Продолжить' }))
    expect(onNav).toHaveBeenCalledWith('workbook', { level: 'a2', lesson: 5 })
  })

  it('слабый навык — довод «Зачем» у шага этого навыка', async () => {
    show([task(2, { kind: 'practice', module: 'ai_tutor' }), task(4, { kind: 'practice', module: 'workbooks' })])
    const row = screen.getAllByRole('listitem')[0]
    await waitFor(() => expect(within(row).getByText(/Говорение у тебя сейчас слабее остальных навыков \(40%\)/)).toBeTruthy())
  })

  it('«готово · +N токенов» у выполненного шага — только где награды включены', async () => {
    const { unmount } = show(DAY)
    expect(screen.getByTestId('task-done-tokens').textContent).toBe('Готово · +2 токена')
    // догрузки (цель, навыки, материалы) — до размонтирования, иначе React ругается на обновление вне act
    await waitFor(() => expect(screen.getByText(/шаг к цели B2/)).toBeTruthy())
    unmount()
    rewards = false
    show(DAY)
    expect(screen.queryByTestId('task-done-tokens')).toBeNull()
    await waitFor(() => expect(screen.getByText(/шаг к цели B2/)).toBeTruthy())
  })

  it('больше пяти задач — сразу «По навыкам»; плитка раскрывает задачи и сворачивает', async () => {
    const many = [
      ...DAY,
      task(5, { kind: 'practice', module: 'media_practice' }),
      task(6, { kind: 'practice', module: 'shadowing', minutes: 10 }),
    ]
    show(many)
    expect(screen.getByRole('button', { name: 'По навыкам' }).getAttribute('aria-pressed')).toBe('true')
    const tiles = screen.getAllByRole('button', { expanded: false })
    expect(tiles.map((b) => b.querySelector('b').textContent)).toEqual(['Урок курса', 'Чтение', 'Говорение', 'Грамматика', 'Словарь'])
    const speaking = screen.getByRole('button', { name: /Говорение/ })
    expect(speaking.textContent).toContain('2 задачи · 25 мин')
    fireEvent.click(speaking)
    expect(speaking.getAttribute('aria-expanded')).toBe('true')
    const open = document.getElementById('ge-sk-open')
    expect(within(open).getAllByRole('listitem')).toHaveLength(2)
    await waitFor(() => expect(within(open).getByText('Откроется: Практика → Шэдоуинг → «Barack Obama»')).toBeTruthy())
    fireEvent.click(speaking)
    expect(document.getElementById('ge-sk-open')).toBeNull()
    // выбор ученика — по порядку
    fireEvent.click(screen.getByRole('button', { name: 'По порядку' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
  })
})
