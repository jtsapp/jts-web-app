// @vitest-environment jsdom
//
// «Сбросить упражнение» у учителя — на открытом экране ученика (30.10.2026).
//
// Сервер ответы задания забыл, но мост рамки ученика держит весь поток в памяти и сохраняет его
// целиком поверх: первый же ответ ученика, в любом задании, возвращал сброшенное, а на экране
// ответы так и стояли. Учитель шлёт answer-reset с материалом и заданием: экран просит мост забыть
// (forget-task) и после его ответа перечитывает рамку — восстановление покажет задание пустым.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
// Настоящая константа осадки рамки (не мок — SectionMaterialFrame.jsx здесь
// не подменяется), а не отдельное магическое число: разъедутся — тест сам
// укажет на источник правды вместо того, чтобы тихо проверить не то окно.
import { LOAD_SETTLE_MS } from './live/SectionMaterialFrame.jsx'

let socketHandlers = {}
let sectionsFixture = []

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
  // Материал этого теста — файл, не разбор: стадий у него нет.
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

// Подписка на sections-changed в реальном хуке зовёт onSectionsChanged() без
// аргументов (useLessonLiveSocket.js) — socketHandlers.onSectionsChanged здесь
// играет роль этой подписки, дальше отвечает уже loadSections самого экрана.
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

// Материал — файл каталога занятия с движком FILE (per-lesson engine, см.
// lessonExtractor.js), поэтому разбора на шаги нет и он открывается через
// рендер-эндпоинт с мостом — тот самый iframe, которому адресован
// hidden-blocks. hiddenStepIds стартует пустым: ничего не скрыто.
const MATERIAL_ID = 11
function materialWithHidden(hiddenStepIds) {
  return {
    materialId: MATERIAL_ID,
    title: 'A0 · Урок 05',
    materialType: 'LINK',
    fileUrl: 'https://files/course-catalog/a0/L05.html',
    hiddenStepIds,
  }
}

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
  // Занятие и разделы доезжают промисами уже после первого рендера.
  await act(async () => {})
  await act(async () => {})
  return view
}

beforeEach(() => {
  sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [materialWithHidden([])] }]
})

/** Рамка урока открыта, загрузилась и осела — мосту уже можно писать. */
async function openFrame(container) {
  const iframe = await waitFor(() => {
    const el = container.querySelector('iframe.lw-material-iframe')
    expect(el).toBeTruthy()
    return el
  })
  iframe.dispatchEvent(new Event('load'))
  await new Promise((r) => setTimeout(r, LOAD_SETTLE_MS + 10))
  return iframe
}

/** Ответ моста — из окна самой рамки: чужим окнам экран не верит. */
function bridgeAnswers(iframe, tid) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { source: 'jts-bridge', type: 'task-forgotten', tid },
      source: iframe.contentWindow,
    }))
  })
}

describe('LiveLessonPage — сброс задания учителем', () => {
  it('сброс задания открытого материала: мосту forget-task, после ответа рамка перечитывается', async () => {
    const { container } = await renderAsStudent()
    const iframe = await openFrame(container)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    await act(async () => {
      socketHandlers.onAnswerReset?.({ materialId: MATERIAL_ID, tid: 't1', questionIds: [], checkedKeys: [] })
    })
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'forget-task', tid: 't1' }, '*')
    // Пока мост не ответил, рамку не трогаем: перезагрузка раньше времени сохранила бы старый поток.
    expect(container.querySelector('iframe.lw-material-iframe')).toBe(iframe)

    await bridgeAnswers(iframe, 't1')

    await waitFor(() => expect(container.querySelector('iframe.lw-material-iframe')).not.toBe(iframe))
  })

  it('сброс другого материала — открытую рамку не трогает', async () => {
    const { container } = await renderAsStudent()
    const iframe = await openFrame(container)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    await act(async () => {
      socketHandlers.onAnswerReset?.({ materialId: 999, tid: 't1', questionIds: [], checkedKeys: [] })
    })

    expect(post).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'forget-task' }), '*')
    expect(container.querySelector('iframe.lw-material-iframe')).toBe(iframe)
  })

  it('преподаватель сам себе сброс не применяет', async () => {
    const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
    const { container } = render(
      <I18nProvider>
        <LiveLessonPage lessonId={14} token={tokenFor('TEACHER', 6)} userName="Преподаватель" onBack={() => {}} />
      </I18nProvider>
    )
    await act(async () => {})
    await act(async () => {})
    const iframe = await openFrame(container)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    await act(async () => {
      socketHandlers.onAnswerReset?.({ materialId: MATERIAL_ID, tid: 't1', questionIds: [], checkedKeys: [] })
    })

    expect(post).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'forget-task' }), '*')
  })
})
