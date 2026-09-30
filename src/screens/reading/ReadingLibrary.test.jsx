// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { READING_KEY } from '../../practice/practiceKeys.js'

// Экран «Чтения» целиком тянет лейаут и квоты — карточке нужен только список
// уровней для фильтра.
vi.mock('../ReadingPage.jsx', () => ({ READING_LEVELS: ['a1', 'b1'] }))

const { default: ReadingLibrary } = await import('./ReadingLibrary.jsx')

// Одно упражнение на пять пунктов: процент текста = доля верных пунктов.
const TEXT = {
  id: 'b1-sci-tickle',
  level: 'B1',
  genre: 'science',
  title: "Why You Can't Tickle Yourself",
  text: ['Your brain predicts your own movements.'],
  cover: { emoji: '🪶' },
  exercises: [{ type: 'order', items: ['a', 'b', 'c', 'd', 'e'] }],
}

function seed(entry) {
  localStorage.setItem(READING_KEY, JSON.stringify({ texts: entry ? { [TEXT.id]: entry } : {} }))
}

function mount() {
  return render(
    <I18nProvider>
      <ReadingLibrary level="b1" genre="all" texts={[TEXT]} progressTick={0} onLevel={() => {}} onGenre={() => {}} onOpen={() => {}} />
    </I18nProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

// Карточка из видео клиента: «✓ Готово» и «Читать снова» при 61% читались как
// «текст пройден», хотя почти половина заданий не решена. «Готово» ставил флаг
// «дошёл до экрана результата», а он не про качество. Теперь надпись и отметка
// идут от процента: не всё верно — зовём дорешать, всё — предлагаем повторить.
describe('ReadingLibrary — надпись на карточке по прогрессу', () => {
  it('0% — «Начать чтение», без отметки', () => {
    seed(null)
    const { getByRole, queryByText } = mount()
    expect(getByRole('button', { name: /Начать чтение/ })).toBeTruthy()
    expect(queryByText(/Готово/)).toBeNull()
  })

  it('1–99% — «Завершить?», даже если результат уже открывали', () => {
    seed({ ex: { 0: { score: 3, total: 5 } }, done: true })
    const { getByRole, getByText, queryByText } = mount()
    expect(getByText('60%')).toBeTruthy()
    expect(getByRole('button', { name: /Завершить\?/ })).toBeTruthy()
    expect(queryByText(/Готово/)).toBeNull()
  })

  it('100% — «Выполнено, повторить?» и отметка «Готово»', () => {
    seed({ ex: { 0: { score: 5, total: 5 } }, done: false })
    const { getByRole, getByText } = mount()
    expect(getByRole('button', { name: /Выполнено, повторить\?/ })).toBeTruthy()
    expect(getByText(/Готово/)).toBeTruthy()
  })
})
