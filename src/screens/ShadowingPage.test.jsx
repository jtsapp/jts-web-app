// @vitest-environment jsdom
// Регрессии «кнопка есть, а нажатие ничего не делает» в Shadowing:
//  1. строка «моя запись» показывалась по СЕРВЕРНОЙ отметке о прохождении,
//     хотя blob лежит только в IndexedDB устройства;
//  2. «★ Оценить» у соседних фраз оставалась живой, пока идёт чужой разбор.
//
// Третья правка той же ветки — снятие recTargetRef в catch у startRec —
// закрыта ниже отдельным блоком: он подменяет MediaRecorder падающим на
// start().
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const SEGMENTS = [
  [0, 2, 'Hello there.'],
  [2, 4, 'How are you?'],
]

// Отметки «пройдено» приезжают с сервера через общий синк практики.
const doneIds = new Set()
// Локальные баллы = записи в IndexedDB этого устройства.
let lessonScores = new Map()

// Уроки из админки приезжают с бэкенда; настоящей сети в тесте нет.
const getShadowingLessons = vi.fn(() => new Promise(() => {}))
vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getShadowingLessons: (...a) => getShadowingLessons(...a),
}))

vi.mock('../practice/shadowing/lessonContent.js', () => ({
  loadLessonFile: vi.fn(() => Promise.resolve({ segments: SEGMENTS, source: 'test', level: 'A2' })),
}))
// Blob есть на устройстве ровно тогда, когда у фразы есть локальный балл.
let storedBlobs = new Set()
vi.mock('../practice/shadowing/recordings.js', () => ({
  saveTake: vi.fn(),
  getTakeBlob: vi.fn((segId) => Promise.resolve(storedBlobs.has(segId) ? new Blob(['x']) : null)),
  getLessonScores: vi.fn(() => Promise.resolve(lessonScores)),
}))
vi.mock('../lib/ielts-audio.js', () => ({ blobToWav16kMono: vi.fn(() => Promise.resolve(new Blob(['wav']))) }))
vi.mock('../practice/shadowing/shadowingProgress.js', () => ({
  getLessonDone: vi.fn(() => doneIds),
  markSegmentDone: vi.fn(),
  isLessonDone: vi.fn(() => false),
  SHADOWING_PROGRESS_EVENT: 'shadowing-progress',
}))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true, check: () => Promise.resolve({ allowed: true }) }),
}))
const assessTake = vi.fn()
vi.mock('../practice/shadowing/assessClient.js', () => ({
  assessTake: (...a) => assessTake(...a),
}))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))
vi.mock('../practice/practiceHomework.js', () => ({ countUnitTowardsHomework: vi.fn() }))

const { default: ShadowingPage } = await import('./ShadowingPage.jsx')
const { loadLessonFile } = await import('../practice/shadowing/lessonContent.js')
const { resetLessonsForTests } = await import('../practice/shadowing/catalog.js')
const { segmentId } = await import('../practice/shadowing/engine.js')
const { LESSONS } = await import('../practice/shadowing/lessons.js')
const { saveTake } = await import('../practice/shadowing/recordings.js')
const { markSegmentDone } = await import('../practice/shadowing/shadowingProgress.js')
const { recordSkill } = await import('../practice/skillStats.js')
const LID = LESSONS[0].id

function renderPage(lessonId) {
  return render(
    <I18nProvider>
      <ShadowingPage userLevel="A2" userName="U" token="tok" lessonId={lessonId} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

const rows = () => [...document.querySelectorAll('.sh-seg')]

// Экран по умолчанию открывает фразы поэтапно (до первой незаписанной). Для
// проверки строк нужны обе — гасим «поэтапно» тем же чипом, что и студент.
async function showAllPhrases() {
  const chip = [...document.querySelectorAll('.sh-chip')].find((b) => b.className.includes('sh-chip--on'))
  if (chip) fireEvent.click(chip)
  await waitFor(() => expect(rows().length).toBe(SEGMENTS.length))
}
const mineRow = (i) => rows()[i]?.querySelector('.sh-seg__mine')
const assessBtn = (i) => rows()[i]?.querySelector('.sh-seg__assess')

beforeEach(() => {
  resetLessonsForTests()
  getShadowingLessons.mockReset()
  getShadowingLessons.mockImplementation(() => new Promise(() => {}))
  loadLessonFile.mockClear()
  doneIds.clear()
  lessonScores = new Map()
  storedBlobs = new Set()
  assessTake.mockReset()
  saveTake.mockClear()
  markSegmentDone.mockClear()
  recordSkill.mockClear()
})
afterEach(() => vi.useRealTimers())

describe('Shadowing — строка «моя запись»', () => {
  it('не показывается, когда фраза отмечена пройденной, а записи на устройстве нет', async () => {
    // Второе устройство: прогресс синкнулся, IndexedDB пустая.
    doneIds.add(segmentId(LID, 0))
    doneIds.add(segmentId(LID, 1))
    renderPage()
    await showAllPhrases()

    // Ни одной живой кнопки, которая молча ничего не делает.
    expect(mineRow(0)).toBeFalsy()
    expect(mineRow(1)).toBeFalsy()
  })

  it('показывается, когда у фразы есть локальный балл — запись лежит в IndexedDB', async () => {
    // Без doneIds: с ним тест проходил и на старом коде — строку показывал
    // старый `|| isDone`, и утверждение ничего не различало.
    const segId = segmentId(LID, 0)
    lessonScores = new Map([[segId, 72]])
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(mineRow(0)).toBeTruthy())
    expect(mineRow(1)).toBeFalsy()
  })

  it('балл 0 — это балл: строка показывается', async () => {
    const segId = segmentId(LID, 0)
    lessonScores = new Map([[segId, 0]])
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(mineRow(0)).toBeTruthy())
  })
})

describe('Shadowing — «★ Оценить» во время чужого разбора', () => {
  it('кнопки соседних фраз выключаются, пока идёт разбор', async () => {
    lessonScores = new Map([
      [segmentId(LID, 0), 60],
      [segmentId(LID, 1), 65],
    ])
    storedBlobs = new Set([segmentId(LID, 0), segmentId(LID, 1)])
    // Разбор «висит»: промис не резолвится, assessingIdx остаётся выставленным.
    assessTake.mockImplementation(() => new Promise(() => {}))
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())
    expect(assessBtn(1).disabled).toBe(false)

    fireEvent.click(assessBtn(0))

    // Первая ушла в спиннер (её строка сменилась на PhraseScore), вторая —
    // честно закрыта, а не «живая и молчит».
    await waitFor(() => expect(assessBtn(1).disabled).toBe(true))
  })
})

describe('Shadowing — оценка без лимита', () => {
  it('счётчика «Оценок осталось» нет, «★ Оценить» не заперта', async () => {
    lessonScores = new Map([[segmentId(LID, 0), 60]])
    storedBlobs = new Set([segmentId(LID, 0)])
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())

    expect(document.body.textContent).not.toMatch(/Оценок осталось/)
    expect(assessBtn(0).disabled).toBe(false)
  })
})

describe('Shadowing — упавший rec.start() не запирает микрофоны', () => {
  // recTargetRef чистился ТОЛЬКО в rec.onstop, а упавший старт до onstop не
  // доходит. Оставленная цель уводила каждый следующий тап в
  // `if (recTargetRef.current) { stopRec(); return }`, stopRec видел
  // inactive-рекордер и не делал ничего — и так до ухода с экрана.
  const micButtons = () =>
    [...document.querySelectorAll('.sh-seg__act')].filter(
      (b) => b.getAttribute('aria-label') === 'Записать фразу',
    )

  it('второй тап снова доходит до записи, а не уходит в молчание', async () => {
    const getUserMedia = vi.fn(() => Promise.resolve({ active: true, getTracks: () => [] }))
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })
    // Поток дали, а старт записи упал — гарнитуру выдернули, mime не поддержан.
    let built = 0
    class FailingRecorder {
      constructor() {
        built += 1
        this.state = 'inactive'
      }
      start() { throw new Error('start failed') }
      stop() {}
    }
    FailingRecorder.isTypeSupported = () => true
    vi.stubGlobal('MediaRecorder', FailingRecorder)

    renderPage()
    await showAllPhrases()
    expect(micButtons().length).toBeGreaterThan(0)

    fireEvent.click(micButtons()[0])
    await waitFor(() => expect(built).toBe(1))

    // Признак «дошли до записи» — НОВЫЙ рекордер (поток после сбоя
    // отпускается, getUserMedia зовётся заново). Залипшая цель оставляла
    // счётчик на единице.
    fireEvent.click(micButtons()[0])
    await waitFor(() => expect(built).toBe(2))
  })
})

describe('Shadowing — уроки, добавленные через админку', () => {
  const REMOTE = {
    id: 5, slug: 'calm-talk-ab3k9', title: 'Calm Talk', speaker: 'Ann Remote', video: 'CqgmozFr_GM', segCount: 2,
  }
  const tabs = () => [...document.querySelectorAll('.sh-tabs .pp-chip')]
  const activeTab = () => document.querySelector('.sh-tabs .pp-chip--on')?.textContent

  it('вкладка урока стоит после вшитых, а его фразы читаются по адресу с токеном', async () => {
    getShadowingLessons.mockResolvedValue([REMOTE])
    renderPage()

    await waitFor(() => expect(tabs().length).toBe(LESSONS.length + 1))
    const tab = tabs().find((b) => b.textContent.endsWith('Ann Remote'))
    expect(tab).toBe(tabs()[tabs().length - 1])
    expect(tabs().length).toBe(LESSONS.length + 1)

    fireEvent.click(tab)

    await waitFor(() => expect(loadLessonFile).toHaveBeenCalledWith('calm-talk-ab3k9', 'tok'))
    await waitFor(() => expect(activeTab()).toContain('Ann Remote'))
    await showAllPhrases()
  })

  it('урок по ссылке, пока список не доехал, не подменяется первым вшитым: показана загрузка', async () => {
    renderPage('calm-talk-ab3k9')

    expect(document.body.textContent).toContain('Загружаем урок')
    expect(loadLessonFile).not.toHaveBeenCalled()
    expect(tabs().length).toBe(0)
  })

  it('список доехал — открывается именно этот урок', async () => {
    getShadowingLessons.mockResolvedValue([REMOTE])
    renderPage('calm-talk-ab3k9')

    await waitFor(() => expect(loadLessonFile).toHaveBeenCalledWith('calm-talk-ab3k9', 'tok'))
    expect(loadLessonFile).not.toHaveBeenCalledWith(LID, 'tok')
    expect(activeTab()).toContain('Ann Remote')
  })

  it('урока нет и после загрузки списка (скрыли или удалили) — открывается первый вшитый, как раньше', async () => {
    getShadowingLessons.mockResolvedValue([])
    renderPage('gone-talk-zz9zz')

    await waitFor(() => expect(loadLessonFile).toHaveBeenCalledWith(LID, 'tok'))
  })

  it('сеть недоступна — вшитые уроки работают, ожидание не виснет', async () => {
    getShadowingLessons.mockRejectedValue(new Error('Нет связи с сервером.'))
    renderPage('calm-talk-ab3k9')

    await waitFor(() => expect(loadLessonFile).toHaveBeenCalledWith(LID, 'tok'))
    expect(tabs().length).toBe(LESSONS.length)
  })
})

// ── Баги ревью Практики 08.10.2026: #64, #66, #67, #68 ──────────────────────
// Микрофон и MediaRecorder подменяем: проверяем не звук, а что экран делает с
// записью и с потоком микрофона.
function stubMic() {
  const tracks = []
  const getUserMedia = vi.fn(() => {
    const track = { stop: vi.fn() }
    tracks.push(track)
    return Promise.resolve({ active: true, getTracks: () => [track] })
  })
  vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })
  const recorders = []
  class FakeRecorder {
    static isTypeSupported() { return true }
    constructor() {
      this.state = 'inactive'
      this.mimeType = 'audio/webm'
      recorders.push(this)
    }
    start() { this.state = 'recording' }
    stop() {
      this.state = 'inactive'
      this.ondataavailable?.({ data: new Blob(['take']) })
      this.onstop?.()
    }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  // В jsdom нет object-URL — экран делает их для «Твоей записи».
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:take', revokeObjectURL: () => {} }))
  return { getUserMedia, tracks, recorders }
}
const micBtn = (i) =>
  rows()[i]?.querySelector('.sh-seg__act[aria-label="Записать фразу"]')
const isRecording = (i) => !!rows()[i]?.querySelector('.sh-seg__act.is-rec')

async function recordTake(i, mic, n) {
  fireEvent.click(micBtn(i))
  await waitFor(() => expect(mic.recorders.length).toBe(n))
  await waitFor(() => expect(isRecording(i)).toBe(true))
  fireEvent.click(micBtn(i))
  await waitFor(() => expect(isRecording(i)).toBe(false))
}

const REAL = { overall: 91, accuracy: 90, fluency: 92, prosody: 88, completeness: 95, words: [], tip: '', transcript: '', mock: false }

describe('Shadowing — микрофон не держится открытым весь экран (#68)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('после записи фразы поток микрофона отпускается', async () => {
    const mic = stubMic()
    renderPage()
    await showAllPhrases()

    await recordTake(0, mic, 1)

    // Раньше поток кэшировался до ухода с экрана: красная точка записи в
    // браузере горела, пока ученик просто смотрел видео.
    await waitFor(() => expect(mic.tracks[0].stop).toHaveBeenCalled())
  })
})

describe('Shadowing — тишина не превращается в балл (#64)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('сервер не разобрал речь — под фразой «не расслышали», а не молчание', async () => {
    lessonScores = new Map([[segmentId(LID, 0), 60]])
    storedBlobs = new Set([segmentId(LID, 0)])
    assessTake.mockRejectedValue(Object.assign(new Error('no_speech'), { code: 'no_speech', status: 422 }))
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())

    fireEvent.click(assessBtn(0))

    await waitFor(() => expect(rows()[0].textContent).toMatch(/Не расслышали/))
    expect(saveTake).not.toHaveBeenCalled()
  })

  it('оценка-заглушка (mock) показывается, но не сохраняется лучшим баллом и не идёт в навык', async () => {
    lessonScores = new Map([[segmentId(LID, 0), 60]])
    storedBlobs = new Set([segmentId(LID, 0)])
    assessTake.mockResolvedValue({ ...REAL, overall: 70, mock: true })
    renderPage()
    await showAllPhrases()
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())

    fireEvent.click(assessBtn(0))

    await waitFor(() => expect(rows()[0].querySelector('.sh-score__mock')).toBeTruthy())
    expect(saveTake).not.toHaveBeenCalled()
    expect(recordSkill).not.toHaveBeenCalled()
  })
})

describe('Shadowing — перезапись во время оценки (#67)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('оценка старой записи не приклеивается к новой и не затирает её в IndexedDB', async () => {
    const mic = stubMic()
    let finishAssess
    assessTake.mockImplementation(() => new Promise((resolve) => { finishAssess = resolve }))
    renderPage()
    await showAllPhrases()

    await recordTake(0, mic, 1)
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())
    fireEvent.click(assessBtn(0))
    await waitFor(() => expect(assessTake).toHaveBeenCalledTimes(1))

    // Пока идёт разбор первой записи, ученик переписывает фразу.
    await recordTake(0, mic, 2)
    finishAssess(REAL)

    // Новая запись ждёт своей оценки: кнопка «Оценить», а не 91 от старой.
    await waitFor(() => expect(assessBtn(0)).toBeTruthy())
    expect(rows()[0].querySelector('.sh-score')).toBeFalsy()
    expect(saveTake).not.toHaveBeenCalled()
  })
})

describe('Shadowing — смена урока посреди записи (#66)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('запись обрывается и не засчитывается ни старому, ни новому уроку', async () => {
    const mic = stubMic()
    renderPage()
    await showAllPhrases()

    fireEvent.click(micBtn(0))
    await waitFor(() => expect(isRecording(0)).toBe(true))

    const tabs = [...document.querySelectorAll('.sh-tabs .pp-chip')]
    fireEvent.click(tabs[1])
    await waitFor(() => expect(loadLessonFile).toHaveBeenCalledWith(LESSONS[1].id, 'tok'))

    // Раньше рекордер писал дальше, а по стопу запись прошлого урока
    // становилась «Твоей записью» фразы 1 нового урока.
    await waitFor(() => expect(mic.recorders[0].state).toBe('inactive'))
    await waitFor(() => expect(rows().length).toBeGreaterThan(0))
    expect(isRecording(0)).toBe(false)
    expect(mineRow(0)).toBeFalsy()
    expect(markSegmentDone).not.toHaveBeenCalled()
  })
})
