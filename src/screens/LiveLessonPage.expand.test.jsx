// @vitest-environment jsdom
//
// Урок во весь экран: на телефоне рамка материала занимала полэкрана, и урок
// прокручивался внутри маленького окна (видео владельца 21.10.2026).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

let socketHandlers = {}
let sectionsFixture = []
let stagesFixture = []
const getLessonViewStages = vi.fn(async () => stagesFixture)

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
  getLessonSections: vi.fn(async () => sectionsFixture),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  getLessonViewStages,
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

// Эталон снят с файла A0 · Урок 05 — ровно то, что отдаёт …/lesson-view/stages.
const STAGES = [
  { index: 0, title: 'Warm-up', taskCount: 1 },
  { index: 1, title: 'Vocabulary', taskCount: 2 },
  { index: 2, title: 'Grammar', taskCount: 1 },
  { index: 3, title: 'Practice', taskCount: 5 },
  { index: 4, title: 'Listening', taskCount: 1 },
  { index: 5, title: 'Speaking', taskCount: 1 },
  { index: 6, title: 'Wrap', taskCount: 0 },
]

const MATERIAL = { materialId: 11, title: 'A0 · Урок 05', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L05.html' }

function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

/** Ученик (id 7) на индивидуальном занятии 14 с одним разделом «Материал урока». */
async function renderAsStudent() {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  const view = render(
    <I18nProvider>
      <LiveLessonPage lessonId={14} token={tokenFor('STUDENT', 7)} userName="Ученик" onBack={() => {}} />
    </I18nProvider>
  )
  // Занятие, разделы и стадии доезжают промисами уже после первого рендера.
  await act(async () => {})
  await act(async () => {})
  return view
}


beforeEach(() => {
  sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [MATERIAL] }]
  stagesFixture = STAGES
})

const frameOf = (container) => container.querySelector('.lw-material-frame')
const expandButton = () => screen.queryByRole('button', { name: 'Урок во весь экран' })
const collapseButton = () => screen.queryByRole('button', { name: 'Свернуть урок' })

describe('LiveLessonPage — урок во весь экран', () => {
  // На телефоне рамка урока занимала полэкрана: сверху шапка, панель значков,
  // плашка статуса и вкладки, снизу «Темы / Группа», а прокручивать урок
  // приходилось внутри маленького окна. Кнопка отдаёт уроку весь экран.
  it('разворачивает рамку материала и прячет обвязку страницы', async () => {
    const { container } = await renderAsStudent()
    expect(frameOf(container).classList.contains('is-expanded')).toBe(false)
    expect(expandButton().getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(expandButton())

    expect(frameOf(container).classList.contains('is-expanded')).toBe(true)
    expect(container.querySelector('.lv').classList.contains('is-immersive')).toBe(true)
    expect(collapseButton()).toBeTruthy()
  })

  it('«Свернуть» возвращает обычный вид', async () => {
    const { container } = await renderAsStudent()
    fireEvent.click(expandButton())
    fireEvent.click(collapseButton())

    expect(frameOf(container).classList.contains('is-expanded')).toBe(false)
    expect(container.querySelector('.lv').classList.contains('is-immersive')).toBe(false)
    expect(collapseButton()).toBeNull()
  })

  it('Esc сворачивает урок — с клавиатуры кнопку в углу искать не нужно', async () => {
    const { container } = await renderAsStudent()
    fireEvent.click(expandButton())
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(frameOf(container).classList.contains('is-expanded')).toBe(false)
  })

  // Развёрнутой бывает только рамка: на доске разворачивать нечего, а вернувшись
  // на урок, ученик видит обычный экран, а не внезапно закрытую шапку.
  it('на доске кнопки нет, и по возвращении урок не развёрнут', async () => {
    const { container } = await renderAsStudent()
    fireEvent.click(expandButton())
    fireEvent.click(screen.getByRole('button', { name: 'Доска' }))

    expect(expandButton()).toBeNull()
    expect(container.querySelector('.lv').classList.contains('is-immersive')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Урок' }))
    expect(frameOf(container).classList.contains('is-expanded')).toBe(false)
  })
})
