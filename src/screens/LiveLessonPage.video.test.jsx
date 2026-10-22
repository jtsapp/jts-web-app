// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Состояние урока, который отдаёт бэкенд: меняется тестом перед рендером.
let СТАТУС = 'IN_PROGRESS'
const videoStub = {
  phase: 'connected', fallback: null, deviceError: false, isHost: false, micOn: true, camOn: false,
  tiles: [{ userId: '7', name: 'Адильжан', audioMuted: false, videoOn: false, isHost: true, speaking: false, isSelf: false },
    { userId: '10', name: 'Данияр', audioMuted: false, videoOn: false, isHost: false, speaking: false, isSelf: true }],
  join: vi.fn(), leave: vi.fn(), toggleMic: vi.fn(), toggleCamera: vi.fn(),
  muteUser: vi.fn(), muteAll: vi.fn(), removeUser: vi.fn(), attachVideo: vi.fn(), detachVideo: vi.fn(),
}
const useLessonVideoMock = vi.fn(() => videoStub)
vi.mock('./live/useLessonVideo.js', () => ({ useLessonVideo: (args) => useLessonVideoMock(args) }))

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

// Тест о звонке: он принадлежит странице, а не колонке «Урок».
function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

async function renderLesson() {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor('STUDENT', 10)} userName="Тест" onBack={() => {}} />
    </I18nProvider>,
  )
  await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
}

describe('LiveLessonPage — звонок и вкладка «Доска»', () => {
  beforeEach(() => {
    СТАТУС = 'IN_PROGRESS'
    videoStub.leave.mockClear()
    useLessonVideoMock.mockClear()
  })

  it('хук звонка включён в открытом онлайн-уроке', async () => {
    await renderLesson()
    expect(useLessonVideoMock).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 5, teacherUserId: 7, enabled: true }))
  })

  it('урок завершён — хук выключен', async () => {
    СТАТУС = 'COMPLETED'
    await renderLesson()
    expect(useLessonVideoMock).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
  })

  // Решение владельца 23.10: звонок в правой колонке первым, над темами урока.
  it('звонок стоит в правой колонке выше тем урока', async () => {
    await renderLesson()
    const call = screen.getByRole('region', { name: 'Звонок урока' })
    const topics = document.querySelector('.lv-side')
    expect(topics).toBeTruthy()
    expect(call.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('«Урок» -> «Доска» -> «К звонку» не вызывает leave и показывает плашку только на доске', async () => {
    await renderLesson()
    expect(screen.getByRole('region', { name: 'Звонок урока' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'К звонку' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Доска' }))
    expect(screen.getByTestId('board')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Звонок урока' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'К звонку' }))

    expect(screen.getByRole('region', { name: 'Звонок урока' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'К звонку' })).toBeNull()
    expect(videoStub.leave).not.toHaveBeenCalled()
  })
})
