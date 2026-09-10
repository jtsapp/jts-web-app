// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getCatalogLessonAnswers: vi.fn(async () => ({ progressJson: null })),
  saveCatalogLessonAnswers: vi.fn(async () => ({})),
}))

import { getCatalogLessonAnswers, saveCatalogLessonAnswers } from '../api.js'
import LessonWorkspacePage from './LessonWorkspacePage.jsx'
import { lessonCardIds } from '../lib/lessonCardId.js'

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

/**
 * Карточка урока, заданная на дом.
 *
 * Преподаватель отправляет из живого урока не весь урок, а одну карточку
 * (⋮ → «Добавить в домашнее задание»), и в выдаче лежит её АДРЕС — урок каталога
 * плюс адрес по содержимому (см. src/lib/lessonCardId.js). Открывая задание,
 * ученик обязан попасть на эту карточку, а не в начало урока.
 */
describe('карточка урока, заданная на дом', () => {
  // Урок, который плеер осиливает целиком: info + choice, ничего из
  // UNSUPPORTED (см. liveSteps.js). Обычным путём он открывается очередью
  // экранов — и ровно поэтому годится проверить, что ссылка на карточку уводит
  // в документ: в очереди экранов якорей нет вовсе.
  const PLAYABLE = {
    id: 7,
    title: 'Seasons',
    steps: [
      {
        id: 's1',
        order: 1,
        title: 'Read',
        blocks: [
          { type: 'info', html: '<p>Winter is the coldest season.</p>' },
          { type: 'practice', title: 'Warm-up', questions: [
            { id: 'q1', type: 'choice', prompt: 'Sky?', options: ['blue', 'green'], answer: 'blue' },
          ] },
        ],
      },
      {
        id: 's2',
        order: 2,
        title: 'Talk',
        blocks: [{ type: 'info', html: '<p>Tell your teacher about your favourite season.</p>' }],
      },
    ],
  }

  const адресКарточки = (stepIndex, blockIndex) =>
    lessonCardIds(PLAYABLE).get(PLAYABLE.steps[stepIndex].blocks[blockIndex])

  const props = { catalogLessonId: 7, loadLesson: async () => PLAYABLE }

  beforeEach(() => {
    // jsdom не умеет ни прокрутку, ни CSS.escape (в браузерах есть оба);
    // подъезд к карточке проверяем по подсветке.
    Element.prototype.scrollIntoView = vi.fn()
    globalThis.CSS = globalThis.CSS || { escape: (v) => v }
    getCatalogLessonAnswers.mockResolvedValue({ progressJson: null })
  })

  // Текст урока ищем по textContent, а не getByText: тап-перевод оборачивает
  // каждое слово в свой span (wrapTapWords), и матчер по узлу его не собирает.
  const виден = (container, text) => container.textContent.includes(text)

  it('без карточки урок открывается как раньше — очередью экранов', async () => {
    const { container } = show(props.loadLesson, props)
    await waitFor(() => expect(container.querySelector('.cp')).toBeTruthy())
    expect(container.querySelector('.lw-doc')).toBeNull()
  })

  it('по адресу карточки открывается её шаг, а не начало урока', async () => {
    const { container } = show(props.loadLesson, { ...props, cardId: адресКарточки(1, 0) })

    // Документ, а не плеер: в очереди экранов подъезжать некуда.
    await waitFor(() => expect(container.querySelector('.lw-doc')).toBeTruthy())
    expect(container.querySelector('.cp')).toBeNull()
    // Второй шаг, и он же помечен активной вкладкой.
    await waitFor(() => expect(виден(container, 'Tell your teacher')).toBe(true))
    expect(container.querySelector('.ls-tab--active')?.textContent).toBe('Talk')
    // Сама карточка помечена «сюда смотреть».
    const focused = container.querySelector('.lw-q--live-here')
    expect(focused?.getAttribute('data-question-id')).toBe('block-0')
  })

  it('восстановленный прогресс не уводит с заданной карточки', async () => {
    // Урок и сохранённая работа приезжают двумя запросами, ответ сервера —
    // позже. Без оговорки карточка открывалась бы и через полсекунды уезжала
    // на последний шаг ученика, уже на глазах.
    // Ответ ПОЗЖЕ урока — иначе гонки нет вовсе: восстановление успевало бы
    // до карточки, и тест проходил бы даже без оговорки.
    getCatalogLessonAnswers.mockReturnValueOnce(new Promise((resolve) => {
      setTimeout(() => resolve({
        progressJson: JSON.stringify({ shape: 'lesson-steps', answers: {}, checked: [], stepId: 's1' }),
      }), 20)
    }))
    const { container } = show(props.loadLesson, { ...props, cardId: адресКарточки(1, 0) })

    await waitFor(() => expect(виден(container, 'Tell your teacher')).toBe(true))
    await new Promise((r) => setTimeout(r, 40))
    expect(container.querySelector('.ls-tab--active')?.textContent).toBe('Talk')
  })

  it('карточку переписали — говорим прямо, а не открываем соседнюю', async () => {
    // Молчаливое открытие начала урока читалось бы как «задание — вот это».
    const { container } = show(props.loadLesson, { ...props, cardId: 'cdeadbeef' })

    expect(await screen.findByText(/в уроке его больше нет/)).toBeTruthy()
    expect(container.querySelector('.lw-q--live-here')).toBeNull()
  })
})
