// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Тропа из 21 узла (индексы 0–20), первые 20 (l0..l19) уже пройдены — как у
// демо-ученика, прошедшего курс ДО того, как на модуль завели квоту 3 (в базе
// не было lesson_modules, лимит не запрашивался — см. коммент над isUnlocked).
const { TRAIL, DONE_CODES } = vi.hoisted(() => {
  const trail = Array.from({ length: 21 }, (_, i) => ({ code: `l${i}`, order: i, title: `Урок ${i}`, unit: 1 }))
  return { TRAIL: trail, DONE_CODES: trail.slice(0, 20).map((l) => l.code) }
})

vi.mock('../api.js', () => ({
  // Экран тянет мост «Практика → домашка» (practiceHomework.js), а тот —
  // markPracticeUnitDone: без заглушки мок падает на неизвестном экспорте.
  markPracticeUnitDone: vi.fn(async () => ({ counted: 0, alreadyDone: 0 })),
  // Оболочка рисует колокольчик уведомлений и баланс сайдбара — без заглушек
  // падает весь экран (см. LessonsPage.test.jsx/HomeworkPage.test.jsx).
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getLessonModules: vi.fn(async () => [{ id: 'mod-1', level: 'B1', orderIndex: 0, locked: false }]),
  getPracticeToken: vi.fn(async (token) => token),
  completeLessonModule: vi.fn(async () => ({})),
  // Квота модуля: 3 — новый лимит, введённый уже ПОСЛЕ того, как демо-ученик
  // прошёл 20 узлов.
  getContentQuota: vi.fn(async () => 3),
  // Юнит «Повторения» открывается по каталогу (lib/reviewUnlock.js). Вся
  // тропа этого теста лежит в одном юните (unit: 1, см. TRAIL) — открываем
  // его целиком, чтобы тесты квоты и последовательности проверяли то же, что
  // и раньше, а не упирались в новый замок первым делом.
  getCourseCatalog: vi.fn(async () => [
    { code: 'B1', separateAccess: false, units: [{ lessons: [{ id: 1 }] }] },
  ]),
  getCatalogProgress: vi.fn(async () => ({ completedLessonIds: [1] })),
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

import { markDone, loadDone, ContentRestrictedError } from '../learning/lessonProgress.js'
import { getContentQuota, getCourseCatalog, getCatalogProgress, getLessonModules } from '../api.js'
import { getLevelLessons } from '../learning/lessonData.js'
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
  // причина отказа, и текст остался про менеджера (не демо-пейволл).
  it('ученик с квотой от менеджера видит прежний текст, а не плашку', async () => {
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

  // Итоги показываются сразу, а засчитывание урока (resolveModuleId + markDone)
  // идёт по сети следом. Пока оно не вернулось, следующий узел на тропе ещё
  // заперт — и быстрый клик «Перейти на следующий урок» читал это как
  // исчерпанную квоту: обычный ученик видел «🔒 лимит», демо — окно подписки.
  it('клик «Следующий урок» до ответа сервера не рисует ложный замок квоты', async () => {
    loadDone.mockImplementationOnce(async () => new Set())
    getContentQuota.mockImplementationOnce(async () => null)
    let settle
    markDone.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve }))

    const view = renderPage({ isDemoAccount: true })
    await waitFor(() => expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length))
    fireEvent.click(view.container.querySelector('.kt-step'))
    fireEvent.click(await screen.findByText('сдать урок'))

    const next = await screen.findByText('Перейти на следующий урок')
    fireEvent.click(next)
    expect(screen.queryByText(PAYWALL)).toBe(null)
    expect(view.container.querySelector('.le-restricted')).toBe(null)

    // Сервер засчитал урок — следующий открывается, а не упирается в замок.
    settle(new Set(['l0']))
    await waitFor(() => expect(screen.getByText('Перейти на следующий урок').disabled).toBe(false))
    fireEvent.click(screen.getByText('Перейти на следующий урок'))
    await screen.findByText('сдать урок')
    expect(screen.queryByText(PAYWALL)).toBe(null)
  })

  // У fetch нет своего таймаута: на «зависшей» мобильной сети ответ идёт и
  // минуту. Ждать его у неактивной кнопки ученик не должен — для него это
  // сломанная кнопка. Через 8 с урок считается пройденным на экране, и путь
  // дальше открыт.
  it('сервер молчит — кнопка отпускается сама, и следующий урок открывается', async () => {
    loadDone.mockImplementationOnce(async () => new Set())
    getContentQuota.mockImplementationOnce(async () => null)
    markDone.mockImplementationOnce(() => new Promise(() => {})) // не ответит никогда

    const view = renderPage({ isDemoAccount: true })
    await waitFor(() => expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length))
    fireEvent.click(view.container.querySelector('.kt-step'))
    const finish = await screen.findByText('сдать урок')

    // Таймеры подменяем только на время ожидания: findBy*/waitFor под
    // подменёнными таймерами не работают, поэтому дальше — прямые проверки.
    vi.useFakeTimers()
    try {
      fireEvent.click(finish)
      await act(async () => { await vi.advanceTimersByTimeAsync(100) })
      expect(screen.getByText('Перейти на следующий урок').disabled).toBe(true)

      await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
      expect(screen.getByText('Перейти на следующий урок').disabled).toBe(false)

      fireEvent.click(screen.getByText('Перейти на следующий урок'))
      await act(async () => { await vi.advanceTimersByTimeAsync(100) })
      expect(screen.getByText('сдать урок')).toBeTruthy()
      expect(screen.queryByText(PAYWALL)).toBe(null)
      expect(view.container.querySelector('.le-restricted')).toBe(null)
    } finally {
      vi.useRealTimers()
    }
  })

  // Отметка «пройдено», выставленная в ожидании, не должна пережить отказ по
  // квоте: урок не засчитан, и узел тропы обязан остаться непройденным.
  it('отказ по квоте после долгого ожидания снимает временную отметку', async () => {
    loadDone.mockImplementationOnce(async () => new Set())
    getContentQuota.mockImplementationOnce(async () => null)
    let refuse
    markDone.mockImplementationOnce(() => new Promise((_, reject) => { refuse = reject }))

    const view = renderPage({ isDemoAccount: false })
    await waitFor(() => expect(view.container.querySelectorAll('.kt-step').length).toBe(TRAIL.length))
    fireEvent.click(view.container.querySelector('.kt-step'))
    const finish = await screen.findByText('сдать урок')

    vi.useFakeTimers()
    try {
      fireEvent.click(finish)
      await act(async () => { await vi.advanceTimersByTimeAsync(8100) })
      await act(async () => {
        refuse(new ContentRestrictedError())
        await vi.advanceTimersByTimeAsync(100)
      })
      expect(view.container.querySelector('.le-restricted')).toBeTruthy()
      fireEvent.click(screen.getByText('Назад'))
      await act(async () => { await vi.advanceTimersByTimeAsync(100) })
      expect(view.container.querySelector('.kt-step').className).not.toMatch(/is-complete/)
    } finally {
      vi.useRealTimers()
    }
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

// «Прохожу юнит 1 в уроках → юнит 1 доступен в Повторении; юнит 2 — так же».
// В отличие от блоков выше, тропа тут в ДВУХ юнитах: замок по каталогу виден
// только на границе юнитов, а не внутри одного.
describe('KingdomInteriorPage — юниты открываются по каталогу (живой урок или «Самостоятельно»)', () => {
  const MULTI_UNIT_TRAIL = [
    { code: 'm0', order: 0, title: 'Юнит 1 · шаг 1', unit: 1 },
    { code: 'm1', order: 1, title: 'Юнит 1 · шаг 2', unit: 1 },
    { code: 'm2', order: 2, title: 'Юнит 2 · шаг 1', unit: 2 },
    { code: 'm3', order: 3, title: 'Юнит 2 · шаг 2', unit: 2 },
  ]
  const generalCourse = () => [
    { code: 'B1', separateAccess: false, units: [{ lessons: [{ id: 1 }] }, { lessons: [{ id: 2 }] }] },
  ]
  const progress = (ids) => ({ completedLessonIds: ids })

  beforeEach(() => {
    vi.clearAllMocks()
    getLevelLessons.mockResolvedValue(MULTI_UNIT_TRAIL)
    loadDone.mockResolvedValue(new Set()) // локально в разделе ещё ничего не пройдено
    getContentQuota.mockResolvedValue(null) // без лимита модуля — квота тут не при чём
  })

  it('новый ученик (в каталоге ничего не пройдено) — заперты оба юнита целиком', async () => {
    getCourseCatalog.mockResolvedValue(generalCourse())
    getCatalogProgress.mockResolvedValue(progress([]))

    const { container } = renderPage()
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(MULTI_UNIT_TRAIL.length))
    const buttons = [...container.querySelectorAll('.kt-step')]

    expect(buttons.every((b) => b.disabled)).toBe(true)
    expect(buttons[0].title).toBe('Сначала пройдите этот материал в «Уроках»')
  })

  it('юнит 1 пройден в каталоге — открыт юнит 1, юнит 2 всё ещё заперт', async () => {
    getCourseCatalog.mockResolvedValue(generalCourse())
    getCatalogProgress.mockResolvedValue(progress([1]))

    const { container } = renderPage()
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(MULTI_UNIT_TRAIL.length))
    const buttons = [...container.querySelectorAll('.kt-step')]

    expect(buttons[0].disabled).toBe(false) // юнит 1, шаг 1 — открыт
    expect(buttons[1].disabled).toBe(true) // юнит 1, шаг 2 — обычный порядок внутри юнита: шаг 1 ещё не сдан
    expect(buttons[2].disabled).toBe(true) // юнит 2 — заперт каталогом
    expect(buttons[2].title).toBe('Сначала пройдите этот материал в «Уроках»')
  })

  it('оба юнита пройдены в каталоге — юнит 2 тоже открыт', async () => {
    getCourseCatalog.mockResolvedValue(generalCourse())
    getCatalogProgress.mockResolvedValue(progress([1, 2]))

    const { container } = renderPage()
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(MULTI_UNIT_TRAIL.length))
    const buttons = [...container.querySelectorAll('.kt-step')]

    expect(buttons[0].disabled).toBe(false)
    expect(buttons[2].disabled).toBe(false) // первый шаг юнита 2 не ждёт соседа из юнита 1
  })

  it('на уровне только курс с отдельным доступом — общего нет, ничего не открыто даже при «пройдено»', async () => {
    getCourseCatalog.mockResolvedValue([
      { code: 'B1', separateAccess: true, units: [{ lessons: [{ id: 1 }] }, { lessons: [{ id: 2 }] }] },
    ])
    getCatalogProgress.mockResolvedValue(progress([1, 2]))

    const { container } = renderPage()
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(MULTI_UNIT_TRAIL.length))
    expect([...container.querySelectorAll('.kt-step')].every((b) => b.disabled)).toBe(true)
  })

  it('unlockAll (?unlock=1, только dev) снимает и замок по каталогу — тропу можно посмотреть целиком', async () => {
    getCourseCatalog.mockResolvedValue(generalCourse())
    getCatalogProgress.mockResolvedValue(progress([]))

    const { container } = renderPage({ unlockAll: true })
    await waitFor(() => expect(container.querySelectorAll('.kt-step')).toHaveLength(MULTI_UNIT_TRAIL.length))
    expect([...container.querySelectorAll('.kt-step')].every((b) => !b.disabled)).toBe(true)
  })

  it('unlockAll не снимает блокировку модуля админом — это не «посмотреть контент», а запрет', async () => {
    getLessonModules.mockResolvedValue([{ id: 'mod-1', level: 'B1', orderIndex: 0, locked: true }])
    getCourseCatalog.mockResolvedValue(generalCourse())
    getCatalogProgress.mockResolvedValue(progress([1, 2]))

    const { container } = renderPage({ unlockAll: true })

    // Заблокированный админом модуль тропу вообще не рисует — экран
    // показывает отдельное сообщение вместо узлов (см. moduleLocked ниже).
    // Эмодзи и текст — соседние текстовые узлы одного div, поэтому сверяем
    // textContent элемента, а не ищем строку по всему документу.
    await waitFor(() => expect(container.querySelector('.li-empty__title')).toBeTruthy())
    expect(container.querySelector('.li-empty__title').textContent).toContain('Доступ к этому модулю закрыт')
    expect(container.querySelectorAll('.kt-step')).toHaveLength(0)
  })
})
