// @vitest-environment jsdom
//
// Хаб IELTS (?screen=ielts): вкладки переключаются, «Сегодня» без данных
// бэкенда не рисует выдуманных чисел, а с данными макета (?ieltsSample=1)
// показывает их. Карточки «Пробных тестов» проверяет MockTestsTab.test.jsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 3, streakActiveToday: true })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
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
  // тренировки Writing: прогресс и очередь ошибок — на сервере; разбора нет — блока «по разбору» нет
  getIeltsDrillProgress: vi.fn(async () => []),
  importIeltsDrillProgress: vi.fn(async () => null),
  postIeltsDrillRun: vi.fn(async () => null),
  getIeltsReview: vi.fn(async () => []),
  resolveIeltsReview: vi.fn(async () => null),
  getIeltsWritingWorks: vi.fn(async () => []),
  getIeltsAttempt: vi.fn(async () => null),
  // документ задания для превью карточки (график Task 1)
  getIeltsTest: vi.fn(async (_token, id) => ({ test: { id }, document: { question: `Question of ${id}.\n\nSummarise…`, chart: { type: 'bar', x: ['A', 'B'], series: [{ name: '', values: [1, 2] }] } } })),
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
import * as api from '../api.js'
import { getIeltsDashboard, getIeltsMe, getIeltsTests } from '../api.js'

// «Сегодня» с двумя задачами программы: тип вопроса Reading и Task 1 (график у Academic, письмо у General Training)
const TODAY = {
  programme: {
    enrollment: { status: 'active', studyMode: 'self_study', programmeName: 'IELTS 5.5–6.0' },
    currentWeek: 1,
    tasks: [
      { id: 'a', sec: 'reading', kind: 'type', sub: 'tfng', n: 1, minutes: 7, status: 'available' },
      { id: 'b', sec: 'writing', kind: 't1', sub: 'line', n: 1, minutes: 20, status: 'planned', extra: { gt: 'informal', timed: false } },
    ],
  },
}

function renderPage(props = {}) {
  return render(
    <I18nProvider>
      <IeltsPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onGo={() => {}} {...props} />
    </I18nProvider>
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/?screen=ielts')
  // jsdom прокрутки не умеет — хаб прокручивает к началу при каждом переходе
  window.scrollTo = vi.fn()
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

  it('ученице General Training и шапка, и Reading показывают GT, а не Academic', async () => {
    api.getIeltsMe.mockResolvedValueOnce({ ieltsAccount: true, track: 'general' })
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Практика IELTS' }))
    fireEvent.click(await screen.findByRole('button', { name: /Reading.*Тексты/ }))
    expect(await screen.findByText(/Показаны упражнения формата General Training/)).toBeTruthy()
    expect(screen.queryByText(/GT-тексты скрыты/)).toBeNull()
  })

  it('поиск без результатов предлагает сбросить фильтры', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Практика IELTS' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'графики' } })
    expect(await screen.findByText('Ничего не найдено')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    expect(screen.getByText('Каталог по навыкам')).toBeTruthy()
  })

  // «Reading · TFNG» на «Сегодня» открывал страницу всех типов Reading, и с середины: прокрутка «Сегодня» оставалась
  it('задача «Сегодня» открывает свой тип вопроса, и экран — с начала', async () => {
    getIeltsDashboard.mockResolvedValueOnce(TODAY)
    renderPage()
    expect(await screen.findByText(/Line graph/)).toBeTruthy()
    window.scrollTo.mockClear()
    fireEvent.click(screen.getAllByRole('button', { name: 'Продолжить' })[0])
    expect(window.location.search).toContain('ieltsView=practice-list')
    expect(new URLSearchParams(window.location.search).get('ieltsList')).toBe('reading:types:tfng')
    expect(await screen.findByRole('heading', { name: 'True / False / Not Given' })).toBeTruthy()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('у General Training Task 1 — письмо: и в подписи, и в том, куда ведёт задача', async () => {
    getIeltsMe.mockResolvedValueOnce({ ieltsAccount: true, access: true, track: 'general' })
    getIeltsDashboard.mockResolvedValueOnce(TODAY)
    renderPage()
    const row = (await screen.findByText(/Informal letter/)).closest('li')
    expect(screen.queryByText(/Line graph/)).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'Начать' }))
    expect(new URLSearchParams(window.location.search).get('ieltsList')).toBe('writing:task1:informal')
  })

  // замечание владельца 30.10.2026: «Short drills» → Writing открывали полные задания Task 1, а не короткие тренировки
  it('«Короткие тренировки» → Writing: строки дриллов, и строка открывает сам дрилл', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Практика IELTS' }))
    fireEvent.click(await screen.findByRole('tab', { name: 'Writing' }))
    expect(screen.queryByRole('button', { name: /Task 1: одно описание графика или письмо/ })).toBeNull()
    // каталог тренировок Writing на главной — тот же, что во вкладке: карточка с именем тренировки на языке интерфейса
    fireEvent.click(screen.getByRole('button', { name: /Task 1: общий вывод \(overview\)/ }))
    const q = new URLSearchParams(window.location.search)
    expect(q.get('ieltsView')).toBe('writing-drills')
    expect(q.get('ieltsTest')).toBe('WD-SAMPLE-T1-OVERVIEW')
    expect(await screen.findByRole('heading', { level: 2, name: 'Task 1: общий вывод (overview)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    expect(screen.getByText('Выберите лучший overview')).toBeTruthy()
    // «Назад» — туда, откуда запустили (история хаба): главная «Практики», а не начало раздела
    fireEvent.click(document.querySelector('.ih-wdrill__back'))
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('ieltsTest')).toBeNull())
    expect(await screen.findByText('Каталог по навыкам')).toBeTruthy()
  })

  // ТЗ §3.2–3.3: вкладки Writing со счётчиками, чипы типа в адресе, «Перед заданием этого типа», «Назад» — в тот же фильтр
  it('Writing: чипы типа → ieltsType, тренировка типа с ty, браузерная «Назад» возвращает фильтр и прокрутку', async () => {
    const writing = [
      { id: 'W1-AC-001', kind: 'task1', category: 'line', module: 'academic', title: 'Cycling', bandMin: 6, bandMax: 7, attemptCount: 1, bestAttempt: { band: 6.5 } },
      { id: 'W1-AC-201', kind: 'task1', category: 'line', module: 'academic', title: 'Bus trips', bandMin: 4.5, bandMax: 5.5, attemptCount: 0 },
      { id: 'W1-AC-103', kind: 'task1', category: 'pie', module: 'academic', title: 'Smartphones', bandMin: 5, bandMax: 6, attemptCount: 0 },
      { id: 'W2-001', kind: 'task2', category: 'opinion', module: 'both', title: 'Remote work', attemptCount: 0 },
      { id: 'WD-T1-TREND', kind: 'drill', category: 'task1', module: 'academic', title: 'Verb + adverb' },
      { id: 'WD-T1-TPL', kind: 'drill', category: 'task1', module: 'academic', title: 'Templates' },
    ]
    const bank = getIeltsTests.getMockImplementation()
    getIeltsTests.mockImplementation(async (_token, skill = 'reading') => (skill === 'writing' ? writing : []))
    window.history.replaceState(null, '', '/?screen=ielts&ieltsTab=learn&ieltsView=writing-task1')
    renderPage()
    expect(await screen.findByRole('tab', { name: /Task 1\s*3/, selected: true })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Короткие тренировки\s*2/ })).toBeTruthy()
    // от лёгких к сложным, «новое · проще», статус по лучшей попытке
    const titles = [...document.querySelectorAll('.ih-wcat__card .ih-wcat__title')].map((x) => x.textContent)
    expect(titles).toEqual(['Bus trips', 'Smartphones', 'Cycling'])
    expect(screen.getByText('новое · проще')).toBeTruthy()
    expect(screen.getByText('Band 6.5')).toBeTruthy()
    expect(screen.queryByText('Перед заданием этого типа')).toBeNull()

    window.scrollY = 240
    fireEvent.click(screen.getByRole('button', { name: /Line graph\s*2/ }))
    expect(new URLSearchParams(window.location.search).get('ieltsType')).toBe('line')
    expect(window.history.state.ihDepth).toBe(1)
    expect(screen.getByRole('button', { name: /Line graph/, pressed: true })).toBeTruthy()
    expect([...document.querySelectorAll('.ih-wcat__card .ih-wcat__title')].map((x) => x.textContent)).toEqual(['Bus trips', 'Cycling'])
    expect(screen.getByText('Перед заданием этого типа')).toBeTruthy()

    // тренировка типа из блока — с ty
    fireEvent.click(screen.getByRole('button', { name: /^Verb \+ adverb/ }))
    let q = new URLSearchParams(window.location.search)
    expect([q.get('ieltsView'), q.get('ieltsTest'), q.get('ieltsType')]).toEqual(['writing-drills', 'WD-T1-TREND', 'line'])

    // браузерная «Назад» — список с тем же фильтром
    window.scrollTo.mockClear()
    window.history.back()
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('ieltsTest')).toBeNull())
    q = new URLSearchParams(window.location.search)
    expect([q.get('ieltsView'), q.get('ieltsType')]).toEqual(['writing-task1', 'line'])
    expect(await screen.findByText('Перед заданием этого типа')).toBeTruthy()
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 240))

    // «Теория этого типа» — глава гида этого типа во вкладке «Как писать»
    fireEvent.click(screen.getByRole('button', { name: /Теория этого типа/ }))
    q = new URLSearchParams(window.location.search)
    expect([q.get('ieltsView'), q.get('ieltsSection')]).toEqual(['writing-guide', 't1ac.line'])
    expect(await screen.findByRole('tab', { name: 'Как писать', selected: true })).toBeTruthy()
    getIeltsTests.mockImplementation(bank)
  })

  // замечание владельца 10: mock Writing по типам — вкладка страницы Writing, описание mock, старт тем же редактором
  it('Writing → «Mock по типам»: тип трека, описание mock и старт задания этого типа в режиме экзамена', async () => {
    const writing = [
      { id: 'W2-001', kind: 'task2', category: 'opinion', module: 'both', title: 'Remote work', attemptCount: 0 },
      { id: 'W1-AC-001', kind: 'task1', category: 'line', module: 'academic', title: 'Cycling', attemptCount: 0 },
    ]
    const bank = getIeltsTests.getMockImplementation()
    getIeltsTests.mockImplementation(async (_token, skill = 'reading') => (skill === 'writing' ? writing : []))
    const onNav = vi.fn()
    window.history.replaceState(null, '', '/?screen=ielts&ieltsTab=learn&ieltsView=writing-mocks')
    renderPage({ onNav })
    expect(await screen.findByRole('tab', { name: 'Mock по типам', selected: true })).toBeTruthy()
    const row = (await screen.findByText('Mock · Task 2 · Opinion essay')).closest('li')
    // тип без заданий не показывается
    expect(screen.queryByText('Mock · Task 1 · Map')).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'Открыть' }))
    const q = new URLSearchParams(window.location.search)
    expect(q.get('ieltsView')).toBe('writing-mock')
    expect(q.get('ieltsList')).toBe('task2:opinion')
    fireEvent.click(await screen.findByRole('button', { name: /Начать mock/ }))
    expect(onNav).toHaveBeenCalledWith('ielts-writing-run', expect.objectContaining({
      testId: 'W2-001', mode: 'exam', mockType: 'task2:opinion', back: { tab: 'learn', view: 'writing-mock', list: 'task2:opinion' },
    }))
    getIeltsTests.mockImplementation(bank)
  })

  it('?ieltsTab=progress — вложенный «Подробный прогресс», вкладка «Сегодня» остаётся выбранной', async () => {
    window.history.replaceState(null, '', '/?screen=ielts&ieltsTab=progress')
    renderPage()
    expect(await screen.findByText('Подробный прогресс')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Сегодня' }).getAttribute('aria-selected')).toBe('true'))
  })
})
