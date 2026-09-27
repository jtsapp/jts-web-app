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
  getLessonSections: vi.fn(async () => SECTIONS),
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
  socketHandlers = {}
  sendCatchUp.mockClear()
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

    await frameStage(2)

    expect(sendStage).toHaveBeenCalledWith(11, 2)
  })

  it('без ведения стадия не уходит', async () => {
    await renderAsTeacher()
    await connectWith(liveState({ focusSeq: 1, sectionId: 3, materialId: 11 }))

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
})
