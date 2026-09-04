// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const catalog = { value: [] }
const progress = { value: [] }

vi.mock('../../api.js', () => ({
  getCourseCatalog: vi.fn(async () => catalog.value),
  getCatalogProgress: vi.fn(async () => ({ completedLessonIds: progress.value })),
  completeCatalogLesson: vi.fn(async (t, id) => ({ completedLessonIds: [...progress.value, Number(id)] })),
  uncompleteCatalogLesson: vi.fn(async (t, id) => ({
    completedLessonIds: progress.value.filter((x) => Number(x) !== Number(id)),
  })),
}))

import SelfStudy from './SelfStudy.jsx'

// Форма — как у настоящей ручки: id уровня числовой, код CEFR в code, и каждый
// урок лежит трижды, по разу на режим.
const CATALOG = [
  {
    id: 1,
    code: 'A1',
    label: 'just to study — A1 · Course',
    units: [{
      id: 1,
      name: 'Unit 1',
      lessons: [
        { id: 10, title: 'My biography', type: 'LESSON', mode: 'SELF_STUDY' },
        { id: 11, title: 'My biography', type: 'LESSON', mode: 'ONE_TO_ONE' },
        { id: 12, title: 'My biography', type: 'LESSON', mode: 'GROUP' },
      ],
    }],
  },
  {
    id: 2,
    code: 'A2',
    label: 'just to study — A2 · Course',
    units: [{
      id: 2,
      name: 'Unit 2',
      lessons: [
        { id: 20, title: 'Changing direction', type: 'LESSON', mode: 'SELF_STUDY' },
        { id: 21, title: 'Закрытый урок', type: 'LESSON', mode: 'SELF_STUDY', locked: true },
      ],
    }],
  },
  {
    id: 5,
    code: 'B2',
    label: 'just to study — B2 · Course',
    units: [{ id: 3, name: 'Unit 3', lessons: [{ id: 30, title: 'Далёкий уровень', mode: 'SELF_STUDY' }] }],
  },
]

function draw(props = {}) {
  const onOpenLesson = vi.fn()
  const view = render(
    <I18nProvider>
      <SelfStudy token="T" userLevel="A2" onOpenLesson={onOpenLesson} {...props} />
    </I18nProvider>,
  )
  return { ...view, onOpenLesson }
}

describe('Самостоятельное обучение', () => {
  beforeEach(() => { catalog.value = CATALOG; progress.value = [] })

  it('показывает уровни до своего включительно', async () => {
    draw()
    expect(await screen.findByText('My biography')).toBeTruthy()
    expect(screen.getByText('Changing direction')).toBeTruthy()
  })

  it('уровни выше своего не показывает', async () => {
    // Каталог целиком — инструмент преподавателя; ученику он открыл бы курс
    // в обход программы. Правило то же, что у карты королевств и словаря.
    draw()
    await screen.findByText('My biography')
    expect(screen.queryByText('Далёкий уровень')).toBeNull()
  })

  it('A1 открыт даже новичку с A0', async () => {
    draw({ userLevel: 'A0' })
    expect(await screen.findByText('My biography')).toBeTruthy()
    expect(screen.queryByText('Changing direction')).toBeNull()
  })

  it('берёт только самостоятельный режим, а не все три копии урока', async () => {
    // Каждый урок лежит в каталоге трижды — SELF_STUDY, ONE_TO_ONE и GROUP.
    // Без фильтра ученик увидел бы три одинаковых названия подряд.
    draw()
    expect(await screen.findAllByText('My biography')).toHaveLength(1)
  })

  it('закрытые преподавателем уроки не показывает', async () => {
    draw()
    await screen.findByText('Changing direction')
    expect(screen.queryByText('Закрытый урок')).toBeNull()
  })

  it('нажатие открывает урок по его id', async () => {
    const { onOpenLesson } = draw()
    fireEvent.click(await screen.findByText('Changing direction'))
    expect(onOpenLesson).toHaveBeenCalledWith(20)
  })

  it('юнит, где все уроки закрыты, не показывается пустой рамкой', async () => {
    catalog.value = [
      { id: 1, code: 'A1', units: [{ id: 1, name: 'Пустой юнит', lessons: [{ id: 9, title: 'x', mode: 'SELF_STUDY', locked: true }] }] },
    ]
    draw()
    await waitFor(() => expect(screen.queryByText('Пустой юнит')).toBeNull())
  })

  it('когда открывать нечего — объясняет, а не молчит', async () => {
    catalog.value = []
    draw()
    expect(await screen.findByText(/Пока нечего проходить/)).toBeTruthy()
  })

  it('без токена в сеть не ходит', async () => {
    const { getCourseCatalog } = await import('../../api.js')
    getCourseCatalog.mockClear()
    draw({ token: null })
    expect(getCourseCatalog).not.toHaveBeenCalled()
  })
})

describe('Отметка о прохождении', () => {
  beforeEach(() => { catalog.value = CATALOG; progress.value = [] })

  it('пройденный урок открывается отмеченным', async () => {
    progress.value = [20]
    const { container } = draw()
    await screen.findByText('Changing direction')

    const marks = container.querySelectorAll('.ss-mark')
    const pressed = [...marks].filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
  })

  it('нажатие отмечает урок и сохраняет на сервере', async () => {
    const { completeCatalogLesson } = await import('../../api.js')
    const { container } = draw()
    await screen.findByText('Changing direction')

    const mark = container.querySelector('.ss-row .ss-mark')
    fireEvent.click(mark)

    await waitFor(() => expect(mark.getAttribute('aria-pressed')).toBe('true'))
    expect(completeCatalogLesson).toHaveBeenCalled()
  })

  it('повторное нажатие снимает отметку', async () => {
    // Отметка ручная — значит её должно быть можно и убрать.
    progress.value = [20]
    const { uncompleteCatalogLesson } = await import('../../api.js')
    const { container } = draw()
    await screen.findByText('Changing direction')

    const mark = [...container.querySelectorAll('.ss-mark')]
      .find((b) => b.getAttribute('aria-pressed') === 'true')
    fireEvent.click(mark)

    await waitFor(() => expect(mark.getAttribute('aria-pressed')).toBe('false'))
    expect(uncompleteCatalogLesson).toHaveBeenCalled()
  })

  it('счётчик юнита показывает пройденное из общего', async () => {
    progress.value = [20]
    draw()
    // В юните A2 один урок из одного самостоятельного (второй закрыт).
    expect(await screen.findByText('1 из 1')).toBeTruthy()
  })

  it('отметка не открывает урок', async () => {
    // Строка сама открывает урок, и клик по галочке не должен уводить с экрана.
    const { container, onOpenLesson } = draw()
    await screen.findByText('Changing direction')

    fireEvent.click(container.querySelector('.ss-mark'))
    expect(onOpenLesson).not.toHaveBeenCalled()
  })
})
