// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  // B1 — старый плеер: экрану нужен только непустой объект урока, содержимое
  // рисует замоканный LessonPlayer.
  loadLesson: vi.fn(async () => ({ title: 'Урок 0', tasks: [] })),
  loadLevel: vi.fn(async () => null),
}))

// Плеер урока заменён кнопкой «сдать»: нас интересует не прохождение, а то, что
// экран делает с итогами, когда бэкенд отказал по квоте.
vi.mock('../learning/LessonPlayer.jsx', () => ({
  default: ({ onDone }) => (
    <button type="button" onClick={() => onDone({ outcome: 'success', correct: 1, wrong: 0, accuracy: 100, points: 1 })}>
      сдать урок
    </button>
  ),
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

import { markDone, ContentRestrictedError } from '../learning/lessonProgress.js'
import KingdomInteriorPage from './KingdomInteriorPage.jsx'

const kingdom = { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'B1', ring: '#fff' }

const renderPage = (props) =>
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
        {...props}
      />
    </I18nProvider>,
  )

const PAYWALL = 'Данная функция доступна по подписке'

/** Пройти первый урок тропы и упереться в отказ бэкенда по квоте. */
async function finishLessonWithQuotaRefusal(view) {
  await waitFor(() => expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length))
  fireEvent.click(view.container.querySelector('.kt-step'))
  const finish = await screen.findByText('сдать урок')
  markDone.mockImplementationOnce(async () => {
    throw new ContentRestrictedError()
  })
  fireEvent.click(finish)
  await waitFor(() => expect(view.container.querySelector('.le-over')).toBeTruthy())
}

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

describe('KingdomInteriorPage — демо-лимит на тропе показывает плашку про подписку', () => {
  beforeEach(() => vi.clearAllMocks())

  it('демо-ученик видит плашку вместо строки «🔒 лимит»', async () => {
    const view = renderPage({ isDemoAccount: true })
    await finishLessonWithQuotaRefusal(view)

    expect(screen.getByText(PAYWALL)).toBeTruthy()
    // Строка отказа под итогами больше не дублирует сказанное в окне.
    expect(view.container.querySelector('.le-restricted')).toBe(null)
    // Экран итогов остаётся под плашкой — это модалка, а не подмена страницы.
    expect(view.container.querySelector('.le-card')).toBeTruthy()
  })

  // Лимит из админки у обычного ученика — не про подписку: у него другая
  // причина отказа, и текст остался прежним.
  it('ученик с квотой от куратора видит прежний текст, а не плашку', async () => {
    const view = renderPage({ isDemoAccount: false })
    await finishLessonWithQuotaRefusal(view)

    expect(screen.queryByText(PAYWALL)).toBe(null)
    expect(view.container.querySelector('.le-restricted').textContent)
      .toContain('Урок не засчитан: вы исчерпали лимит уроков в этом модуле.')
  })

  it('«Вернуться» уводит туда же, куда «Назад» с итогов, — на тропу', async () => {
    const view = renderPage({ isDemoAccount: true })
    await finishLessonWithQuotaRefusal(view)

    fireEvent.click(screen.getByText('Вернуться'))
    await waitFor(() => expect(view.container.querySelector('.le-over')).toBe(null))
    expect(view.container.querySelector('.ds-over')).toBe(null)
    expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length)
  })

  it('Esc уводит туда же, куда «Вернуться»', async () => {
    const view = renderPage({ isDemoAccount: true })
    await finishLessonWithQuotaRefusal(view)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(view.container.querySelector('.le-over')).toBe(null))
    expect(view.container.querySelector('.ds-over')).toBe(null)
    expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length)
  })
})
