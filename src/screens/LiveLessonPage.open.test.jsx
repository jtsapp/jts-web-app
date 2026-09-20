// @vitest-environment jsdom
//
// Урок открыт ученику всегда — в любом состоянии, кроме отменённого.
//
// До 20.09.2026 экран урока запирался трижды: пока преподаватель не нажал
// «Начать», ученик видел пустую страницу с «урок ещё не начат»; на перерыве и
// после «Завершить» варианты ответа переставали нажиматься. Решение владельца
// (spec-lesson-always-open) это отменило: ученик заходит и делает задания
// когда угодно, а закрытым остаётся только полотно преподавателя — он читает
// чужую работу, а не решает за ученика.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Состояние урока, который отдаёт бэкенд: меняется тестом перед рендером.
let СТАТУС = 'IN_PROGRESS'

vi.mock('../api.js', () => ({
  getLessonById: vi.fn(async () => ({
    id: 5,
    status: СТАТУС,
    lessonType: 'INDIVIDUAL_STANDARD',
    groupName: null,
    topic: 'Present Perfect',
    teacherId: 7,
    teacherName: 'Адильжан Алимжанов',
    meetingUrl: null,
    durationMinutes: 60,
    participants: [{ studentId: 10, studentName: 'Данияр Серіков', status: 'SCHEDULED' }],
  })),
  getLessonSections: vi.fn(async () => ([
    { id: 1, position: 0, materials: [{ materialId: 100, title: 'Unit 1', fileUrl: 'https://cdn/lesson-1.html' }] },
  ])),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  editLessonMessage: vi.fn(async () => ({})),
  deleteLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  startLiveLesson: vi.fn(async () => ({})),
  pauseLiveLesson: vi.fn(async () => ({})),
  resumeLiveLesson: vi.fn(async () => ({})),
  completeLiveLesson: vi.fn(async () => ({})),
  searchDictionary: vi.fn(async () => []),
}))

// Материал раздела — урок каталога с одним заданием на выбор ответа: без
// разобранных шагов на экране нечего нажимать, а проверяем мы именно это.
vi.mock('./live/catalogLessonByUrl.js', () => ({
  catalogLessonIdFor: vi.fn(async () => 55),
  isStandaloneLessonUrl: () => false,
}))

vi.mock('./workspace/loadCatalogLesson.js', () => ({
  loadCatalogLesson: vi.fn(async () => ({
    id: 55,
    steps: [{
      id: 's1',
      title: 'Warm up',
      blocks: [{
        type: 'practice',
        title: 'Listen. Tick what she likes.',
        questions: [
          { id: 'q1', type: 'choice', prompt: 'Paul is here on business.', options: ['True', 'False'], answer: 'True' },
        ],
      }],
    }],
  })),
}))

vi.mock('./live/useLessonPresence.js', () => ({
  useLessonPresence: () => ({ roster: [{ userId: 7 }, { userId: 10 }], connected: true }),
}))

vi.mock('./live/useLessonLiveSocket.js', () => ({
  useLessonLiveSocket: () => ({
    connected: true,
    sendFocus: vi.fn(),
    sendMirror: vi.fn(),
    sendPresent: vi.fn(),
    sendStepProgress: vi.fn(),
    sendAudio: vi.fn(),
    sendCall: vi.fn(),
    sendWatch: vi.fn(),
  }),
}))

// Доска рисуется на fabric.js поверх настоящего canvas — в jsdom он пустой.
vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

async function renderLesson(status, role = 'STUDENT', id = 10) {
  СТАТУС = status
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  const utils = render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor(role, id)} userName="Тест" onBack={() => {}} />
    </I18nProvider>,
  )
  await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
  return utils
}

// Варианты ответа на экране: их наличие и «живость» — и есть ответ на вопрос
// «может ли ученик выполнять задания».
async function options(container) {
  await waitFor(() => expect(container.querySelectorAll('.lw-opt').length).toBeGreaterThan(0))
  return [...container.querySelectorAll('.lw-opt')]
}

describe('LiveLessonPage — ученик заходит в урок в любом состоянии', () => {
  beforeEach(() => { СТАТУС = 'IN_PROGRESS' })

  for (const status of ['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']) {
    it(`${status}: задания на экране и отвечать можно`, async () => {
      const { container } = await renderLesson(status)
      const opts = await options(container)

      for (const opt of opts) {
        expect(opt.disabled).toBe(false)
        expect(opt.classList.contains('is-locked')).toBe(false)
      }

      // Варианты на экране перемешаны (stableShuffle), поэтому ждём выбранным
      // тот, по которому щёлкнули, а не заранее известное «True».
      const выбранный = opts[0].textContent
      fireEvent.click(opts[0])
      await waitFor(() => {
        expect(container.querySelector('.lw-opt.is-selected')?.textContent).toBe(выбранный)
      })
    })
  }

  // Самый частый случай на проде: преподаватель забыл нажать «Начать». Раньше
  // ученик получал ровно эту строку и ничего больше — теперь она стоит НАД
  // заданиями и обещает ровно то, что происходит.
  it('SCHEDULED: строка ожидания не отменяет заданий', async () => {
    const { container } = await renderLesson('SCHEDULED')
    expect(screen.getByText('Преподаватель ещё не начал урок. Задания уже можно выполнять')).toBeTruthy()
    expect((await options(container)).length).toBeGreaterThan(0)
  })

  it('PAUSED: баннер перерыва не запирает ответы', async () => {
    await renderLesson('PAUSED')
    expect(screen.getByText('Перерыв у преподавателя. Вы можете продолжать заниматься')).toBeTruthy()
  })

  it('COMPLETED: баннер говорит, что задания остались доступны', async () => {
    await renderLesson('COMPLETED')
    expect(screen.getByText(/Урок завершён\. Задания остаются доступными/)).toBeTruthy()
  })

  // Единственное закрытое состояние: занятия не было. Вместо пустой страницы —
  // объяснение, иначе ученик по прямой ссылке видит белый экран.
  it('CANCELLED: урока нет, но экран об этом говорит', async () => {
    const { container } = await renderLesson('CANCELLED')
    expect(screen.getByText('Занятие отменено')).toBeTruthy()
    expect(container.querySelector('.lw-opt')).toBeNull()
    expect(container.querySelector('.ls__tabs')).toBeNull()
  })
})

describe('LiveLessonPage — преподаватель по-прежнему только читает', () => {
  // Замок сняли с ученика, не с преподавателя: он смотрит чужую работу, и
  // ответ за ученика испортил бы её. Варианты обязаны и выглядеть закрытыми —
  // на телефоне курсора нет, и немая пилюля неотличима от живой.
  it('COMPLETED: варианты закрыты и помечены', async () => {
    const { container } = await renderLesson('COMPLETED', 'TEACHER', 7)
    for (const opt of await options(container)) {
      expect(opt.disabled).toBe(true)
      expect(opt.classList.contains('is-locked')).toBe(true)
    }
  })

  it('IN_PROGRESS: тоже закрыты — урок идёт, но отвечает ученик', async () => {
    const { container } = await renderLesson('IN_PROGRESS', 'TEACHER', 7)
    for (const opt of await options(container)) {
      expect(opt.disabled).toBe(true)
    }
  })
})
