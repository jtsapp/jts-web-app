// @vitest-environment jsdom
//
// «Темы» ученика на файловом уроке.
//
// Разбор урока на шаги выключен (LESSON_EXTRACTOR), и список тем справа падал на
// разделы занятия: у занятия с одним материалом это одна строка «Материал
// урока», по которой некуда идти. Преподавателю в админке темы вернули из
// самого файла (стадии `section.stage`, снятые сервером при импорте ключей);
// здесь — то же самое тем же контрактом, см. lessonStages.js.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

let socketHandlers = {}
let sectionsFixture = []
let stagesFixture = []
const getLessonViewStages = vi.fn(async () => stagesFixture)

vi.mock('../api.js', () => ({
  getLessonById: vi.fn(async () => ({
    id: 14,
    status: 'IN_PROGRESS',
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

/** Скрипт в файле сообщил, на какой стадии стоит рамка. */
function frameStage(index, total = STAGES.length) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'jts-lesson', type: 'stage', index, total } }))
  })
}

const rowsOf = (container) => [...container.querySelectorAll('.lv-topics__item')]
const titlesOf = (container) => rowsOf(container).map((row) => row.querySelector('.lv-topics__text').textContent.trim())

beforeEach(() => {
  sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [MATERIAL] }]
  stagesFixture = STAGES
  getLessonViewStages.mockClear()
})

describe('LiveLessonPage — «Темы» ученика на файловом уроке', () => {
  it('темы — стадии файла, а не единственный раздел «Материал урока»', async () => {
    const { container } = await renderAsStudent()
    expect(getLessonViewStages).toHaveBeenCalledWith(tokenFor('STUDENT', 7), 14, 11)
    expect(titlesOf(container)).toEqual(['Warm-up', 'Vocabulary', 'Grammar', 'Practice', 'Listening', 'Speaking', 'Wrap'])
  })

  // Своего состояния у списка нет: где стоит рамка, знает только скрипт в
  // файле, и он говорит об этом сообщением на каждом переходе.
  it('позиция приходит от рамки: текущая стадия подсвечена, предыдущие — пройдены', async () => {
    const { container } = await renderAsStudent()
    await frameStage(3)
    const rows = rowsOf(container)
    expect(rows[3].classList.contains('is-active')).toBe(true)
    expect(rows.slice(0, 3).every((row) => row.classList.contains('is-done'))).toBe(true)
    expect(rows.slice(4).some((row) => row.classList.contains('is-done'))).toBe(false)
  })

  // Переход идёт через рамку, а не через своё состояние: скрипт кликает рельс
  // стадий в файле, и этот же клик зеркалом уходит преподавателю.
  it('клик по стадии шлёт рамке goto-stage', async () => {
    const { container, getByRole } = await renderAsStudent()
    const iframe = container.querySelector('iframe.lw-material-iframe')
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    fireEvent.click(getByRole('button', { name: 'Listening' }))
    expect(post).toHaveBeenCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 4 }, '*')
  })

  // «Внимание на упражнение» без шага ставит метку преподавателя на РАЗДЕЛ
  // (sectionId). Раздел 3 и стадия '3' — разные вещи, и метка «Т» на Practice
  // была бы ложью.
  it('метка преподавателя не путает раздел занятия со стадией файла', async () => {
    const { container } = await renderAsStudent()
    await act(async () => {
      socketHandlers.onFocus?.({ senderUserId: 6, senderRole: 'TEACHER', sectionId: 3, materialId: 11 })
    })
    expect(container.querySelector('.lv-topics__teacher')).toBeNull()
  })

  it('у материала без стадий список остаётся разделами занятия', async () => {
    stagesFixture = []
    const { container } = await renderAsStudent()
    expect(titlesOf(container)).toEqual(['Материал урока'])
  })
})
