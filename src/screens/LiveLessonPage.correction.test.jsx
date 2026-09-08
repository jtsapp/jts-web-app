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
import { render, act, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

import * as api from '../api.js'

const sendStepProgress = vi.fn()
let socketHandlers = {}
// Разделы и урок каталога по умолчанию пустые — как было: тестам про адресата
// шаги не нужны вовсе. Ставит их только тест про указку (ниже).
let sectionsFixture = []
let catalogFixture = null
// Последние пропсы LessonContent: сам он здесь заглушка — экран задания в тест
// не нужен, нужны шаг и указка (`liveQuestionId`), которыми он его рисует.
let contentProps = null

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
  getLessonSections: vi.fn(async () => sectionsFixture),
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

vi.mock('./workspace/loadCatalogLesson.js', () => ({ loadCatalogLesson: vi.fn(async () => catalogFixture) }))
// Поиск урока каталога по ссылке ходит в каталог по сети — в тесте отвечаем сразу.
vi.mock('./live/catalogLessonByUrl.js', () => ({
  catalogLessonIdFor: vi.fn(async () => catalogFixture?.id ?? null),
  isStandaloneLessonUrl: () => false,
}))
vi.mock('./workspace/LessonContent.jsx', () => ({
  default: (props) => { contentProps = props; return <div data-testid="content" /> },
  practiceCardStats: () => ({ total: 0, current: 0 }),
}))
vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

/** Токен без userId — так приходят пробные кабинки. */
function tokenBezId(role) {
  const payload = btoa(JSON.stringify({ role, sub: '+77010000000' }))
  return `x.${payload}.y`
}

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

/**
 * Тот же Данияр, но урок уже открыт разобранным на шаги и преподаватель позвал
 * класс на `ex1`. Без «Внимания на упражнение» указки на экране нет вовсе
 * (`liveQuestionId` отдаётся только в followMode), и наблюдать было бы нечего.
 */
async function renderOnStep() {
  sectionsFixture = [
    { id: 1, title: 'Разбор', materials: [{ materialId: 100, title: 'Урок 1', fileUrl: 'https://files/course-catalog/b1/L01.html' }] },
  ]
  catalogFixture = {
    id: 55,
    title: 'Present Perfect',
    level: 'B1',
    steps: [{ id: 'ex1', title: 'Практика' }, { id: 'ex2', title: 'Практика 2' }],
  }
  const view = await renderAsStudent()
  // Разделы и урок каталога доезжают промисами уже после первого рендера.
  await act(async () => {})
  await act(async () => {
    socketHandlers.onFocus?.({
      senderUserId: 7, senderRole: 'TEACHER', sectionId: 1, materialId: 100, stepId: 'ex1', questionId: 'block-0',
    })
  })
  await act(async () => {})
  return view
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
  beforeEach(() => {
    sendStepProgress.mockClear()
    sectionsFixture = []
    catalogFixture = null
    contentProps = null
  })

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

// Указка (`liveQuestionId` у LessonContent) — вторая половина той же правки:
// ответ применял только адресат, а прыгал к вопросу весь класс.
describe('LiveLessonPage — указка на вопрос достаётся адресату, шаг — классу', () => {
  beforeEach(() => {
    sendStepProgress.mockClear()
    sectionsFixture = []
    catalogFixture = null
    contentProps = null
  })

  // Преподаватель поправил Асель на том же шаге: у Данияра не изменилось
  // ничего, а экран уводил указку на её вопрос — «со мной что-то сделали».
  it('чужая правка указку не двигает', async () => {
    await renderOnStep()
    expect(contentProps.liveQuestionId).toBe('block-0')

    await act(async () => { socketHandlers.onStepProgress?.({ ...правка(11), stepId: 'ex1' }) })

    expect(contentProps.liveQuestionId).toBe('block-0')
    expect(contentProps.step.id).toBe('ex1')
  })

  // Шаг преподавателя — поведение класса, и правка соседу его не отменяет:
  // класс переходит вместе с преподавателем, но встаёт на начало шага, а не
  // на чужой вопрос.
  it('за шагом преподавателя класс идёт и с чужой правкой', async () => {
    await renderOnStep()

    await act(async () => { socketHandlers.onStepProgress?.({ ...правка(11), stepId: 'ex2' }) })

    expect(contentProps.step.id).toBe('ex2')
    expect(contentProps.liveQuestionId).toBe('block-0')
  })

  // Обратная сторона: адресату указка нужна — иначе он не поймёт, что именно
  // поправили, и правка останется незамеченной.
  it('свою правку указка показывает', async () => {
    await renderOnStep()

    await act(async () => { socketHandlers.onStepProgress?.({ ...правка(10), stepId: 'ex1' }) })

    expect(contentProps.liveQuestionId).toBe('q1')
  })
})

// Клиент, который не может назвать себя, — отдельный случай: молча терять свою
// правку он не должен, но и хватать чужие тоже. Решает не сам факт анонимности,
// а есть ли кому навредить.
describe('LiveLessonPage — ученик без userId в токене', () => {
  async function renderAnon() {
    const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
    const view = render(
      <I18nProvider>
        <LiveLessonPage lessonId={5} token={tokenBezId('STUDENT')} userName="Гость" onBack={() => {}} />
      </I18nProvider>
    )
    // Ждём загрузки урока: состав класса решает, применять ли правку, а до
    // ответа getLessonById участников нет вовсе и урок читался бы как «один».
    await waitFor(() => expect(api.getLessonById).toHaveBeenCalled())
    await act(async () => {})
    return view
  }

  beforeEach(() => { sendStepProgress.mockClear() })

  // В уроке двое: применить чужую правку значит вернуть исходную поломку —
  // ответ соседа переписывается у всех, кто стоит на том же вопросе.
  it('в групповом уроке чужую правку всё равно не применяет', async () => {
    await renderAnon()
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(11)) })

    expect(sendStepProgress).not.toHaveBeenCalled()
  })

  // Портить некому — применяем: иначе правка пропадает молча, а преподаватель
  // видит свой тост «увидит сразу» и уверен, что дошло.
  it('в уроке один на один правку применяет', async () => {
    api.getLessonById.mockResolvedValueOnce({
      id: 5,
      status: 'IN_PROGRESS',
      lessonType: 'INDIVIDUAL_STANDARD',
      groupName: null,
      topic: 'Present Perfect',
      teacherId: 7,
      teacherName: 'Адильжан Алимжанов',
      meetingUrl: null,
      durationMinutes: 60,
      participants: [{ studentId: 10, studentName: 'Данияр Серіков', status: 'SCHEDULED' }],
    })
    await renderAnon()
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(10)) })

    expect(sendStepProgress).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', value: 'is' })
    )
  })
  // Окно между подключением сокета и ответом getLessonById: состава класса ещё
  // нет, и решать «он один» не по чему.
  it('до загрузки урока чужую правку не применяет', async () => {
    let отдать
    api.getLessonById.mockReturnValueOnce(new Promise((resolve) => { отдать = resolve }))
    const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
    render(
      <I18nProvider>
        <LiveLessonPage lessonId={5} token={tokenBezId('STUDENT')} userName="Гость" onBack={() => {}} />
      </I18nProvider>
    )
    sendStepProgress.mockClear()

    await act(async () => { socketHandlers.onStepProgress?.(правка(11)) })

    // Считать вызовы нельзя: на монтировании экран и так шлёт свою позицию.
    expect(sendStepProgress).not.toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', value: 'is' })
    )
    отдать({ id: 5, status: 'IN_PROGRESS', lessonType: 'INDIVIDUAL_STANDARD', participants: [] })
  })
})
