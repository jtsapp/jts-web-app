// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Тропа из 21 узла (индексы 0–20), первые 20 (l0..l19) уже пройдены — как у
// демо-ученика, прошедшего курс ДО того, как на модуль завели квоту 3 (в базе
// не было lesson_modules, лимит не запрашивался — см. коммент над isUnlocked).
const { TRAIL, DONE_CODES } = vi.hoisted(() => {
  const trail = Array.from({ length: 21 }, (_, i) => ({ code: `l${i}`, order: i, title: `Урок ${i}`, unit: 1 }))
  return { TRAIL: trail, DONE_CODES: trail.slice(0, 20).map((l) => l.code) }
})

vi.mock('../api.js', () => ({
  // Оболочка рисует колокольчик уведомлений и баланс сайдбара — без заглушек
  // падает весь экран (см. LessonsPage.test.jsx/HomeworkPage.test.jsx).
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getLessonModules: vi.fn(async () => [{ id: 'mod-1', level: 'B1', orderIndex: 0, locked: false }]),
  getPracticeToken: vi.fn(async (token) => token),
  completeLessonModule: vi.fn(async () => ({})),
  // Квота модуля: 3 — новый лимит, введённый уже ПОСЛЕ того, как демо-ученик
  // прошёл 20 узлов.
  getContentQuota: vi.fn(async () => 3),
}))

vi.mock('../learning/lessonData.js', () => ({
  getLevelLessons: vi.fn(async () => TRAIL),
  loadLesson: vi.fn(async () => null),
  loadLevel: vi.fn(async () => null),
}))

vi.mock('../learning/lessonProgress.js', async () => {
  const actual = await vi.importActual('../learning/lessonProgress.js')
  return {
    ...actual,
    loadDone: vi.fn(async () => new Set(DONE_CODES)),
    markDone: vi.fn(async () => new Set(DONE_CODES)),
  }
})

// Уровень B1 не переведён на курс в этом тесте — тропа строится из
// getLevelLessons (старый путь), courseData здесь не участвует.
vi.mock('../learning/courseData.js', () => ({
  getCourseIndex: vi.fn(async () => null),
  courseTrail: vi.fn(() => []),
  loadCourseSteps: vi.fn(async () => null),
}))

import KingdomInteriorPage from './KingdomInteriorPage.jsx'

const kingdom = { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'B1', ring: '#fff' }

const renderPage = () =>
  render(
    <I18nProvider>
      <KingdomInteriorPage
        kingdom={kingdom}
        userName="Тест"
        userLevel="B1"
        token="tok-1"
        onNav={() => {}}
        onProfile={() => {}}
        onBack={() => {}}
      />
    </I18nProvider>,
  )

describe('KingdomInteriorPage — квота модуля не отнимает уже пройденное', () => {
  beforeEach(() => vi.clearAllMocks())

  it('при квоте 3 и 20 пройденных узлах узлы 0–19 остаются доступны, а узел 20 заблокирован', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(TRAIL.length))

    const buttons = [...container.querySelectorAll('.kt-step')]

    // Пройденные узлы 0–19 не должны запираться квотой задним числом — иначе
    // студент увидит замки на уроках, которые уже прошёл.
    buttons.slice(0, 20).forEach((btn, i) => {
      expect(btn.disabled, `узел ${i} должен быть открыт (уже пройден)`).toBe(false)
    })

    // Узел 20 — новый, не пройден и за пределами квоты (3): заблокирован.
    expect(buttons[20].disabled).toBe(true)
  })
})
