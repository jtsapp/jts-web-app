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
  // профиль IELTS ещё не настроен — на «Сегодня» стоит приглашение в онбординг
  getIeltsProfile: vi.fn(async () => ({ onboarded: false, track: 'academic', bands: null })),
  // главный экран без бэкенда — экран показывает стартовый план, а не падает
  getIeltsDashboard: vi.fn(async () => null),
  rebuildIeltsPlan: vi.fn(async () => null),
  getIeltsProgress: vi.fn(async () => ({ history: [], byType: { listening: [], reading: [] }, traps: {}, writing: { checked: 0, criteria: {} }, speaking: { checked: 0, criteria: {} }, recent: [] })),
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

describe('IeltsPage — хаб раздела', () => {
  it('стартует с «Сегодня»: план, балл, быстрые действия, дорожка', async () => {
    renderPage()
    expect(screen.getByRole('tab', { name: 'Сегодня' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('План на день')).toBeTruthy()
    expect(screen.getByText('Текущий балл')).toBeTruthy()
    expect(screen.getByText('Быстрые действия')).toBeTruthy()
    expect(screen.getByText('Путь до экзамена')).toBeTruthy()
    // Серия — из общего баланса; XP бэкенд ещё не считает — чипа нет.
    expect(await screen.findByText('3 дня подряд')).toBeTruthy()
    expect(screen.queryByText(/XP/)).toBeNull()
    // Без балла — приглашение пройти тест, а не «0.0».
    expect(screen.getByText('Пройдите пробный тест, чтобы узнать балл')).toBeTruthy()
    expect(screen.queryByText('Сегодня урок с преподавателем в 19:00')).toBeNull()
  })

  it('«Начать» в плане ведёт в экран секции', () => {
    const onGo = vi.fn()
    renderPage({ onGo })
    fireEvent.click(screen.getAllByRole('button', { name: 'Начать' })[0])
    expect(onGo).toHaveBeenCalledWith('ielts-listening')
  })

  it('«Пробные тесты»: таблица полного Reading с результатами, и вкладка пишется в URL', async () => {
    const onNav = vi.fn()
    renderPage({ onNav })
    fireEvent.click(screen.getByRole('tab', { name: 'Пробные тесты' }))
    expect(window.location.search).toContain('ieltsTab=mocks')
    expect(await screen.findByText('Test 1')).toBeTruthy()
    expect(screen.getByText('Night trains · Honey bees · Who owns English?')).toBeTruthy()
    expect(screen.getByText('31 из 40 · band 7.0')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }))
    expect(onNav).toHaveBeenCalledWith('ielts-reading-run', expect.objectContaining({ testId: 'RM-AC-F01', mode: 'exam' }))
  })

  it('«Обучение» → Reading → «Задания Reading» открывает список текстов', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Обучение' }))
    fireEvent.click(screen.getByRole('button', { name: /Задания Reading/ }))
    expect(await screen.findByText('Counting the trees')).toBeTruthy()
    expect(window.location.search).toContain('ieltsView=texts')
  })

  it('открывается на вкладке из ?ieltsTab=', async () => {
    window.history.replaceState(null, '', '/?screen=ielts&ieltsTab=progress')
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Прогресс' }).getAttribute('aria-selected')).toBe('true'),
    )
  })

  it('с данными макета (?ieltsSample=1) — как в Figma', async () => {
    window.history.replaceState(null, '', '/?screen=ielts&ieltsSample=1')
    renderPage()
    expect(await screen.findByText('Сегодня урок с преподавателем в 19:00')).toBeTruthy()
    expect(screen.getByText('1/5')).toBeTruthy()
    expect(document.querySelector('.ih-band__overall b').textContent).toBe('6.0')
    expect(screen.getByText('Цель 7.0')).toBeTruthy()
    expect(screen.getByText('Начните с этого')).toBeTruthy()
    expect(screen.getAllByText('оценит ИИ')).toHaveLength(2)
    expect(screen.getByText('Сейчас · вехи 2 из 4')).toBeTruthy()
  })
})
