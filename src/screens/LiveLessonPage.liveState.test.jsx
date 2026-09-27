// @vitest-environment jsdom
//
// Экран урока живёт по состоянию занятия, которое хранит сервер (спека
// live-lesson-server-state): снимок при подключении сокета и рассылка канала
// state. Тест играет роль бэкенда: отдаёт снимок (getLiveState) и шлёт
// состояния через обработчики сокета.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import * as api from '../api.js'
import { LOAD_SETTLE_MS } from './live/SectionMaterialFrame.jsx'

const NOW = 1790000000000
let socketHandlers = {}
let snapshot = null
// Жив ли сокет урока — хук сокета подменён, и связь тест держит сам.
let socketConnected = true
const sendCatchUp = vi.fn()
const sendRelease = vi.fn()
const sendPresent = vi.fn()
const sendStage = vi.fn()

// Два раздела по файлу-уроку. Занятие FILE-движка — материал открывается
// рамкой (SectionMaterialFrame), а не шагами разбора.
const SECTIONS = [
  { id: 3, title: 'Разминка', materials: [{ materialId: 11, title: 'A0 · Урок 05', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L05.html' }] },
  { id: 4, title: 'Практика', materials: [{ materialId: 12, title: 'A0 · Урок 06', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L06.html' }] },
]
// Во «Разминке» второй материал — между ними переключают вкладками.
const TWO_MATERIALS = [
  { ...SECTIONS[0], materials: [...SECTIONS[0].materials, { materialId: 13, title: 'A0 · Урок 05b', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L05b.html' }] },
  SECTIONS[1],
]
// Раздел, прикреплённый уже после входа ученика, — его нет в первом списке.
const LATE_SECTION = { id: 5, title: 'Новый', materials: [{ materialId: 15, title: 'A0 · Урок 07', materialType: 'LINK', fileUrl: 'https://files/course-catalog/a0/L07.html' }] }
let sections = SECTIONS
// Материалы, которые открываются шагами разбора (урок каталога), — по адресу
// файла. null — у всех материалов файл, как у FILE-занятия.
let catalogByUrl = null
const STUDENT = { studentId: 7, studentName: 'Ученик', status: 'SCHEDULED' }
// Состав занятия; групповые тесты добавляют второго ученика.
let participants = [STUDENT]

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
    participants,
  })),
  getLiveState: vi.fn(async () => snapshot),
  getLessonSections: vi.fn(async () => sections),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  getLessonViewStages: vi.fn(async () => []),
  // Как у настоящего адреса: в нём страница следования (follow), перезагрузка
  // (_r) и ученик, чей экран смотрит преподаватель (studentId).
  lessonMaterialRenderUrl: (lessonId, materialId, token, { follow, forceReload, studentId } = {}) =>
    `http://api.test/student/lessons/${lessonId}/materials/${materialId}/render?follow=${follow ? 1 : 0}&_r=${forceReload ?? 0}${studentId != null ? `&studentId=${studentId}` : ''}`,
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
    connected: socketConnected,
    sendFocus: vi.fn(),
    sendMirror: vi.fn(),
    sendPresent,
    sendRelease,
    sendCatchUp,
    sendStage,
    sendStepProgress: vi.fn(),
    sendAudio: vi.fn(),
    sendCall: vi.fn(),
    sendWatch: vi.fn(),
    ...((socketHandlers = opts || {}), {}),
  }),
}))

vi.mock('./live/catalogLessonByUrl.js', () => ({
  shouldResolveCatalogLesson: (url) => Boolean(catalogByUrl?.[url]),
  catalogLessonIdFor: async (url) => url,
  isStandaloneLessonUrl: () => false,
}))
vi.mock('./workspace/loadCatalogLesson.js', () => ({
  loadCatalogLesson: async (id) => catalogByUrl?.[id] ?? null,
}))

// Шаг разбора на экране — по его id.
vi.mock('./workspace/LessonContent.jsx', () => ({
  default: ({ step }) => <div data-testid="content">{step?.id}</div>,
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

async function renderAs(role, id) {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  const view = render(
    <I18nProvider>
      <LiveLessonPage lessonId={14} token={tokenFor(role, id)} userName="Тест" onBack={() => {}} />
    </I18nProvider>
  )
  await flush()
  return view
}

/** Ученик (id 7) на занятии 14. */
const renderAsStudent = () => renderAs('STUDENT', 7)
/** Преподаватель (id 6) того же занятия — в jts-web-app у него свой экран урока. */
const renderAsTeacher = () => renderAs('TEACHER', 6)

/** Какой материал открыт в рамке. */
function frameMaterial(container) {
  const src = container.querySelector('iframe.lw-material-iframe')?.getAttribute('src') || ''
  return Number(src.match(/materials\/(\d+)\//)?.[1] ?? NaN)
}

/** Рамка на экране (или null — её нет: доска, шаги разбора). */
const frameOf = (container) => container.querySelector('iframe.lw-material-iframe')

/** Рамка загрузилась и осела — теперь ей можно писать. */
async function loadFrame(container) {
  const iframe = container.querySelector('iframe.lw-material-iframe')
  const post = vi.spyOn(iframe.contentWindow, 'postMessage')
  await act(async () => { iframe.dispatchEvent(new Event('load')) })
  await act(async () => { vi.advanceTimersByTime(LOAD_SETTLE_MS) })
  return post
}

const gotoStage = (index) => [{ source: 'jts-workspace', type: 'goto-stage', index }, '*']

/** Класс ведут на разделе/материале — такое состояние шлёт сервер после «Внимания». */
const leadingAt = (sectionId, materialId, patch = {}) =>
  liveState({ leading: true, focusSeq: 1, sectionId, materialId, ...patch })

async function push(state) {
  await act(async () => { socketHandlers.onState(state) })
  await flush()
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
  sections = SECTIONS
  catalogByUrl = null
  participants = [STUDENT]
  socketHandlers = {}
  socketConnected = true
  sendCatchUp.mockReset()
  sendRelease.mockClear()
  sendPresent.mockClear()
  sendStage.mockClear()
  api.getLessonById.mockClear()
  api.getLessonSections.mockClear()
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

describe('LiveLessonPage — ученик входит в занятие', () => {
  // Решение владельца §2 п.4: вошедший идёт к классу, если преподаватель ведёт.
  it('при ведении открывается раздел и материал класса', async () => {
    const { container } = await renderAsStudent()
    expect(frameMaterial(container)).toBe(11)

    await connectWith(leadingAt(4, 12))

    expect(frameMaterial(container)).toBe(12)
  })

  // Не ведёт — открывается как сейчас, никуда не тянет (приёмка §11 п.2).
  it('без ведения остаётся на своём разделе', async () => {
    const { container } = await renderAsStudent()

    await connectWith(liveState({ leading: false, focusSeq: 4, sectionId: 4, materialId: 12 }))

    expect(frameMaterial(container)).toBe(11)
  })

  // Раздел удалили посреди занятия: ученик перечитывает разделы и, не найдя
  // его, остаётся на месте, а не проваливается в пустоту (спека §9).
  it('раздел класса удалён — перечитывает разделы и остаётся на месте', async () => {
    const { container } = await renderAsStudent()
    api.getLessonSections.mockClear()

    await connectWith(leadingAt(99, 990))

    expect(api.getLessonSections).toHaveBeenCalledTimes(1)
    expect(frameMaterial(container)).toBe(11)
  })
})

describe('LiveLessonPage — ученик следует за классом', () => {
  // Приёмка §11 п.3: ушёл сам — стадия не тянет; «Внимание» — тянет.
  it('ушёл сам — стадия не тянет, указка тянет', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 1 }))

    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))
    await flush()
    expect(frameMaterial(container)).toBe(12)
    const post = await loadFrame(container)

    await push(leadingAt(3, 11, { version: 2, stageIndex: 2 }))
    expect(frameMaterial(container)).toBe(12)
    expect(post).not.toHaveBeenCalledWith(...gotoStage(2))

    await push(leadingAt(3, 11, { version: 3, focusSeq: 2, stageIndex: 2 }))
    expect(frameMaterial(container)).toBe(11)
  })

  // Приёмка §11 п.1: ученик перезагрузился посреди стадии 3 — рамка переходит
  // на неё сама, как только загрузится.
  it('стадия класса уходит в рамку после её загрузки', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 3 }))

    const post = await loadFrame(container)
    expect(post).toHaveBeenCalledWith(...gotoStage(3))
  })

  it('следующему смена стадии уходит в уже открытую рамку', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 3 }))
    const post = await loadFrame(container)
    post.mockClear()

    await push(leadingAt(3, 11, { version: 2, stageIndex: 4 }))

    expect(post).toHaveBeenCalledWith(...gotoStage(4))
  })

  // Переключатель «Идти за преподавателем» — явный «ушёл сам»: выключенный,
  // он не даёт стадии класса двигать рамку ученика.
  it('выключенный переключатель следования — стадия не тянет', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 3 }))
    const post = await loadFrame(container)
    post.mockClear()

    fireEvent.click(container.querySelector('.ls-follow'))
    await push(leadingAt(3, 11, { version: 2, stageIndex: 4 }))

    expect(post).not.toHaveBeenCalledWith(...gotoStage(4))
  })

  // Включил следование обратно, пока класс ведут, — сразу к классу, а не со
  // следующей сменой позиции.
  it('включённый переключатель при ведении — сразу к классу', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(4, 12))
    const toggle = container.querySelector('.ls-follow')

    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Разминка' }))
    await flush()
    expect(frameMaterial(container)).toBe(11)

    fireEvent.click(toggle)
    await flush()
    expect(frameMaterial(container)).toBe(12)
  })

  it('включённый переключатель без ведения — остаётся на месте', async () => {
    const { container } = await renderAsStudent()
    await connectWith(liveState({ focusSeq: 1, sectionId: 4, materialId: 12 }))
    const toggle = container.querySelector('.ls-follow')

    fireEvent.click(toggle)
    fireEvent.click(toggle)
    await flush()

    expect(frameMaterial(container)).toBe(11)
  })

  it('ведение снято — ученик остаётся, стадия больше не тянет', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(4, 12, { stageIndex: 3 }))
    const post = await loadFrame(container)
    post.mockClear()

    await push(liveState({ version: 2, focusSeq: 1, sectionId: 4, materialId: 12, stageIndex: 3 }))
    await push(liveState({ version: 3, focusSeq: 1, sectionId: 4, materialId: 12, stageIndex: 5 }))

    expect(frameMaterial(container)).toBe(12)
    expect(post).not.toHaveBeenCalledWith(...gotoStage(5))
  })
})

describe('LiveLessonPage — статус занятия из состояния', () => {
  const badge = (container) => container.querySelector('.live-badge').textContent

  // Приёмка §11 п.5: пауза видна сразу, без опроса.
  it('пауза приходит состоянием, конец паузы — без действий преподавателя', async () => {
    const { container } = await renderAsStudent()
    expect(badge(container)).toBe('Идёт')

    await push(liveState({ status: 'PAUSED', pausedUntilMs: NOW + 60_000 }))
    expect(badge(container)).toBe('На паузе')

    await act(async () => { vi.advanceTimersByTime(59_000) })
    expect(badge(container)).toBe('На паузе')

    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(badge(container)).toBe('Идёт')
  })

  // Часы ученика отстают от сервера на 30 с: конец паузы считается по серверу.
  it('конец паузы — по часам сервера', async () => {
    const { container } = await renderAsStudent()

    await push(liveState({ status: 'PAUSED', pausedUntilMs: NOW + 60_000, serverNowMs: NOW + 30_000 }))
    await act(async () => { vi.advanceTimersByTime(30_000) })

    expect(badge(container)).toBe('Идёт')
  })

  it('завершение приходит состоянием', async () => {
    await renderAsStudent()

    await push(liveState({ status: 'COMPLETED' }))

    expect(screen.getByText(/^Урок завершён/)).toBeTruthy()
  })

  // Пока сокет жив, статус — из состояния; опрос шапки его не перебивает. Сокет
  // лёг — состояние больше не обновится, и последнее слово за опросом: иначе
  // завершённый за время обрыва урок так и висел бы идущим.
  it('сокет разорван — статус из опроса шапки', async () => {
    const { container } = await renderAsStudent()
    await connectWith(liveState())
    const lesson = await api.getLessonById.mock.results[0].value
    api.getLessonById
      .mockResolvedValueOnce({ ...lesson, status: 'PAUSED' })
      .mockResolvedValueOnce({ ...lesson, status: 'COMPLETED' })

    await act(async () => { vi.advanceTimersByTime(30_000) })
    await flush()
    expect(badge(container)).toBe('Идёт')

    socketConnected = false
    await act(async () => { vi.advanceTimersByTime(30_000) })
    await flush()
    expect(badge(container)).toBe('Завершён')
  })
})

describe('LiveLessonPage — опрос шапки занятия', () => {
  // Статус приходит сокетом, шапке (ссылка на звонок, тема, состав) хватает
  // опроса раз в 30 с (решение владельца §2 п.6).
  it('раз в 30 секунд, а не в 5', async () => {
    await renderAsStudent()
    expect(api.getLessonById).toHaveBeenCalledTimes(1)

    await act(async () => { vi.advanceTimersByTime(29_000) })
    expect(api.getLessonById).toHaveBeenCalledTimes(1)

    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(api.getLessonById).toHaveBeenCalledTimes(2)
  })
})

describe('LiveLessonPage — ученик догоняет показ', () => {
  // Точную позицию внутри рамки (прокрутка, открытые карточки) сервер не
  // хранит (§10): её отдаёт снимок рамки преподавателя — адресно.
  it('вход при ведении на рамке класса — просит снимок', async () => {
    await renderAsStudent()

    await connectWith(leadingAt(4, 12))

    expect(sendCatchUp).toHaveBeenCalledTimes(1)
    expect(sendCatchUp).toHaveBeenCalledWith(12)
  })

  // Класс у доски: рамки класса на экране нет, и снимок её потока лёг бы в
  // буфер показа без адресата.
  it('класс у доски — не просит', async () => {
    await renderAsStudent()

    await connectWith(leadingAt(3, 11, { focusView: 'BOARD' }))

    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  // Пока ученик не следовал, поток показа шёл мимо него: вернувшись к классу
  // переключателем, он догоняет так же, как на входе.
  it('включил следование при ведении — после перехода просит снимок', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(4, 12))
    const toggle = container.querySelector('.ls-follow')
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Разминка' }))
    await flush()
    sendCatchUp.mockClear()

    fireEvent.click(toggle)
    await flush()

    expect(frameMaterial(container)).toBe(12)
    expect(sendCatchUp).toHaveBeenCalledTimes(1)
    expect(sendCatchUp).toHaveBeenCalledWith(12)
  })

  it('включил следование, когда класс у доски, — не просит', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { focusView: 'BOARD' }))
    const toggle = container.querySelector('.ls-follow')

    fireEvent.click(toggle)
    fireEvent.click(toggle)
    await flush()

    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  it('без ведения не просит', async () => {
    await renderAsStudent()

    await connectWith(liveState({ focusSeq: 3, sectionId: 3, materialId: 11 }))

    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  // За время обрыва ученик мог пропустить часть показа.
  it('после переподключения просит снова', async () => {
    await renderAsStudent()
    await connectWith(leadingAt(3, 11))

    await connectWith(leadingAt(3, 11))

    expect(sendCatchUp).toHaveBeenCalledTimes(2)
  })

  it('ушёл на другой материал — не просит', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))
    await flush()
    expect(frameMaterial(container)).toBe(12)
    sendCatchUp.mockClear()

    await connectWith(leadingAt(3, 11))
    await connectWith(leadingAt(3, 11, { version: 2, stageIndex: 1 }))

    expect(frameMaterial(container)).toBe(12)
    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  // Мост проигрывает снимок как поток кликов: на странице, где действия уже
  // применены, они повторились бы. Поэтому просьба уходит только с чистой
  // страницы следования, а ответ ждёт её загрузки.
  it('после переподключения на том же материале рамка перезагружается чистой, и только потом уходит просьба', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    const oldFrame = frameOf(container)
    const oldPost = await loadFrame(container)
    let frameAtRequest = null
    sendCatchUp.mockClear()
    sendCatchUp.mockImplementation(() => { frameAtRequest = frameOf(container) })

    await connectWith(leadingAt(3, 11))

    expect(sendCatchUp).toHaveBeenCalledTimes(1)
    expect(sendCatchUp).toHaveBeenCalledWith(11)
    expect(frameAtRequest).not.toBe(oldFrame)
    expect(frameAtRequest.getAttribute('src')).toContain('follow=1')

    const events = [{ selector: '#a', eventType: 'click', value: null }]
    await act(async () => { socketHandlers.onPresent({ materialId: 11, events }) })
    expect(oldPost).not.toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')
    const post = await loadFrame(container)
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'present', events }, '*')
  })

  // Снимок рамки преподавателя несёт весь поток до просьбы: живые события,
  // накопленные, пока рамки класса у ученика не было, проигрались бы поверх
  // него второй раз. Пришедшие после просьбы не трогаются.
  it('гасит долг — накопленные до просьбы живые события не проигрываются поверх снимка', async () => {
    const { container } = await renderAsStudent()
    const click = (selector) => [{ selector, eventType: 'click', value: null }]
    await act(async () => { socketHandlers.onPresent({ materialId: 12, events: click('#before') }) })

    await connectWith(leadingAt(4, 12))
    expect(sendCatchUp).toHaveBeenCalledWith(12)
    await act(async () => { socketHandlers.onPresent({ materialId: 12, events: click('#snapshot') }) })
    await act(async () => { socketHandlers.onPresent({ materialId: 12, events: click('#after') }) })
    const post = await loadFrame(container)
    await act(async () => { vi.advanceTimersByTime(1_000) })

    const replayed = post.mock.calls
      .filter(([m]) => m.type === 'present')
      .flatMap(([m]) => m.events.map((e) => e.selector))
    expect(replayed).toEqual(['#snapshot', '#after'])
  })

  // На доске рамки нет: погасить долг нечем. Он ждёт вкладки урока, где рамка
  // монтируется заново — чистой.
  it('на доске не просит — просит, вернувшись к уроку', async () => {
    await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    fireEvent.click(screen.getByRole('button', { name: 'Доска' }))
    await flush()
    sendCatchUp.mockClear()

    await connectWith(leadingAt(3, 11))
    expect(sendCatchUp).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Урок' }))
    await flush()
    expect(sendCatchUp).toHaveBeenCalledTimes(1)
    expect(sendCatchUp).toHaveBeenCalledWith(11)
  })

  // Явная указка сама перезагружает рамку, а преподаватель раздаёт её снимок
  // всему классу — второй, адресный, повторил бы тот же поток.
  it('явная указка снимает долг', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    fireEvent.click(screen.getByRole('button', { name: 'Доска' }))
    await flush()
    sendCatchUp.mockClear()
    await connectWith(leadingAt(3, 11))

    await push(leadingAt(3, 11, { version: 2, focusSeq: 2 }))

    expect(frameMaterial(container)).toBe(11)
    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  // Ушёл сам — снимка не получает вовсе: ни сразу, ни когда сам вернулся на
  // материал класса.
  it('ушёл сам — просьба не уходит, даже когда сам вернулся на материал класса', async () => {
    sections = TWO_MATERIALS
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    fireEvent.click(screen.getByRole('button', { name: 'A0 · Урок 05b' }))
    await flush()
    sendCatchUp.mockClear()

    await connectWith(leadingAt(3, 11))
    fireEvent.click(screen.getByRole('button', { name: 'A0 · Урок 05' }))
    await flush()

    expect(frameMaterial(container)).toBe(11)
    expect(sendCatchUp).not.toHaveBeenCalled()
  })

  it('выключил следование — после переподключения не просит', async () => {
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11))
    fireEvent.click(container.querySelector('.ls-follow'))
    sendCatchUp.mockClear()

    await connectWith(leadingAt(3, 11))

    expect(sendCatchUp).not.toHaveBeenCalled()
  })
})

describe('LiveLessonPage — преподаватель', () => {
  const presentEvent = { source: 'jts-bridge', type: 'present-event', selector: '#a', eventType: 'click' }
  const bridge = (data) => act(async () => { window.dispatchEvent(new MessageEvent('message', { data })) })

  // Приёмка §11 п.7: после F5 «ведёт класс» и раздел на месте — действия в
  // рамке снова уходят классу.
  it('после перезагрузки ведение и раздел класса восстанавливаются', async () => {
    const { container } = await renderAsTeacher()
    await bridge(presentEvent)
    expect(sendPresent).not.toHaveBeenCalled()

    await connectWith(leadingAt(4, 12))
    expect(frameMaterial(container)).toBe(12)

    await bridge(presentEvent)
    expect(sendPresent).toHaveBeenCalledWith(12, [{ selector: '#a', eventType: 'click', value: null }])
  })

  // Вторая вкладка (или админка) отпустила класс — эта перестаёт транслировать.
  it('ведение снято в другой вкладке — трансляция гаснет', async () => {
    await renderAsTeacher()
    await connectWith(leadingAt(3, 11))

    await push(liveState({ version: 2, focusSeq: 1, sectionId: 3, materialId: 11 }))
    await bridge(presentEvent)

    expect(sendPresent).not.toHaveBeenCalled()
  })

  // Другая вкладка (или админка) повела класс — эта тоже ведёт.
  it('ведение включено в другой вкладке — трансляция загорается', async () => {
    await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))

    await push(leadingAt(3, 11, { version: 2, focusSeq: 2 }))
    await bridge(presentEvent)

    expect(sendPresent).toHaveBeenCalledWith(11, [{ selector: '#a', eventType: 'click', value: null }])
  })

  // Состояние с прежним leading (таймер, стадия) — не переход: ведение, только
  // что включённое «Вниманием», оно гасить не должно, пока сервер не ответил.
  it('состояние с тем же leading не гасит только что включённое ведение', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))

    fireEvent.click(container.querySelector('.lw-focus-btn'))
    await push(liveState({ version: 2, focusSeq: 1, sectionId: 3, materialId: 11, timer: { endsAtMs: NOW + 60_000, durationSeconds: 60 } }))
    await bridge(presentEvent)

    expect(sendPresent).toHaveBeenCalledWith(11, [{ selector: '#a', eventType: 'click', value: null }])
  })

  // Ушёл с раздела — перестал вести: сервер должен об этом узнать, иначе
  // вошедший ученик шёл бы к позиции, от которой преподаватель ушёл.
  it('переход на другой раздел при ведении отпускает класс', async () => {
    await renderAsTeacher()
    await connectWith(leadingAt(3, 11))

    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))

    expect(sendRelease).toHaveBeenCalledTimes(1)
  })

  it('без ведения переход на раздел ничего не шлёт', async () => {
    await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))

    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))

    expect(sendRelease).not.toHaveBeenCalled()
  })

  // Стадию своей рамки ведущий преподаватель сообщает серверу — за ней идут
  // следующие ученики (приёмка §11 п.1 для урока, который ведут отсюда).
  const frameStage = (index) => act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'jts-lesson', type: 'stage', index, total: 7 } }))
  })

  it('стадия своей рамки уходит серверу, пока ведёт на материале класса', async () => {
    await renderAsTeacher()
    await connectWith(leadingAt(3, 11))
    await frameStage(0)

    await frameStage(2)

    expect(sendStage).toHaveBeenCalledWith(11, 2)
  })

  // Мост сам сообщает, на какой стадии открылась страница. После F5 ведущего
  // (ведение восстановлено раньше, чем рамка загрузилась) это стадия 0, и в
  // состоянии она увела бы весь класс назад.
  it('после загрузки рамки первая стадия серверу не уходит, следующая уходит', async () => {
    await renderAsTeacher()
    await connectWith(leadingAt(3, 11, { stageIndex: 3 }))

    await frameStage(0)
    expect(sendStage).not.toHaveBeenCalled()

    await frameStage(4)
    expect(sendStage).toHaveBeenCalledTimes(1)
    expect(sendStage).toHaveBeenCalledWith(11, 4)
  })

  // «Внимание» перезагружает рамку ведущего — новая страница снова открывается
  // на стадии 0, и это не переход класса.
  it('«Внимание» перезагружает рамку — её стадия открытия серверу не уходит', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(leadingAt(3, 11, { stageIndex: 3 }))
    await frameStage(0)
    await frameStage(3)
    sendStage.mockClear()

    fireEvent.click(container.querySelector('.lw-focus-btn'))
    await flush()
    await frameStage(0)

    expect(sendStage).not.toHaveBeenCalled()
  })

  // «Смотреть экран» другого ученика открывает в рамке его страницу, и она тоже
  // сообщает стадию, на которой открылась. Прими её за переход — весь класс
  // уехал бы на стадию 0.
  it('ведёт и сменил ученика для просмотра — стадия открытия серверу не уходит', async () => {
    participants = [STUDENT, { studentId: 8, studentName: 'Второй', status: 'SCHEDULED' }]
    const { container } = await renderAsTeacher()
    await connectWith(leadingAt(3, 11))
    await frameStage(0)
    await frameStage(2)
    sendStage.mockClear()

    fireEvent.click(screen.getByRole('tab', { name: 'Группа' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Смотреть экран' })[1])
    await flush()
    expect(frameOf(container).getAttribute('src')).toContain('studentId=8')
    await frameStage(0)

    expect(sendStage).not.toHaveBeenCalled()
  })

  // «Внимание» перезагружает рамку ведущего — новая страница открывается на
  // стадии 0, а сервер на том же материале стадию класса не сбрасывает: класс
  // стоял бы на одной стадии, ведущий на другой.
  describe('«Внимание» на стадии файлового урока', () => {
    async function focusAtStage(classStage, ownStage) {
      const { container } = await renderAsTeacher()
      await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11, stageIndex: classStage }))
      await frameStage(0)
      await frameStage(ownStage)
      fireEvent.click(container.querySelector('.lw-focus-btn'))
      await flush()
      return container
    }

    it('рамка ведущего возвращается на свою стадию, сервер получает её на эхо указки', async () => {
      const container = await focusAtStage(3, 5)
      const post = vi.spyOn(frameOf(container).contentWindow, 'postMessage')

      await frameStage(0)
      expect(post).toHaveBeenCalledWith(...gotoStage(5))

      await push(leadingAt(3, 11, { version: 2, focusSeq: 2, stageIndex: 3 }))
      expect(sendStage).toHaveBeenCalledTimes(1)
      expect(sendStage).toHaveBeenCalledWith(11, 5)
    })

    it('класс уже на той же стадии — на эхо серверу ничего не уходит', async () => {
      await focusAtStage(5, 5)

      await push(leadingAt(3, 11, { version: 2, focusSeq: 2, stageIndex: 5 }))

      expect(sendStage).not.toHaveBeenCalled()
    })
  })

  it('без ведения стадия не уходит', async () => {
    await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))
    await frameStage(0)

    await frameStage(2)

    expect(sendStage).not.toHaveBeenCalled()
  })

  // Класс повели на другой материал из другой вкладки: рамка этой вкладки
  // говорит о своём материале, а не о том, что видит класс.
  it('рамка на другом материале, чем у класса, — стадия не уходит', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))
    await push(leadingAt(4, 12, { version: 2, focusSeq: 2 }))
    expect(frameMaterial(container)).toBe(11)
    await frameStage(0)

    await frameStage(2)

    expect(sendStage).not.toHaveBeenCalled()
  })

  // Ученик вошёл посреди показа: снимок рамки уходит ему одному, а не классу —
  // остальные этот поток уже видели.
  it('на просьбу догнать класс отвечает снимком рамки адресно', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(leadingAt(3, 11))
    const post = await loadFrame(container)

    await act(async () => { socketHandlers.onCatchUp({ studentId: 7, materialId: 11 }) })
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'request-snapshot' }, '*')

    const events = [{ selector: '#a', eventType: 'click', value: null }]
    await bridge({ source: 'jts-bridge', type: 'snapshot', events })

    expect(sendPresent).toHaveBeenCalledTimes(1)
    expect(sendPresent).toHaveBeenCalledWith(11, events, 7)
  })

  // Переподключение в цикле не должно гонять весь поток рамки чаще раза в 3 с.
  it('повторная просьба того же ученика раньше 3 с — без ответа', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(leadingAt(3, 11))
    const post = await loadFrame(container)
    const requests = () => post.mock.calls.filter(([m]) => m.type === 'request-snapshot').length

    await act(async () => { socketHandlers.onCatchUp({ studentId: 7, materialId: 11 }) })
    await bridge({ source: 'jts-bridge', type: 'snapshot', events: [] })
    await act(async () => { vi.advanceTimersByTime(2_000) })
    await act(async () => { socketHandlers.onCatchUp({ studentId: 7, materialId: 11 }) })
    expect(requests()).toBe(1)

    await act(async () => { vi.advanceTimersByTime(1_000) })
    await act(async () => { socketHandlers.onCatchUp({ studentId: 7, materialId: 11 }) })
    expect(requests()).toBe(2)
  })

  // «Внимание» перезагружает рамку преподавателя и раздаёт её поток всему
  // классу — как и раньше.
  it('«Внимание»: снимок рамки уходит всему классу', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))

    fireEvent.click(container.querySelector('.lw-focus-btn'))
    await flush()
    const post = await loadFrame(container)
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(post).toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'request-snapshot' }, '*')

    const events = [{ selector: '#a', eventType: 'click', value: null }]
    await bridge({ source: 'jts-bridge', type: 'snapshot', events })
    expect(sendPresent).toHaveBeenCalledWith(11, events)
  })

  // Ведение, восстановленное из состояния (F5, вторая вкладка), рамку классу не
  // пересылает: класс уже стоит на этой позиции, и повторный поток прошёл бы
  // по его рамкам второй раз.
  it('восстановленное ведение снимок рамки классу не рассылает', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(leadingAt(3, 11))
    const post = await loadFrame(container)

    await act(async () => { vi.advanceTimersByTime(5_000) })

    expect(post).not.toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'request-snapshot' }, '*')
  })

  it('просьба про другой материал или без ведения — без ответа', async () => {
    const { container } = await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))
    const post = await loadFrame(container)

    await act(async () => { socketHandlers.onCatchUp({ studentId: 7, materialId: 11 }) })
    await push(leadingAt(3, 11, { version: 2, focusSeq: 2 }))
    await act(async () => { socketHandlers.onCatchUp({ studentId: 8, materialId: 12 }) })

    expect(post).not.toHaveBeenCalledWith({ source: 'jts-bridge-host', type: 'request-snapshot' }, '*')
  })

  // Очередь ответов (спека §4.3): в полёте один запрос, ответ — ждущим; ответ,
  // которого никто не ждёт, выбрасывается, а не уходит всему классу.
  describe('очередь ответов на снимок', () => {
    const events = [{ selector: '#a', eventType: 'click', value: null }]
    const snapshotFromFrame = () => bridge({ source: 'jts-bridge', type: 'snapshot', events })
    const askCatchUp = (studentId, materialId = 11) =>
      act(async () => { socketHandlers.onCatchUp({ studentId, materialId }) })
    const requestsIn = (post) => post.mock.calls.filter(([m]) => m.type === 'request-snapshot').length

    it('два ответа рамки подряд — второй никому', async () => {
      const { container } = await renderAsTeacher()
      await connectWith(leadingAt(3, 11))
      await loadFrame(container)
      await askCatchUp(7)

      await snapshotFromFrame()
      await snapshotFromFrame()

      expect(sendPresent).toHaveBeenCalledTimes(1)
      expect(sendPresent).toHaveBeenCalledWith(11, events, 7)
    })

    it('ничейный ответ рамки выбрасывается', async () => {
      const { container } = await renderAsTeacher()
      await connectWith(leadingAt(3, 11))
      await loadFrame(container)

      await snapshotFromFrame()

      expect(sendPresent).not.toHaveBeenCalled()
    })

    // Ответ рамки потерялся (она грузилась) — без истечения очередь молчала бы
    // до конца урока.
    it('ответ потерян — через 5 с очередь снова спрашивает рамку, ответ всем ждущим', async () => {
      const { container } = await renderAsTeacher()
      await connectWith(leadingAt(3, 11))
      const post = await loadFrame(container)

      await askCatchUp(7)
      await act(async () => { vi.advanceTimersByTime(4_000) })
      await askCatchUp(8)
      expect(requestsIn(post)).toBe(1)

      await act(async () => { vi.advanceTimersByTime(1_000) })
      await askCatchUp(9)
      expect(requestsIn(post)).toBe(2)

      await snapshotFromFrame()
      expect(sendPresent.mock.calls).toEqual([[11, events, 7], [11, events, 8], [11, events, 9]])
    })

    // Потерянный ответ «Внимания» не должен навсегда глушить просьбы учеников.
    it('«Внимание» без ответа — через 5 с просьба ученика обслуживается адресно', async () => {
      const { container } = await renderAsTeacher()
      await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))
      fireEvent.click(container.querySelector('.lw-focus-btn'))
      await flush()
      const post = await loadFrame(container)
      await act(async () => { vi.advanceTimersByTime(500) })
      expect(requestsIn(post)).toBe(1)

      await act(async () => { vi.advanceTimersByTime(5_000) })
      await askCatchUp(7)
      expect(requestsIn(post)).toBe(2)

      await snapshotFromFrame()
      expect(sendPresent.mock.calls).toEqual([[11, events, 7]])
    })

    // Ответ новой страницы другого материала ждавшему про старый не нужен.
    it('смена материала — ждущие сброшены', async () => {
      sections = TWO_MATERIALS
      const { container } = await renderAsTeacher()
      await connectWith(leadingAt(3, 11))
      await loadFrame(container)
      await askCatchUp(7)

      fireEvent.click(screen.getByRole('button', { name: 'A0 · Урок 05b' }))
      await flush()
      expect(frameMaterial(container)).toBe(13)
      await snapshotFromFrame()

      expect(sendPresent).not.toHaveBeenCalled()
    })

    it('класс отпустили — ждущие сброшены', async () => {
      const { container } = await renderAsTeacher()
      await connectWith(leadingAt(3, 11))
      await loadFrame(container)
      await askCatchUp(7)

      await push(liveState({ version: 2, focusSeq: 1, sectionId: 3, materialId: 11 }))
      await push(leadingAt(3, 11, { version: 3, focusSeq: 2 }))
      await snapshotFromFrame()

      expect(sendPresent).not.toHaveBeenCalled()
    })
  })
})

// Ручной уход (спека §4.3): другой раздел или другой материал раздела. Он
// снимает следование и отменяет переходы с классом, которые ещё ждут.
describe('LiveLessonPage — ученик уходит сам', () => {
  it('выбрал другой материал раздела — своя страница, стадия класса не тянет', async () => {
    sections = TWO_MATERIALS
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 1 }))

    fireEvent.click(screen.getByRole('button', { name: 'A0 · Урок 05b' }))
    await flush()
    expect(frameMaterial(container)).toBe(13)
    expect(frameOf(container).getAttribute('src')).toContain('follow=0')

    await push(leadingAt(3, 11, { version: 2, stageIndex: 2 }))
    expect(frameMaterial(container)).toBe(13)
  })

  // Нажатая своя же вкладка — не выбор другого материала.
  it('нажал вкладку открытого материала — следует дальше', async () => {
    sections = TWO_MATERIALS
    const { container } = await renderAsStudent()
    await connectWith(leadingAt(3, 11, { stageIndex: 1 }))
    fireEvent.click(screen.getByRole('button', { name: 'A0 · Урок 05' }))
    await flush()
    const post = await loadFrame(container)
    post.mockClear()

    await push(leadingAt(3, 11, { version: 2, stageIndex: 2 }))

    expect(post).toHaveBeenCalledWith(...gotoStage(2))
  })

  // Указка на шаг урока каталога, пришедшая, когда материал уже разобран, ждёт
  // следующего разбора. Ушёл сам — она уже не его: иначе выбранный им материал
  // открылся бы на шаге класса, а не там, где ученик стоял.
  it('ушёл сам — ждущая указка на шаг не переезжает на выбранный им материал', async () => {
    const steps = ['s1', 's2', 's3'].map((id) => ({ id, title: id, blocks: [] }))
    catalogByUrl = {
      [SECTIONS[0].materials[0].fileUrl]: { id: 'A', steps },
      [SECTIONS[1].materials[0].fileUrl]: { id: 'B', steps },
    }
    const { container } = await renderAsStudent()
    const shownStep = () => screen.getByTestId('content').textContent
    await connectWith(leadingAt(3, 11, { stepId: 's2' }))
    await push(leadingAt(3, 11, { version: 2, stepId: 's3' }))
    expect(shownStep()).toBe('s3')
    fireEvent.click(container.querySelector('.lw-stepnav__btn--ghost'))
    await flush()
    expect(shownStep()).toBe('s2')

    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))
    await flush()

    expect(frameOf(container)).toBeNull()
    expect(shownStep()).toBe('s2')
  })

  // Раздел класса ещё не знаком — страница перечитывает разделы. Пока ответа
  // нет, ученик ушёл сам: пришедший ответ не должен уводить его обратно.
  it('ушёл сам, пока перечитывались разделы, — класс его не уводит', async () => {
    const { container } = await renderAsStudent()
    let answerSections
    api.getLessonSections.mockImplementationOnce(() => new Promise((resolve) => { answerSections = resolve }))
    await connectWith(leadingAt(5, 15))

    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))
    await flush()
    await act(async () => { answerSections([...SECTIONS, LATE_SECTION]) })
    await flush()

    expect(frameMaterial(container)).toBe(12)
  })

  // Новая указка пришла, пока перечитывались разделы для старой: продолжение
  // старой указки ученика с новой позиции не уводит.
  it('новая указка, пока перечитывались разделы, — старое продолжение не срабатывает', async () => {
    const { container } = await renderAsStudent()
    let answerSections
    api.getLessonSections.mockImplementationOnce(() => new Promise((resolve) => { answerSections = resolve }))
    await connectWith(leadingAt(5, 15))

    await push(leadingAt(4, 12, { version: 2, focusSeq: 2 }))
    expect(frameMaterial(container)).toBe(12)
    await act(async () => { answerSections([...SECTIONS, LATE_SECTION]) })
    await flush()

    expect(frameMaterial(container)).toBe(12)
  })
})
