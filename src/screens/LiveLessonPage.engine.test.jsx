// @vitest-environment jsdom
//
// Движок занятия решает «шаги или файл» (spec-lesson-engine-coexistence §6.2):
// страница передаёт в решение ЗАГРУЖЕННОЕ занятие и не решает ничего, пока его
// нет, — иначе FILE-занятие мигнуло бы шагами. Тот же набор моков, что и у
// LiveLessonPage.open.test.jsx (см. его шапку), но с движком занятия
// параметризуемым тестом и шпионом вместо настоящего shouldResolveCatalogLesson.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

let СТАТУС = 'IN_PROGRESS'
let ДВИЖОК = 'FILE'

// vi.hoisted — фабрика мока поднимается выше импортов, обычная const там ещё не создана.
const { resolveSpy } = vi.hoisted(() => ({ resolveSpy: vi.fn(() => false) }))

vi.mock('../api.js', () => ({
  getLessonViewStages: vi.fn(async () => []),
  getLessonById: vi.fn(async () => ({
    id: 5,
    status: СТАТУС,
    engine: ДВИЖОК,
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

// Шпион вместо настоящей резолюции: этот тест проверяет, ЧТО в неё передаётся
// (url, занятие), а не поведение самого модуля (это catalogLessonByUrl.test.js).
vi.mock('./live/catalogLessonByUrl.js', () => ({
  catalogLessonIdFor: vi.fn(async () => 55),
  isStandaloneLessonUrl: () => false,
  shouldResolveCatalogLesson: (...args) => resolveSpy(...args),
}))

vi.mock('./workspace/loadCatalogLesson.js', () => ({
  loadCatalogLesson: vi.fn(async () => ({ id: 55, steps: [] })),
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

async function renderLesson() {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor('STUDENT', 10)} userName="Тест" onBack={() => {}} />
    </I18nProvider>,
  )
  await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
}

describe('LiveLessonPage — движок занятия', () => {
  beforeEach(() => { СТАТУС = 'IN_PROGRESS'; resolveSpy.mockClear() })

  it('решение принимается по загруженному занятию с его движком', async () => {
    ДВИЖОК = 'FILE'
    await renderLesson()

    await waitFor(() => expect(resolveSpy).toHaveBeenCalled())
    expect(resolveSpy).toHaveBeenCalledWith('https://cdn/lesson-1.html', expect.objectContaining({ engine: 'FILE' }))
    expect(resolveSpy.mock.calls.every(([, lesson]) => lesson != null)).toBe(true)
  })

  it('STEPS-занятие доезжает до решения как STEPS', async () => {
    ДВИЖОК = 'STEPS'
    await renderLesson()

    await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('https://cdn/lesson-1.html', expect.objectContaining({ engine: 'STEPS' })))
  })
})
