// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import HomePage from './HomePage.jsx'

// Пробный урок: состояние заявки и расписание отдаём готовыми. Обе величины
// в изменяемых переменных — vi.mock поднимается наверх файла, и подменить его
// изнутри it нечем (так же сделано с рейтингом навыков ниже).
const trialState = { value: { requested: false, managerAssigned: false } }
const occurrences = { value: [] }
const homework = { value: [] }

vi.mock('../api.js', () => ({
  // С токеном оболочка будит колокольчик уведомлений — без заглушки падает
  // весь экран (та же причина, что в CourseCatalogPage.test.jsx).
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: true, expiresAt: null })),
  getTrialRequestState: vi.fn(async () => trialState.value),
  getMyLessonOccurrences: vi.fn(async () => occurrences.value),
  getMyHomework: vi.fn(async () => homework.value),
  requestTrialLesson: vi.fn(async () => ({ requested: true, managerAssigned: false })),
}))

// Рейтинг навыков: локальное зеркало отдаём готовым, сеть не трогаем — экран
// проверяем по цифрам, а не по загрузке. Набор лежит в изменяемой переменной,
// потому что vi.mock поднимается наверх файла и подменить его внутри it нечем.
const FULL_STATS = {
  speaking: { done: 25, firstTry: 21 },
  listening: { done: 25, firstTry: 19 },
  vocab: { done: 25, firstTry: 17 },
  grammar: { done: 25, firstTry: 12 },
  writing: { done: 25, firstTry: 10 },
  reading: { done: 25, firstTry: 15 },
}
const localStats = { value: FULL_STATS }

vi.mock('../practice/skillStats.js', () => ({
  readLocalSkillStats: () => localStats.value,
  loadSkillStatsRemote: vi.fn(async () => null),
}))

function renderHome(props = {}) {
  const onOpenPricing = vi.fn()
  const onOpenTrial = vi.fn()
  const onOpenLesson = vi.fn()
  const view = render(
    <I18nProvider>
      <HomePage
        userLevel="B1"
        userName="Сакен"
        isDemoAccount
        onOpenPricing={onOpenPricing}
        onOpenTrial={onOpenTrial}
        onOpenLesson={onOpenLesson}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...view, onOpenPricing, onOpenTrial, onOpenLesson }
}

beforeEach(() => {
  localStorage.clear()
  localStats.value = FULL_STATS
})

describe('Главная демо-аккаунта', () => {
  it('уровень с названием и целью — следующая ступень CEFR', () => {
    renderHome()
    expect(screen.getByText('B1 · Intermediate')).toBeTruthy()
    expect(screen.getByText('Цель — B2')).toBeTruthy()
  })

  it('прогресс до следующего уровня — среднее по навыкам', () => {
    const { container } = renderHome()
    // (84+76+68+48+40+60)/6 = 62.7 → 63
    expect(screen.getByText('63% до B2')).toBeTruthy()
    expect(container.querySelector('.hm-level__fill').style.width).toBe('63%')
  })

  it('сильная и слабая стороны названы', () => {
    renderHome()
    expect(screen.getByText('Сильнее всего — Говорение')).toBeTruthy()
    expect(screen.getByText('Стоит подтянуть — Письмо')).toBeTruthy()
  })

  it('навыки идут от сильного к слабому', () => {
    const { container } = renderHome()
    const names = [...container.querySelectorAll('.hm-skill__name')].map((n) => n.textContent)
    expect(names[0]).toBe('Говорение')
    expect(names[names.length - 1]).toBe('Письмо')
  })

  it('у новичка вместо цифр — приглашение позаниматься', () => {
    localStats.value = {}
    const { container } = renderHome()
    expect(container.querySelectorAll('.hm-skill')).toHaveLength(0)
    expect(screen.getByText(/Пройдите несколько заданий/)).toBeTruthy()
    // Нулевой прогресс — не повод обещать переход: план остаётся честным.
    expect(container.querySelector('.hm-level__fill').style.width).toBe('0%')
  })

  it('плашка демо есть только у демо-аккаунта', () => {
    const { container, rerender } = renderHome()
    expect(container.querySelector('.dm-banner')).toBeTruthy()
    rerender(
      <I18nProvider>
        <HomePage userLevel="B1" userName="Сакен" isDemoAccount={false} />
      </I18nProvider>,
    )
    expect(container.querySelector('.dm-banner')).toBeFalsy()
  })

  it('«Открыть полный доступ» и «Записаться» зовут свои обработчики', () => {
    const { onOpenPricing, onOpenTrial } = renderHome()
    fireEvent.click(screen.getByText('Открыть полный доступ'))
    expect(onOpenPricing).toHaveBeenCalled()
    // «Записаться» делает два дела: открывает разговор с менеджером (сам сговор
    // о времени идёт там) и оставляет заявку, чтобы человек не потерялся в
    // очереди, даже если до чата не дошёл.
    fireEvent.click(screen.getByText('Записаться'))
    expect(onOpenTrial).toHaveBeenCalled()
  })

  // Бессрочное демо (менеджер выдал доступ руками) — таймера нет вовсе, а не
  // «0 ч 0 мин».
  it('без срока таймер не рисуется', () => {
    const { container } = renderHome({ demoExpiresAt: null })
    expect(container.querySelector('.dm-banner__timer')).toBeFalsy()
  })

  it('со сроком таймер показывает остаток', () => {
    const until = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 19)
    const { container } = renderHome({ demoExpiresAt: `${until}Z` })
    expect(container.querySelector('.dm-banner__timer').textContent).toMatch(/осталось \d+ ч/)
  })
})

describe('Карточка пробного урока', () => {
  beforeEach(() => {
    trialState.value = { requested: false, managerAssigned: false }
    occurrences.value = []
  })

  const lesson = (over = {}) => ({
    lessonId: 42,
    scheduledAt: '2026-09-10T14:00:00',
    durationMinutes: 50,
    teacherName: 'Айгерим',
    lessonStatus: 'SCHEDULED',
    ...over,
  })

  it('без заявки и урока зовёт записаться', async () => {
    renderHome({ token: 'T' })
    expect(await screen.findByText('Записаться')).toBeTruthy()
    expect(screen.getByText('Пробный урок — бесплатно')).toBeTruthy()
  })

  it('после нажатия открывает разговор с менеджером и показывает, что заявка есть', async () => {
    const { onOpenTrial } = renderHome({ token: 'T' })
    fireEvent.click(await screen.findByText('Записаться'))

    // Сговор о времени идёт в чате — слотов в приложении нет.
    expect(onOpenTrial).toHaveBeenCalled()
    // А карточка перестаёт звать записываться второй раз.
    expect(await screen.findByText('Заявка принята')).toBeTruthy()
    expect(screen.queryByText('Записаться')).toBeNull()
  })

  it('с оставленной заявкой кнопки нет вовсе', async () => {
    trialState.value = { requested: true, managerAssigned: false }
    renderHome({ token: 'T' })
    expect(await screen.findByText('Заявка принята')).toBeTruthy()
    expect(screen.queryByText('Записаться')).toBeNull()
  })

  it('когда менеджер закреплён — говорит об этом, а не «свяжемся»', async () => {
    trialState.value = { requested: true, managerAssigned: true }
    renderHome({ token: 'T' })
    await screen.findByText('Заявка принята')
    expect(screen.getByText(/закреплён менеджер/)).toBeTruthy()
  })

  it('назначенный урок показывает когда, с кем и ведёт в него', async () => {
    occurrences.value = [lesson()]
    const { onOpenLesson } = renderHome({ token: 'T' })

    expect(await screen.findByText('Урок назначен')).toBeTruthy()
    // Ищем внутри самой карточки: то же занятие теперь стоит и в расписании
    // рядом — как «Мой график» и календарь на экране «Уроки».
    const card = document.querySelector('.hm-trial')
    expect(card.textContent).toContain('Айгерим')
    fireEvent.click(screen.getByText('Перейти к уроку'))
    expect(onOpenLesson).toHaveBeenCalledWith(42)
  })

  it('урок важнее заявки: назначенное занятие вытесняет «Заявка принята»', async () => {
    // Заявку менеджер мог и не отметить, поставив занятие напрямую, — и
    // наоборот. Показываем то, что человеку полезнее: сам урок.
    trialState.value = { requested: true, managerAssigned: true }
    occurrences.value = [lesson()]
    renderHome({ token: 'T' })

    expect(await screen.findByText('Урок назначен')).toBeTruthy()
    expect(screen.queryByText('Заявка принята')).toBeNull()
  })

  it('без токена в сеть не ходит и остаётся приглашением', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByText('Записаться')).toBeTruthy())
  })
})
