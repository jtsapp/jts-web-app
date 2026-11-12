// @vitest-environment jsdom
//
// Страница прошлого урока говорит ученику, что сейчас идёт другой урок.
//
// Прод 11.11.2026: на планшете ученицы осталась вкладка урока 09.11
// (?screen=live-lesson&live=52224). Урок открывается по id из адреса, и F5
// возвращает в тот же урок. В 20:52 урок 11.11 уже шёл, а она дважды обновила
// страницу и дважды попала в прошлый урок — «на платформе отражались данные
// прошлого урока».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

let СТАТУС = 'COMPLETED'
let РАСПИСАНИЕ = []

vi.mock('../api.js', () => ({
  getLessonViewStages: vi.fn(async () => []),
  getLessonById: vi.fn(async () => ({
    id: 52224,
    status: СТАТУС,
    lessonType: 'GROUP',
    groupName: null,
    topic: 'Lesson 2',
    teacherId: 189,
    teacherName: 'Преподаватель',
    meetingUrl: null,
    durationMinutes: 60,
    participants: [{ studentId: 3123, studentName: 'Ученица', status: 'ATTENDED' }],
  })),
  getLessonSections: vi.fn(async () => []),
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
  getMyLessonOccurrences: vi.fn(async () => РАСПИСАНИЕ),
}))

vi.mock('./live/useLessonPresence.js', () => ({
  useLessonPresence: () => ({ roster: [], connected: true }),
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

vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

// scheduledAt у занятия — местное время без зоны, как его отдаёт бэкенд.
function localDateTime(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:00`
}

const halfHourAgo = () => localDateTime(new Date(Date.now() - 30 * 60000))
const twoDaysAgo = () => localDateTime(new Date(Date.now() - 2 * 24 * 60 * 60000))

async function renderLesson({ lessonId = 52224, role = 'STUDENT', userId = 3123, onOpenLesson = vi.fn() } = {}) {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  render(
    <I18nProvider>
      <LiveLessonPage lessonId={lessonId} token={tokenFor(role, userId)} userName="Тест" onBack={() => {}} onOpenLesson={onOpenLesson} />
    </I18nProvider>,
  )
  await waitFor(() => expect(screen.getByText('Lesson 2')).toBeTruthy())
  return { onOpenLesson }
}

describe('LiveLessonPage — сейчас идёт другой урок', () => {
  beforeEach(async () => {
    const api = await import('../api.js')
    api.getMyLessonOccurrences.mockClear()
    СТАТУС = 'COMPLETED'
    РАСПИСАНИЕ = [
      { lessonId: 52224, lessonStatus: 'COMPLETED', scheduledAt: twoDaysAgo(), durationMinutes: 60 },
      { lessonId: 52237, lessonStatus: 'IN_PROGRESS', scheduledAt: halfHourAgo(), durationMinutes: 60 },
    ]
  })

  it('на странице прошлого урока ученик видит плашку и переходит в идущий урок', async () => {
    const { onOpenLesson } = await renderLesson()

    const go = await screen.findByRole('button', { name: 'Перейти' })
    expect(screen.getByText(/Сейчас идёт ваш урок/)).toBeTruthy()

    fireEvent.click(go)
    expect(onOpenLesson).toHaveBeenCalledWith(52237)
  })

  it('id урока из адреса строкой — плашка та же', async () => {
    await renderLesson({ lessonId: '52224' })
    expect(await screen.findByRole('button', { name: 'Перейти' })).toBeTruthy()
  })

  it('на самом идущем уроке плашки нет и расписание не спрашивается', async () => {
    СТАТУС = 'IN_PROGRESS'
    const api = await import('../api.js')
    await renderLesson({ lessonId: 52237 })

    await waitFor(() => expect(screen.getByText('Lesson 2')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Перейти' })).toBeNull()
    expect(api.getMyLessonOccurrences).not.toHaveBeenCalled()
  })

  it('когда ни один урок не идёт, плашки нет', async () => {
    РАСПИСАНИЕ = [{ lessonId: 52224, lessonStatus: 'COMPLETED', scheduledAt: twoDaysAgo(), durationMinutes: 60 }]
    const api = await import('../api.js')
    await renderLesson()

    await waitFor(() => expect(api.getMyLessonOccurrences).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Перейти' })).toBeNull()
  })

  it('преподавателю плашка не показывается: у него своё расписание и свои занятия', async () => {
    const api = await import('../api.js')
    await renderLesson({ role: 'TEACHER', userId: 189 })

    expect(screen.queryByRole('button', { name: 'Перейти' })).toBeNull()
    expect(api.getMyLessonOccurrences).not.toHaveBeenCalled()
  })
})
