// @vitest-environment jsdom
//
// Хаб IELTS (?screen=ielts): вкладки переключаются, «Сегодня» без данных
// бэкенда не рисует выдуманных чисел, а с данными макета (?ieltsSample=1)
// показывает их. Карточки «Пробных тестов» проверяет MockTestsTab.test.jsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 3, streakActiveToday: true })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false, track: 'academic' })),
  getMyLessonOccurrences: vi.fn(async () => []),
  getIeltsPlan: vi.fn(async () => ({ enrollment: { status: 'programme_pending', pendingReason: 'no_diagnostic' }, tasks: [] })),
  markIeltsPlanTask: vi.fn(async () => null),
  moveIeltsPlanTask: vi.fn(async () => null),
  // профиль IELTS ещё не настроен — на «Сегодня» стоит приглашение в онбординг
  getIeltsProfile: vi.fn(async () => ({ onboarded: false, track: 'academic', bands: null })),
  // главный экран без бэкенда — экран показывает стартовый план, а не падает
  getIeltsDashboard: vi.fn(async () => null),
  rebuildIeltsPlan: vi.fn(async () => null),
  getIeltsProgress: vi.fn(async () => ({ history: [], byType: { listening: [], reading: [] }, traps: {}, writing: { checked: 0, criteria: {} }, speaking: { checked: 0, criteria: {} }, recent: [] })),
  // полный mock: один сданный (6.5), один прерванный, второй mock не начат
  getIeltsMocks: vi.fn(async () => {
    const sec = (name, band) => ({ name, band, state: 'done', attemptIds: [1], parts: [] })
    const done = { id: 7, mockId: 'MOCK-AC-01', title: 'Mock 01', module: 'academic', status: 'submitted', overall: 6.5, partial: false,
      finishedAt: '2026-10-05T10:00:00', sections: [sec('listening', 7), sec('reading', 6.5), sec('writing', 6), sec('speaking', 6.5)] }
    const aborted = { id: 6, mockId: 'MOCK-AC-01', title: 'Mock 01', module: 'academic', status: 'aborted', overall: null, startedAt: '2026-09-30T10:00:00', sections: [] }
    return { mocks: [{ id: 'MOCK-AC-01', title: 'Mock 01', module: 'academic', status: 'submitted', sessionId: 7 }, { id: 'MOCK-AC-02', title: 'Mock 02', module: 'academic', status: 'not_started' }], history: [done, aborted], open: null }
  }),
  // каталог Reading с бэкенда: один полный тест и один текст, чтобы вкладки было что рисовать
  getIeltsTests: vi.fn(async (_token, skill = 'reading') => skill !== 'reading' ? [] : [
    { id: 'RM-AC-F01', kind: 'test', module: 'academic', title: 'Full 1', questionCount: 40, maxScore: 40, attemptCount: 1,
      textTitles: ['Night trains', 'Honey bees', 'Who owns English?'], questionTypes: ['tfng'],
      lastAttempt: { id: 9, rawScore: 31, maxScore: 40, band: 7, mode: 'exam' }, bestAttempt: { id: 9, rawScore: 31, maxScore: 40, band: 7 } },
    { id: 'RD-AC-P1', kind: 'passage', module: 'academic', title: 'Counting the trees', questionCount: 12, maxScore: 13, attemptCount: 0, questionTypes: ['tfng'] },
  ]),
}))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  useIeltsEntitlement: () => ({ loading: false, allowed: true, limit: 5, used: 0 }),
}))

import IeltsPage from './IeltsPage.jsx'

function renderPage(props = {}) {
  return render(
    <I18nProvider>
      <IeltsPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onGo={() => {}} {...props} />
    </I18nProvider>
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/?screen=ielts')
})


describe('IeltsPage — хаб по дизайну «IELTS new»', () => {
  it('пять вкладок, без «Прогресса» и быстрых действий; без данных — честные пустые состояния', async () => {
    renderPage()
    const tabs = screen.getAllByRole('tab').map((x) => x.textContent)
    expect(tabs).toEqual(['Сегодня', 'План', 'Практика IELTS', 'Mock-тесты', 'Об экзамене'])
    expect(screen.getByRole('tab', { name: 'Сегодня' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('Быстрые действия')).toBeNull()
    // нет даты и оценки — состояние блока цели, а не «0.0» и не отрицательные дни
    expect(screen.getByText('Дата экзамена не указана')).toBeTruthy()
    expect(screen.getByText('Пройди диагностику, чтобы узнать старт.')).toBeTruthy()
    expect(screen.getByText(/Пройдите диагностику — по её результату/)).toBeTruthy()
  })

  it('«Mock-тесты»: последняя попытка, доступные mock и история; вкладка пишется в URL', async () => {
    const onNav = vi.fn()
    renderPage({ onNav })
    fireEvent.click(screen.getByRole('tab', { name: 'Mock-тесты' }))
    expect(window.location.search).toContain('ieltsTab=mocks')
    expect(await screen.findByText('Mock 02')).toBeTruthy()
    // последняя сданная попытка: overall и четыре секции
    expect(screen.getByText('6.5', { selector: '.ih-mt__lastband b' })).toBeTruthy()
    expect(screen.getByText('Прерван')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Подробнее' })[1])
    expect(onNav).toHaveBeenCalledWith('ielts-mock', { mockId: 'MOCK-AC-02' })
    fireEvent.click(screen.getByRole('button', { name: /Посмотреть разбор/ }))
    expect(onNav).toHaveBeenCalledWith('ielts-mock', { sessionId: '7', view: 'result' })
  })

  it('«Практика IELTS» → Reading → «Тексты на время» показывает текст и пишет вид в URL', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Практика IELTS' }))
    fireEvent.click(await screen.findByRole('button', { name: /Reading.*Тексты/ }))
    fireEvent.click(screen.getByRole('tab', { name: 'Тексты на время' }))
    expect(await screen.findByText('Counting the trees')).toBeTruthy()
    expect(window.location.search).toContain('ieltsView=texts')
  })

  it('поиск без результатов предлагает сбросить фильтры', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Практика IELTS' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'графики' } })
    expect(await screen.findByText('Ничего не найдено')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    expect(screen.getByText('Каталог по навыкам')).toBeTruthy()
  })

  it('?ieltsTab=progress — вложенный «Подробный прогресс», вкладка «Сегодня» остаётся выбранной', async () => {
    window.history.replaceState(null, '', '/?screen=ielts&ieltsTab=progress')
    renderPage()
    expect(await screen.findByText('Подробный прогресс')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Сегодня' }).getAttribute('aria-selected')).toBe('true'))
  })
})
