// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Состояние урока, который отдаёт бэкенд: меняется тестом перед рендером.
let СТАТУС = 'IN_PROGRESS'
let MEET = 'https://meet.google.com/abc-defg-hij'

vi.mock('../api.js', () => ({
  // «Темы урока» страница спрашивает при открытии файлового урока (пришло из
  // develop). Пустой список — у этих спек урок без стадий, они про другое.
  getLessonViewStages: vi.fn(async () => []),
  getLessonById: vi.fn(async () => ({
    id: 5,
    status: СТАТУС,
    lessonType: 'INDIVIDUAL_STANDARD',
    format: 'ONLINE',
    groupName: null,
    topic: 'Present Perfect',
    teacherId: 7,
    teacherName: 'Адильжан Алимжанов',
    meetingUrl: MEET,
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
  // Страница спрашивает модуль, идти ли вообще за уроком каталога (разбор
  // выключаем флагом, standalone там не ищется никогда). В моке отвечаем «да»:
  // эти спеки как раз про урок, который в каталоге есть.
  shouldResolveCatalogLesson: () => true,
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

// Встроенного звонка в уроке больше нет (Zoom Video SDK убран 25.10.2026): на его месте
// в правой колонке — карточка ссылки на внешний звонок, как до Zoom.
function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

async function renderLesson(role, id) {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor(role, id)} userName="Тест" onBack={() => {}} />
    </I18nProvider>,
  )
  await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
}

describe('LiveLessonPage — звонок по ссылке вместо встроенного', () => {
  beforeEach(() => {
    СТАТУС = 'IN_PROGRESS'
    MEET = 'https://meet.google.com/abc-defg-hij'
  })

  it('у преподавателя онлайн-урока ссылка на звонок стоит первой в правой колонке, над темами', async () => {
    await renderLesson('TEACHER', 7)
    const link = screen.getByRole('link', { name: 'Позвонить учителю' })
    expect(link.getAttribute('href')).toBe(MEET)
    const topics = document.querySelector('.lv-side')
    expect(topics).toBeTruthy()
    expect(link.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Звонок урока' })).toBeNull()
  })

  it('без ссылки преподаватель видит «Добавить ссылку на звонок»', async () => {
    MEET = null
    await renderLesson('TEACHER', 7)
    expect(screen.getByRole('button', { name: 'Добавить ссылку на звонок' })).toBeTruthy()
  })

  it('ученику карточки в колонке нет и плашки «К звонку» на доске тоже', async () => {
    await renderLesson('STUDENT', 10)
    expect(document.querySelector('.lw-live-aside .lw-meet')).toBeNull()
    screen.getByRole('button', { name: 'Доска' }).click()
    await waitFor(() => expect(screen.getByTestId('board')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'К звонку' })).toBeNull()
  })

  it('урок завершён — вместо карточки итог', async () => {
    СТАТУС = 'COMPLETED'
    await renderLesson('TEACHER', 7)
    expect(document.querySelector('.lw-summary')).toBeTruthy()
    expect(document.querySelector('.lw-live-aside .lw-meet')).toBeNull()
  })
})
