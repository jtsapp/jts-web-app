// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getCatalogLessonAnswers: vi.fn(async () => ({ progressJson: null })),
  saveCatalogLessonAnswers: vi.fn(async () => ({})),
}))

import { getCatalogLessonAnswers, saveCatalogLessonAnswers } from '../api.js'
import LessonWorkspacePage from './LessonWorkspacePage.jsx'

// Урок, разобранный на шаги, но не по зубам плееру (pick-вопрос — см.
// liveSteps.js): именно он открывается документом, где и живут ответы.
const STEPPED = {
  id: 42,
  title: 'Coffee — yes',
  steps: [
    {
      id: 's1',
      order: 1,
      title: 'Warm-up',
      blocks: [{ type: 'practice', title: 'Warm-up', questions: [
        { id: 'q1', type: 'pick', prompt: '☕ coffee', options: ['👍', '👎'] },
      ] }],
    },
  ],
}

const FILE_URL = 'https://files-dev.justtostudy.kz/development/course-catalog/a2/lessons/L01.html'

function show(loadLesson, props = {}) {
  return render(
    <I18nProvider>
      <LessonWorkspacePage
        lessonId={42}
        token="TOK"
        loadLesson={loadLesson}
        onExit={() => {}}
        onNav={() => {}}
        onProfile={() => {}}
        {...props}
      />
    </I18nProvider>,
  )
}

describe('урок в воркспейсе', () => {
  it('урок без разбора на шаги открывается своим материалом', async () => {
    // Две трети уроков каталога не разобраны на шаги — файл курса и есть урок.
    const { container } = show(async () => ({ id: 42, title: 'Getting to know you', fileUrl: FILE_URL, steps: [] }))

    await waitFor(() => expect(container.querySelector('.lw-material-iframe')).toBeTruthy())
    expect(container.querySelector('.lw-material-iframe').getAttribute('src')).toContain(FILE_URL)
  })

  it('материал открывается в самостоятельном варианте', async () => {
    // Файл курса умеет три варианта одного урока и выбирает их по ?mode=;
    // без параметра ученик «Самостоятельно» видел вариант для занятия.
    const { container } = show(async () => ({ id: 42, title: 'L01', fileUrl: FILE_URL, steps: [] }))

    await waitFor(() => expect(container.querySelector('.lw-material-iframe')).toBeTruthy())
    expect(container.querySelector('.lw-material-iframe').getAttribute('src')).toContain('mode=self')
  })

  it('из материала есть выход', async () => {
    // Раньше документ и материал открывались вообще без выхода — уйти можно
    // было только через сайдбар, и то догадавшись.
    const onExit = vi.fn()
    show(async () => ({ id: 42, title: 'Getting to know you', fileUrl: FILE_URL, steps: [] }), { onExit })

    fireEvent.click(await screen.findByRole('button', { name: /К урокам/ }))
    expect(onExit).toHaveBeenCalled()
  })

  it('не подставляет демо-урок вместо запрошенного', async () => {
    // Раньше здесь стоял `loaded || SAMPLE_LESSON`, и ученик получал чужой
    // демонстрационный урок с заглушкой «Место для баннера» — а читал это как
    // «материал обрезали». Не загрузилось — говорим об этом прямо.
    show(async () => null)

    expect(await screen.findByText(/Не удалось загрузить урок/)).toBeTruthy()
    expect(screen.queryByText('Место для баннера')).toBeNull()
  })

  it('без урока вовсе демо-урок остаётся — это его место', async () => {
    // SAMPLE_LESSON задуман содержимым экрана, открытого без lessonId.
    show(undefined, { lessonId: undefined, loadLesson: async () => null })

    expect(await screen.findByText('Место для баннера')).toBeTruthy()
  })
})

describe('работа ученика в самостоятельном уроке', () => {
  const props = { catalogLessonId: 42, loadLesson: async () => STEPPED }

  it('сохранённые ответы восстанавливаются при открытии', async () => {
    // Ученик отвечал, ушёл, вернулся — экран должен продолжить с того же места,
    // а не начать урок заново.
    getCatalogLessonAnswers.mockResolvedValueOnce({
      progressJson: JSON.stringify({ shape: 'lesson-steps', answers: { q1: '👍' }, checked: [], stepId: 's1' }),
    })
    const { container } = show(props.loadLesson, props)

    await waitFor(() => {
      const picked = container.querySelector('.lw-opt[aria-pressed="true"]')
      expect(picked?.textContent).toBe('👍')
    })
  })

  it('ответ уходит на сервер', async () => {
    saveCatalogLessonAnswers.mockClear()
    show(props.loadLesson, props)

    fireEvent.click(await screen.findByText('👍'))

    await waitFor(() => expect(saveCatalogLessonAnswers).toHaveBeenCalled())
    const [, id, payload] = saveCatalogLessonAnswers.mock.calls.at(-1)
    expect(id).toBe(42)
    expect(JSON.parse(payload)).toMatchObject({ shape: 'lesson-steps', answers: { q1: '👍' } })
  })

  it('пока ответы не прочитаны, поверх них ничего не пишется', async () => {
    // Иначе пустой стартовый объект уехал бы раньше ответа сервера — и работа
    // терялась бы тем вернее, чем медленнее сеть.
    getCatalogLessonAnswers.mockReturnValueOnce(new Promise(() => {}))
    saveCatalogLessonAnswers.mockClear()
    show(props.loadLesson, props)

    fireEvent.click(await screen.findByText('👍'))
    await new Promise((r) => setTimeout(r, 60))
    expect(saveCatalogLessonAnswers).not.toHaveBeenCalled()
  })

  it('без урока каталога в сеть за ответами не ходит', async () => {
    // Живой урок хранит ту же работу своим путём (material_progress).
    getCatalogLessonAnswers.mockClear()
    show(async () => STEPPED, { catalogLessonId: undefined })
    await screen.findByText('👍')
    expect(getCatalogLessonAnswers).not.toHaveBeenCalled()
  })
})
