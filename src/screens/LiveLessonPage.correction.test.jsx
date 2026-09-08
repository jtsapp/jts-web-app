// @vitest-environment jsdom
//
// Кому достаётся правка преподавателя.
//
// Регрессия с группового урока: правка ответа уходит по ОБЩЕМУ каналу урока
// (адресный канал теряет её, когда преподаватель никого не выбрал, а при
// выбранном перемонтирование успевало стереть правку до прихода), но в событии
// не было адресата — и её применял каждый, кто стоял на том же вопросе. Поправив
// одного ученика, преподаватель затирал ответы остальным.
//
// Наблюдаем через sendStepProgress: применив ответ, экран тут же отсылает его
// обратно (см. handleAnswer). Не применил — не отослал.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const sendStepProgress = vi.fn()
let socketHandlers = {}

vi.mock('../api.js', () => ({
  getLessonById: vi.fn(async () => ({
    id: 5,
    status: 'IN_PROGRESS',
    lessonType: 'GROUP_STANDARD',
    groupName: 'B1 вечер',
    topic: 'Present Perfect',
    teacherId: 7,
    teacherName: 'Адильжан Алимжанов',
    meetingUrl: null,
    durationMinutes: 60,
    participants: [
      { studentId: 10, studentName: 'Данияр Серіков', status: 'SCHEDULED' },
      { studentId: 11, studentName: 'Асель Мұратова', status: 'SCHEDULED' },
    ],
  })),
  getLessonSections: vi.fn(async () => []),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  startLiveLesson: vi.fn(async () => ({})),
  pauseLiveLesson: vi.fn(async () => ({})),
  resumeLiveLesson: vi.fn(async () => ({})),
  completeLiveLesson: vi.fn(async () => ({})),
  searchDictionary: vi.fn(async () => []),
}))

vi.mock('./live/useLessonPresence.js', () => ({
  useLessonPresence: () => ({ roster: [{ userId: 7 }, { userId: 10 }, { userId: 11 }], connected: true }),
}))

vi.mock('./live/useLessonLiveSocket.js', () => ({
  useLessonLiveSocket: (lessonId, token, selfUserId, opts) => ({
    connected: true,
    sendFocus: vi.fn(),
    sendMirror: vi.fn(),
    sendPresent: vi.fn(),
    sendStepProgress,
    sendAudio: vi.fn(),
    sendCall: vi.fn(),
    sendWatch: vi.fn(),
    ...((socketHandlers = opts || {}), {}),
  }),
}))

vi.mock('./workspace/loadCatalogLesson.js', () => ({ loadCatalogLesson: vi.fn(async () => null) }))
vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

/** Данияр (id 10) на групповом уроке. */
async function renderAsStudent() {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  return render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor('STUDENT', 10)} userName="Данияр" onBack={() => {}} />
    </I18nProvider>
  )
}

/** Правка от преподавателя по общему каналу урока. */
const правка = (targetStudentId) => ({
  senderUserId: 7,
  senderName: 'Адильжан Алимжанов',
  senderRole: 'TEACHER',
  stepId: 'ex1',
  questionId: 'q1',
  value: 'is',
  targetStudentId,
})

describe('LiveLessonPage — правка преподавателя достаётся адресату', () => {
  beforeEach(() => { sendStepProgress.mockClear() })

  // То, из-за чего всё затевалось: преподаватель правит Асель (id 11), а ответ
  // подменялся и у Данияра, потому что событие общее.
  it('чужую правку ученик не применяет', async () => {
    await renderAsStudent()
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(11)) })

    expect(sendStepProgress).not.toHaveBeenCalled()
  })

  it('свою — применяет', async () => {
    await renderAsStudent()
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(10)) })

    expect(sendStepProgress).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', value: 'is' })
    )
  })

  // Преподаватель никого не выбрал — это разбор для всего класса, и на нём
  // держится заливка словаря. Такое применяют все.
  it('правку без адресата применяют все', async () => {
    await renderAsStudent()
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(null)) })

    expect(sendStepProgress).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', value: 'is' })
    )
  })

  // Ответы одноклассников идут тем же каналом и ответами этому ученику не являются.
  it('ответ одноклассника не становится своим', async () => {
    await renderAsStudent()
    sendStepProgress.mockClear()

    await act(async () => {
      socketHandlers.onStepProgress?.({ ...правка(null), senderRole: 'STUDENT', senderUserId: 11 })
    })

    expect(sendStepProgress).not.toHaveBeenCalled()
  })
})
