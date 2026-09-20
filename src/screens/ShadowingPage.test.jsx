// @vitest-environment jsdom
// Регрессии «кнопка есть, а нажатие ничего не делает» в Shadowing:
//  1. строка «моя запись» показывалась по СЕРВЕРНОЙ отметке о прохождении,
//     хотя blob лежит только в IndexedDB устройства;
//  2. «★ Оценить» у соседних фраз оставалась живой, пока идёт чужой разбор;
//  3. упавший rec.start() запирал микрофоны всего экрана до ухода с экрана.
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
  fetchBudget: vi.fn(() => Promise.resolve({ remaining: 10, limit: 10 })),
}))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))
vi.mock('../practice/practiceHomework.js', () => ({ countUnitTowardsHomework: vi.fn() }))

const { default: ShadowingPage } = await import('./ShadowingPage.jsx')
const { segmentId } = await import('../practice/shadowing/engine.js')
const { LESSONS } = await import('../practice/shadowing/lessons.js')
const LID = LESSONS[0].id

function renderPage() {
  return render(
    <I18nProvider>
      <ShadowingPage userLevel="A2" userName="U" token="tok" onNav={() => {}} onProfile={() => {}} />
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
  doneIds.clear()
  lessonScores = new Map()
  storedBlobs = new Set()
  assessTake.mockReset()
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
    const segId = segmentId(LID, 0)
    doneIds.add(segId)
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
