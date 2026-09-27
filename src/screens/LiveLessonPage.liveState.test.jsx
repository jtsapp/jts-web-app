// @vitest-environment jsdom
//
// Экран урока живёт по состоянию занятия, которое хранит сервер (спека
// live-lesson-server-state): снимок при подключении сокета и рассылка канала
// state. Тест играет роль бэкенда: отдаёт снимок (getLiveState) и шлёт
// состояния через обработчики сокета.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const NOW = 1790000000000
let socketHandlers = {}
let snapshot = null

vi.mock('../api.js', () => ({
  getLessonById: vi.fn(async () => ({
    id: 14,
    status: 'IN_PROGRESS',
    engine: 'FILE',
    lessonType: 'INDIVIDUAL',
    topic: 'The family group chat',
    teacherId: 6,
    teacherName: 'Преподаватель',
    meetingUrl: null,
    durationMinutes: 60,
    participants: [{ studentId: 7, studentName: 'Ученик', status: 'SCHEDULED' }],
  })),
  getLiveState: vi.fn(async () => snapshot),
  getLessonSections: vi.fn(async () => [
    { id: 3, title: 'Разминка', materials: [{ materialId: 11, title: 'A0 · Урок 05', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L05.html' }] },
  ]),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  getLessonViewStages: vi.fn(async () => []),
  lessonMaterialRenderUrl: (lessonId, materialId) => `http://api.test/student/lessons/${lessonId}/materials/${materialId}/render`,
  startLiveLesson: vi.fn(async () => ({})),
  pauseLiveLesson: vi.fn(async () => ({})),
  resumeLiveLesson: vi.fn(async () => ({})),
  completeLiveLesson: vi.fn(async () => ({})),
  searchDictionary: vi.fn(async () => []),
}))

vi.mock('./live/useLessonPresence.js', () => ({
  useLessonPresence: () => ({ roster: [{ userId: 6 }, { userId: 7 }], connected: true }),
}))

vi.mock('./live/useLessonLiveSocket.js', () => ({
  useLessonLiveSocket: (lessonId, token, selfUserId, opts) => ({
    connected: true,
    sendFocus: vi.fn(),
    sendMirror: vi.fn(),
    sendPresent: vi.fn(),
    sendStepProgress: vi.fn(),
    sendAudio: vi.fn(),
    sendCall: vi.fn(),
    sendWatch: vi.fn(),
    ...((socketHandlers = opts || {}), {}),
  }),
}))

vi.mock('./workspace/LessonContent.jsx', () => ({
  default: () => <div data-testid="content" />,
  practiceCardStats: () => ({ total: 0, current: 0 }),
}))
vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

/** Состояние занятия, как его отдаёт сервер (§6.2). */
function liveState(patch = {}) {
  return {
    lessonId: 14,
    version: 1,
    status: 'IN_PROGRESS',
    pausedUntilMs: null,
    leading: false,
    focusSeq: 0,
    focusView: 'LESSON',
    sectionId: null,
    materialId: null,
    stepId: null,
    questionId: null,
    stageIndex: null,
    timer: null,
    serverNowMs: NOW,
    ...patch,
  }
}

async function flush() {
  await act(async () => {})
  await act(async () => {})
}

/** Ученик (id 7) на занятии 14. */
async function renderAsStudent() {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  const view = render(
    <I18nProvider>
      <LiveLessonPage lessonId={14} token={tokenFor('STUDENT', 7)} userName="Ученик" onBack={() => {}} />
    </I18nProvider>
  )
  await flush()
  return view
}

/** Сокет подключился: экран берёт снимок, сервер отвечает `state`. */
async function connectWith(state) {
  snapshot = state
  await act(async () => { socketHandlers.onConnect?.() })
  await flush()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  snapshot = null
  socketHandlers = {}
})
afterEach(() => vi.useRealTimers())

describe('LiveLessonPage — таймер из состояния занятия', () => {
  // Вошедший посреди отсчёта ученик видит остаток сразу — раньше таймер
  // появлялся только со следующим стартом преподавателя.
  it('вход в идущий таймер: остаток в шапке', async () => {
    const { container } = await renderAsStudent()

    await connectWith(liveState({ timer: { endsAtMs: NOW + 90_000, durationSeconds: 120 } }))

    expect(container.querySelector('.lv-top__timer').textContent).toContain('01:30')
  })

  it('таймер снят в новом состоянии — в шапке снова статус', async () => {
    const { container } = await renderAsStudent()
    await connectWith(liveState({ timer: { endsAtMs: NOW + 90_000, durationSeconds: 120 } }))

    await act(async () => { socketHandlers.onState(liveState({ version: 2, timer: null })) })

    expect(container.querySelector('.lv-top__timer')).toBeNull()
  })
})
