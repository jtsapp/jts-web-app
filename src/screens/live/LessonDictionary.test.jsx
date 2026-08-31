// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor, act, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const searchDictionary = vi.fn()
const getSavedWords = vi.fn()
vi.mock('../../api.js', () => ({
  searchDictionary: (...args) => searchDictionary(...args),
  getSavedWords: (...args) => getSavedWords(...args),
}))

const { default: LessonDictionary } = await import('./LessonDictionary.jsx')

/**
 * Словарь в уроке у ученика — две вкладки.
 *
 * «Мои слова» — личный словарь: именно туда преподаватель кладёт слово кнопкой
 * «В словарь», и увидеть его ученик должен не уходя из урока. Открыта первой:
 * панель называется «Ваш словарь», и первое, что ученик там ищет, — своё.
 *
 * «Словарь школы» — общий список, курируемый админкой; тот же, что у преподавателя.
 */
function mount() {
  return render(
    <I18nProvider>
      <LessonDictionary token="TOK" />
    </I18nProvider>,
  )
}

function open(container) {
  fireEvent.click(container.querySelector('.lw-dict__head'))
}

function toSchoolTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Словарь школы' }))
}

beforeEach(() => {
  searchDictionary.mockReset()
  getSavedWords.mockReset()
  searchDictionary.mockResolvedValue([{ id: 1, word: 'awkward', translatedWord: 'неловкий' }])
  getSavedWords.mockResolvedValue([{ id: 7, word: 'fashion show', translation: 'показ мод' }])
})
afterEach(cleanup)

describe('Словарь в уроке', () => {
  /* В колонке уже стоят звонок, темы и чат: раскрытая карточка вытолкнула бы чат
     за пределы экрана, а лишний запрос ушёл бы на каждый вход в урок. */
  it('свёрнут по умолчанию и до раскрытия ничего не грузит', () => {
    const { container } = mount()

    expect(container.querySelector('.lw-dict__body')).toBeNull()
    expect(searchDictionary).not.toHaveBeenCalled()
    expect(getSavedWords).not.toHaveBeenCalled()
  })

  it('повторное нажатие сворачивает', async () => {
    const { container } = mount()
    open(container)
    await waitFor(() => expect(container.querySelector('.lw-dict__body')).not.toBeNull())

    fireEvent.click(container.querySelector('.lw-dict__head'))

    expect(container.querySelector('.lw-dict__body')).toBeNull()
  })
})

describe('Словарь в уроке — «Мои слова»', () => {
  /* Открывается первой: слово, которое положил преподаватель, ученику нужнее,
     чем общий банк школы. */
  it('открыта первой и показывает слова ученика', async () => {
    const { container, findByText } = mount()

    open(container)

    expect(await findByText('fashion show')).toBeTruthy()
    expect(await findByText('показ мод')).toBeTruthy()
    expect(getSavedWords).toHaveBeenCalled()
  })

  /* Своих слов десятки, а не тысячи: фильтруем на месте, сервер не тревожим. */
  it('поиск по своим словам идёт без запроса на сервер', async () => {
    const { container, findByText } = mount()
    open(container)
    await findByText('fashion show')
    searchDictionary.mockClear()

    fireEvent.change(container.querySelector('.lw-dict__search input'), { target: { value: 'показ' } })

    expect(await findByText('fashion show')).toBeTruthy()
    expect(searchDictionary).not.toHaveBeenCalled()
  })

  it('не подходящее под поиск слово из списка уходит', async () => {
    getSavedWords.mockResolvedValue([
      { id: 7, word: 'fashion show', translation: 'показ мод' },
      { id: 8, word: 'commute', translation: 'ездить на работу' },
    ])
    const { container, findByText, queryByText } = mount()
    open(container)
    await findByText('commute')

    fireEvent.change(container.querySelector('.lw-dict__search input'), { target: { value: 'fashion' } })

    await waitFor(() => expect(queryByText('commute')).toBeNull())
  })

  /* Пусто — не «сломалось»: объясняем, откуда слова здесь берутся. */
  it('пустой личный словарь объяснён словами', async () => {
    getSavedWords.mockResolvedValue([])
    const { container, findByText } = mount()

    open(container)

    expect(await findByText(/Слова появятся здесь/)).toBeTruthy()
  })
})

describe('Словарь в уроке — «Словарь школы»', () => {
  it('вкладка грузит первую страницу и показывает слова', async () => {
    const { container, findByText } = mount()
    open(container)

    toSchoolTab()

    expect(await findByText('awkward')).toBeTruthy()
    expect(await findByText('неловкий')).toBeTruthy()
    expect(searchDictionary).toHaveBeenCalledWith('TOK', '')
  })

  it('поиск уходит с набранным словом', async () => {
    const { container, findByText } = mount()
    open(container)
    toSchoolTab()
    await findByText('awkward')
    searchDictionary.mockClear()

    vi.useFakeTimers()
    fireEvent.change(container.querySelector('.lw-dict__search input'), { target: { value: 'awk' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    vi.useRealTimers()

    expect(searchDictionary).toHaveBeenCalledWith('TOK', 'awk')
  })

  it('пустой ответ — «ничего не найдено», а не пустая карточка', async () => {
    searchDictionary.mockResolvedValue([])
    const { container, findByText } = mount()
    open(container)

    toSchoolTab()

    expect(await findByText('Ничего не найдено')).toBeTruthy()
  })

  /* Словарь — не главное в уроке: его отказ не должен выглядеть как поломка
     занятия, но и молчать о нём нельзя — иначе пустая карточка читается как
     «слов нет». */
  it('ошибка загрузки сказана словами', async () => {
    searchDictionary.mockRejectedValue(new Error('нет сети'))
    const { container, findByText } = mount()
    open(container)

    toSchoolTab()

    expect(await findByText('Не удалось загрузить словарь')).toBeTruthy()
  })
})
