// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const searchDictionary = vi.fn()
vi.mock('../../api.js', () => ({ searchDictionary: (...args) => searchDictionary(...args) }))

const { default: LessonDictionary } = await import('./LessonDictionary.jsx')

/**
 * Словарь школы в уроке у ученика.
 *
 * У преподавателя такая панель есть давно, у ученика не было: за словом он уходил
 * из урока в раздел «Словарь» и терял место в задании.
 */
function mount() {
  return render(
    <I18nProvider>
      <LessonDictionary token="TOK" />
    </I18nProvider>,
  )
}

beforeEach(() => {
  searchDictionary.mockReset()
  searchDictionary.mockResolvedValue([{ id: 1, word: 'awkward', translatedWord: 'неловкий' }])
})
afterEach(cleanup)

describe('Словарь в уроке', () => {
  /* В колонке уже стоят звонок, темы и чат: раскрытая карточка вытолкнула бы чат
     за пределы экрана, а лишний запрос ушёл бы на каждый вход в урок. */
  it('свёрнут по умолчанию и до раскрытия ничего не грузит', () => {
    const { container } = mount()

    expect(container.querySelector('.lw-dict__body')).toBeNull()
    expect(searchDictionary).not.toHaveBeenCalled()
  })

  it('раскрытие грузит первую страницу и показывает слова', async () => {
    const { container, findByText } = mount()

    fireEvent.click(container.querySelector('.lw-dict__head'))

    expect(await findByText('awkward')).toBeTruthy()
    expect(await findByText('неловкий')).toBeTruthy()
    expect(searchDictionary).toHaveBeenCalledWith('TOK', '')
  })

  it('поиск уходит с набранным словом', async () => {
    vi.useFakeTimers()
    const { container } = mount()
    fireEvent.click(container.querySelector('.lw-dict__head'))
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    searchDictionary.mockClear()

    fireEvent.change(container.querySelector('.lw-dict__search input'), { target: { value: 'awk' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })

    expect(searchDictionary).toHaveBeenCalledWith('TOK', 'awk')
    vi.useRealTimers()
  })

  it('пустой ответ — «ничего не найдено», а не пустая карточка', async () => {
    searchDictionary.mockResolvedValue([])
    const { container, findByText } = mount()

    fireEvent.click(container.querySelector('.lw-dict__head'))

    expect(await findByText('Ничего не найдено')).toBeTruthy()
  })

  /* Словарь — не главное в уроке: его отказ не должен выглядеть как поломка
     занятия, но и молчать о нём нельзя — иначе пустая карточка читается как
     «слов нет». */
  it('ошибка загрузки сказана словами', async () => {
    searchDictionary.mockRejectedValue(new Error('нет сети'))
    const { container, findByText } = mount()

    fireEvent.click(container.querySelector('.lw-dict__head'))

    expect(await findByText('Не удалось загрузить словарь')).toBeTruthy()
  })

  it('повторное нажатие сворачивает', async () => {
    const { container } = mount()
    fireEvent.click(container.querySelector('.lw-dict__head'))
    await waitFor(() => expect(container.querySelector('.lw-dict__body')).not.toBeNull())

    fireEvent.click(container.querySelector('.lw-dict__head'))

    expect(container.querySelector('.lw-dict__body')).toBeNull()
  })
})
