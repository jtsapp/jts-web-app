// @vitest-environment jsdom
//
// Резолюция «урок каталога или файл» (shouldResolveCatalogLesson) не должна
// решать ничего, пока занятие не загружено, — иначе страница мигнула бы одним
// исходом и тут же поехала на другой. До 23.09.2026 в это решение шёл ещё и
// движок занятия (STEPS/FILE); движок оказался НЕ тем, что отличает урок
// каталога от файла (обычный урок каталога можно поставить и на FILE-занятие
// — Запуск/Правка урока это разрешают), и участвовать в решении перестал (см.
// javadoc shouldResolveCatalogLesson, catalogLessonByUrl.js) — здесь остаётся
// проверять только порядок: резолюция обязана дождаться ЗАГРУЖЕННОГО занятия.
// Тот же набор моков, что и у LiveLessonPage.open.test.jsx (см. его шапку), но
// со шпионом вместо настоящего shouldResolveCatalogLesson.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { getLessonById } from '../api.js'

let СТАТУС = 'IN_PROGRESS'

// vi.hoisted — фабрика мока поднимается выше импортов, обычная const там ещё не создана.
const { resolveSpy } = vi.hoisted(() => ({ resolveSpy: vi.fn(() => false) }))

vi.mock('../api.js', () => ({
  getLessonViewStages: vi.fn(async () => []),
  getLessonById: vi.fn(async () => ({
    id: 5,
    status: СТАТУС,
    engine: 'FILE',
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

describe('LiveLessonPage — резолюция урока каталога ждёт загруженное занятие', () => {
  beforeEach(() => { СТАТУС = 'IN_PROGRESS'; resolveSpy.mockClear() })

  it('резолюция зовётся адресом материала, когда занятие загружено', async () => {
    await renderLesson()

    await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('https://cdn/lesson-1.html'))
  })

  // Регрессия финального ревью ветки: разделы (materialFileUrl) приезжают
  // ПРЕЖДЕ занятия (задерживаем именно getLessonById). Раньше зависимость
  // эффекта была по lesson?.engine, и у занятия без этого поля в ответе
  // (старый бэкенд) значение до и после загрузки — одинаковый `undefined`:
  // React решал, что зависимости не поменялись, resolveSpy не звался никогда,
  // а страница стояла на 'loading' вечно. lesson?.id в зависимостях (движок
  // из них с 23.09.2026 убран вовсе — см. shouldResolveCatalogLesson) чинит
  // это структурно: id всегда меняется с «занятия ещё нет» на «занятие есть»,
  // какой бы ни была остальная форма ответа.
  it('резолюция доезжает, даже если материалы пришли раньше занятия', async () => {
    getLessonById.mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({
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
      }), 30)
    }))
    await renderLesson()

    await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('https://cdn/lesson-1.html'))
  })
})
