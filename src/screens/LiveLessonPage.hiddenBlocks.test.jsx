// @vitest-environment jsdom
//
// Скрытие вживую (задача 8 плана 12).
//
// «Скрыть» преподавателя (PATCH .../visibility) сейчас доезжает до ученика
// только со следующей полной перезагрузкой рамки: CSS вшивается сервером
// только при рендере файла. sections-changed уже приходит на экран (им живёт
// список разделов слева), но до этой задачи из него никуда не уходил вызов
// SectionMaterialFrame.setHiddenKeys — скрытие молчало в уже открытом iframe.
//
// Наблюдаем через postMessage в самой рамке: sections-changed с новым
// hiddenStepIds активного материала обязан долететь до неё сообщением
// { source: 'jts-bridge-host', type: 'hidden-blocks', keys }.
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

describe('LiveLessonPage — скрытие вживую', () => {
  it('sections-changed с новым hiddenStepIds шлёт рамке hidden-blocks', async () => {
    const { container } = await renderAsStudent()
    const iframe = await waitFor(() => {
      const el = container.querySelector('iframe.lw-material-iframe')
      expect(el).toBeTruthy()
      return el
    })
    // setHiddenKeys шлёт немедленно только уже загруженной и осевшей рамке
    // (задача 8, ревью «до onLoad сообщение молча теряется») — сценарий этого
    // теста именно такой: рамка уже открыта и осела, когда прилетает
    // sections-changed. Настоящий таймер settle-осадки (LOAD_SETTLE_MS, см.
    // SectionMaterialFrame.handleLoad) — без фейковых таймеров, чтобы не
    // задевать остальные таймеры этого дерева.
    iframe.dispatchEvent(new Event('load'))
    await new Promise((r) => setTimeout(r, LOAD_SETTLE_MS + 10))
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    // Преподаватель спрятал задание и карточку — тот же материал, новый список.
    sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [materialWithHidden(['t1', 'block@5:0'])] }]
    await act(async () => {
      await socketHandlers.onSectionsChanged?.()
    })

    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['t1', 'block@5:0'] },
      '*'
    )
  })

  it('преподавателю ничего не уходит — он видит материал целиком', async () => {
    sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [materialWithHidden(['t1'])] }]
    const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
    const { container } = render(
      <I18nProvider>
        <LiveLessonPage lessonId={14} token={tokenFor('TEACHER', 6)} userName="Преподаватель" onBack={() => {}} />
      </I18nProvider>
    )
    await act(async () => {})
    await act(async () => {})
    const iframe = await waitFor(() => {
      const el = container.querySelector('iframe.lw-material-iframe')
      expect(el).toBeTruthy()
      return el
    })
    // Спай ставим ДО load, а не после: guard isStaff (LiveLessonPage.jsx) —
    // единственное, что мешает учительской рамке получить hidden-blocks, а у
    // самой рамки очередь до осадки (pendingHiddenKeysRef) разряжается прямо
    // в settle-таймауте onLoad. Спай, поставленный уже ПОСЛЕ load+осадки, эту
    // утечку просто не увидит — ровно так исходный тест был слеп к обеим
    // мутациям (см. ревью всей ветки).
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    iframe.dispatchEvent(new Event('load'))
    await new Promise((r) => setTimeout(r, LOAD_SETTLE_MS + 10))

    sectionsFixture = [{ id: 3, title: 'Материал урока', materials: [materialWithHidden(['t1', 't2'])] }]
    await act(async () => {
      await socketHandlers.onSectionsChanged?.()
    })

    // «Ни разу за всю последовательность» — не только после sections-changed,
    // но и в окне settle-осадки выше, где утекла бы затея до загрузки.
    expect(post).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hidden-blocks' }),
      '*'
    )
  })
})
