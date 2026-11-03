// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const api = vi.hoisted(() => ({
  lesson: null,
  lessonError: null,
  catalog: [],
  completed: [],
  complete: vi.fn(async () => ({ completedLessonIds: [] })),
}))

vi.mock('../../api.js', () => ({
  getCourseCatalogLesson: vi.fn(async () => {
    if (api.lessonError) throw api.lessonError
    return api.lesson
  }),
  getCourseCatalog: vi.fn(async () => api.catalog),
  getCatalogProgress: vi.fn(async () => ({ completedLessonIds: api.completed })),
  completeCatalogLesson: api.complete,
  selfStudyLessonRenderUrl: (id, token) => `https://api.test/student/catalog-lessons/${id}/render?access_token=${token}`,
}))
vi.mock('../../components/Sidebar.jsx', () => ({ default: () => <nav data-testid="sidebar" /> }))

import SelfStudyLessonPage from './SelfStudyLessonPage.jsx'

const CATALOG = [{
  id: 1,
  code: 'A0',
  units: [
    { id: 11, name: 'Unit 1', lessons: [
      { id: 100, title: 'First', mode: 'SELF_STUDY' },
      { id: 101, title: 'First', mode: 'ONE_TO_ONE' },
      { id: 102, title: 'Second', mode: 'SELF_STUDY' },
    ] },
    { id: 12, name: 'Unit 2', lessons: [{ id: 103, title: 'Third', mode: 'SELF_STUDY' }] },
  ],
}]

function open(lessonId = 100, props = {}) {
  const handlers = { onExit: vi.fn(), onOpenLesson: vi.fn() }
  render(
    <I18nProvider>
      <SelfStudyLessonPage
        lessonId={lessonId}
        token="tok"
        userName="Ученик"
        userLevel="A0"
        fallback={<div data-testid="old-lesson" />}
        {...handlers}
        {...props}
      />
    </I18nProvider>,
  )
  return handlers
}

async function frame() {
  const node = await screen.findByTitle(api.lesson.title)
  fireEvent.load(node)
  return node
}

function fromFrame(node, data) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source: node.contentWindow }))
  })
}

function stages(node, titles, index = 0) {
  fromFrame(node, { source: 'jts-lesson', type: 'stage-list', titles })
  fromFrame(node, { source: 'jts-lesson', type: 'stage', index, total: titles.length })
}

beforeEach(() => {
  api.lesson = { id: 100, title: 'Coffee', selfStudyFile: true }
  api.lessonError = null
  api.catalog = CATALOG
  api.completed = []
  api.complete.mockClear()
  try { localStorage.clear() } catch { /* нет хранилища — тест и без него */ }
})

describe('SelfStudyLessonPage', () => {
  it('урок с парой в файле открывается рамкой на страницу self с токеном в адресе', async () => {
    open()
    const node = await frame()
    expect(node.getAttribute('src')).toBe('https://api.test/student/catalog-lessons/100/render?access_token=tok')
    expect(screen.queryByTestId('old-lesson')).toBeNull()
  })

  it('урок без пары и отказ сервера остаются на прежнем экране', async () => {
    api.lesson = { id: 100, title: 'Coffee', selfStudyFile: false }
    open()
    expect(await screen.findByTestId('old-lesson')).toBeTruthy()
  })

  it('ошибка сервера не оставляет ученика на вечной загрузке', async () => {
    api.lessonError = Object.assign(new Error('closed'), { status: 403 })
    open()
    expect(await screen.findByTestId('old-lesson')).toBeTruthy()
  })

  it('этапы приходят от рамки: список, счётчик и текущий этап', async () => {
    open()
    const node = await frame()
    stages(node, ['Warm-up', 'Vocabulary', 'Grammar'], 1)

    const current = screen.getByRole('button', { name: 'Vocabulary' })
    expect(current.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Этап 2 из 3')).toBeTruthy()
  })

  it('чужая рамка этапы не подменяет', async () => {
    open()
    await frame()
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { source: 'jts-lesson', type: 'stage-list', titles: ['Чужой'] },
        source: window,
      }))
    })
    expect(screen.queryByRole('button', { name: 'Чужой' })).toBeNull()
  })

  it('кнопки и этапы просят рамку перейти тем же контрактом, что живой урок', async () => {
    open()
    const node = await frame()
    const post = vi.spyOn(node.contentWindow, 'postMessage')
    stages(node, ['Warm-up', 'Vocabulary', 'Grammar'], 1)

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(post).toHaveBeenLastCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 2 }, '*')
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(post).toHaveBeenLastCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 1 }, '*')
    fireEvent.click(screen.getByRole('button', { name: 'Grammar' }))
    expect(post).toHaveBeenLastCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 2 }, '*')
  })

  it('тест юнита: рамка о переходе не сообщает, а счётчик и кнопки всё равно идут', async () => {
    open()
    const node = await frame()
    stages(node, ['Part 1', 'Part 2'], 0)

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))

    expect(screen.getByText('Этап 2 из 2')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Следующий урок' })).toBeTruthy()
  })

  it('на первом этапе «Назад» выключена', async () => {
    open()
    const node = await frame()
    stages(node, ['Warm-up', 'Vocabulary'], 0)
    expect(screen.getByRole('button', { name: 'Назад' }).disabled).toBe(true)
  })

  it('последний этап: урок отмечается пройденным и открывается следующий самостоятельный урок', async () => {
    const { onOpenLesson, onExit } = open()
    const node = await frame()
    stages(node, ['Warm-up', 'Wrap'], 1)

    fireEvent.click(await screen.findByRole('button', { name: 'Следующий урок' }))

    await waitFor(() => expect(onOpenLesson).toHaveBeenCalledWith(102))
    expect(api.complete).toHaveBeenCalledWith('tok', 100)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('последний урок курса завершается выходом в список', async () => {
    api.lesson = { id: 103, title: 'Third', selfStudyFile: true }
    const { onExit, onOpenLesson } = open(103)
    const node = await frame()
    stages(node, ['Warm-up', 'Wrap'], 1)
    // Содержание приехало — подпись стала точной.
    fireEvent.click(await screen.findByRole('button', { name: 'Завершить урок' }))

    await waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(onOpenLesson).not.toHaveBeenCalled()
  })

  it('сбой отметки не запирает ученика в уроке', async () => {
    api.complete.mockRejectedValueOnce(new Error('offline'))
    const { onOpenLesson } = open()
    const node = await frame()
    stages(node, ['Wrap', 'End'], 1)

    fireEvent.click(await screen.findByRole('button', { name: 'Следующий урок' }))

    await waitFor(() => expect(onOpenLesson).toHaveBeenCalledWith(102))
  })

  it('содержание: только самостоятельные уроки, по юнитам, текущий отмечен; Esc закрывает', async () => {
    api.completed = [102]
    const { onOpenLesson } = open()
    await frame()

    fireEvent.click(await screen.findByRole('button', { name: 'Содержание' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Unit 1')
    expect(dialog.textContent).toContain('Unit 2')
    expect(screen.getAllByRole('button', { name: /First/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /First/ }).getAttribute('aria-current')).toBe('true')
    await waitFor(() => expect(screen.getByRole('button', { name: /Second/ }).textContent).toContain('Пройдено'))

    fireEvent.click(screen.getByRole('button', { name: /Third/ }))
    expect(onOpenLesson).toHaveBeenCalledWith(103)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Содержание' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('каталог не ответил — урок идёт без содержания', async () => {
    api.catalog = []
    open()
    await frame()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Завершить урок' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Содержание' })).toBeNull()
  })
})
