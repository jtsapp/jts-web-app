// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'

// Экран целиком: лейаут, квоты, учёт времени и сам текст к проверке отношения не
// имеют — заглушаем. Проверяем загрузку уровня (источник, data-source) и прыжок
// из домашки на текст, которого на стенде уже нет.
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({ usePracticeEntitlement: () => ({ loading: false, allowed: true }) }))
vi.mock('../lib/useTimeOnTask.js', () => ({ useTimeOnTask: () => {} }))
vi.mock('./reading/ReadingText.jsx', () => ({ default: ({ text }) => <h1 data-testid="reading-text">{text.title}</h1> }))
const loadReadingLevel = vi.fn()
vi.mock('../practice/reading/readingContent.js', () => ({ loadReadingLevel: (...a) => loadReadingLevel(...a) }))

const TEXT = { id: 'a1-sci-honey', level: 'A1', genre: 'science', title: 'Honey From the Old Tomb', cover: { emoji: '🍯' }, text: ['Honey.'], exercises: [] }

// Кэш уровней живёт в модуле — свежий модуль на каждый тест. Провайдер берём
// из того же свежего графа модулей: иначе у экрана и провайдера разные контексты.
async function mount(props = {}) {
  vi.resetModules()
  const { default: ReadingPage } = await import('./ReadingPage.jsx')
  const { I18nProvider } = await import('../i18n.jsx')
  return render(
    <I18nProvider>
      <ReadingPage userLevel="a1" token="" onNav={() => {}} {...props} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  loadReadingLevel.mockReset()
})
afterEach(cleanup)

describe('ReadingPage — откуда тексты', () => {
  it('тексты с бэкенда: библиотека их показывает, корень помечен data-source="api"', async () => {
    loadReadingLevel.mockResolvedValue({ data: { level: 'A1', texts: [TEXT] }, source: 'api' })
    const { container, findByText } = await mount()
    expect(await findByText(TEXT.title)).toBeTruthy()
    expect(container.querySelector('.rd').getAttribute('data-source')).toBe('api')
    expect(loadReadingLevel).toHaveBeenCalledWith('a1')
  })

  it('со статики — data-source="static"', async () => {
    loadReadingLevel.mockResolvedValue({ data: { level: 'A1', texts: [TEXT] }, source: 'static' })
    const { container, findByText } = await mount()
    await findByText(TEXT.title)
    expect(container.querySelector('.rd').getAttribute('data-source')).toBe('static')
  })
})

describe('ReadingPage — прыжок из домашки', () => {
  it('текст есть — открывается сразу', async () => {
    loadReadingLevel.mockResolvedValue({ data: { level: 'A1', texts: [TEXT] }, source: 'api' })
    const { findByTestId } = await mount({ initialTarget: { level: 'A1', textId: TEXT.id } })
    expect((await findByTestId('reading-text')).textContent).toBe(TEXT.title)
  })

  // Админ скрыл или удалил текст, пока задание висело: вместо молча открытой
  // библиотеки ученик видит, почему его текста нет.
  it('текста больше нет на стенде — библиотека с объяснением', async () => {
    loadReadingLevel.mockResolvedValue({ data: { level: 'A1', texts: [TEXT] }, source: 'api' })
    const { findByRole, queryByTestId } = await mount({ initialTarget: { level: 'A1', textId: 'a1-sci-gone-k3f9q' } })
    expect((await findByRole('status')).textContent).toMatch(/больше нет в библиотеке/)
    await waitFor(() => expect(queryByTestId('reading-text')).toBeNull())
  })
})
