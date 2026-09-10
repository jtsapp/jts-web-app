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
// Прогресс по уровню считает сервер — здесь отдаём его готовым.
const levelProgress = { value: { level: 'B1', next: 'B2', percent: 45, done: 9, total: 20, remaining: 11 } }

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
  getLevelProgress: vi.fn(async () => levelProgress.value),
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
  levelProgress.value = { level: 'B1', next: 'B2', percent: 45, done: 9, total: 20, remaining: 11 }
})

describe('Главная демо-аккаунта', () => {
  it('уровень с названием и целью — следующая ступень CEFR', () => {
    renderHome()
    expect(screen.getByText('B1 · Intermediate')).toBeTruthy()
    expect(screen.getByText('Цель — B2')).toBeTruthy()
  })

  it('прогресс — доля освоенных материалов уровня, а не точность в практике', async () => {
    const { container } = renderHome({ token: 'T' })

    // Навыки у этого ученика набраны (см. FULL_STATS), но уровень пройден на
    // 45%: полоса показывает пройденное, а не то, насколько уверенно выходит.
    // Залит только первый отрезок — про дальние ступени знать неоткуда.
    await waitFor(() => expect(container.querySelector('.hm-level__fill')).not.toBeNull())
    expect(container.querySelector('.hm-level__fill').style.width).toBe('45%')
    expect(container.querySelectorAll('.hm-level__fill')).toHaveLength(1)
  })

  it('остаток назван в материалах курса', async () => {
    renderHome({ token: 'T' })

    // «Ещё примерно 4 урока» было выдумкой: плана «сколько уроков до B2» у
    // приложения нет. Материалы уровня — есть, и их можно пересчитать.
    expect(await screen.findByText('Ещё 11 материалов — и вы перейдёте на уровень B2')).toBeTruthy()
  })

  it('пока сервер не ответил, полосы и подписи нет', () => {
    // Пустая дорожка честнее правдоподобной цифры: увиденный процент человек
    // примет за свой и не узнает, что он взят с потолка.
    levelProgress.value = null
    const { container } = renderHome({ token: 'T' })

    expect(container.querySelector('.hm-level__fill')).toBeNull()
    expect(container.querySelector('.hm-level__plan')).toBeNull()
  })

  it('пройденный уровень говорит об этом, а не «ещё 0 материалов»', async () => {
    levelProgress.value = { level: 'B1', next: 'B2', percent: 100, done: 20, total: 20, remaining: 0 }
    renderHome({ token: 'T' })

    expect(await screen.findByText('Материалы уровня пройдены — впереди B2')).toBeTruthy()
  })

  it('купленный курс выше своего ведёт карточку целиком', async () => {
    // Ученик A1 купил A2 — проходит он A2, и полоса считается по нему. Оставить
    // в заголовке A1 значило бы подписать карточку одним уровнем, а мерить
    // другим: вышло бы «ВАШ УРОВЕНЬ A1» с дорожкой, ведущей к B1.
    levelProgress.value = { level: 'A2', next: 'B1', percent: 20, done: 4, total: 20, remaining: 16 }
    renderHome({ userLevel: 'A1', token: 'T' })

    expect(await screen.findByText('A2 · Elementary')).toBeTruthy()
    expect(screen.getByText('Цель — B1')).toBeTruthy()
  })

  it('дорожка ведёт от старта через ближайшие ступени к финишу', () => {
    const { container } = renderHome()

    expect([...container.querySelectorAll('.hm-level__stop')].map((e) => e.textContent))
      .toEqual(['Старт', 'Уровень B2', 'Уровень C1', 'Финиш'])
  })

  it('без пройденного теста вместо уровня — приглашение на тест', () => {
    // Показать здесь карточку с 'A1' нельзя: это подстановка по умолчанию, а
    // человек прочитал бы её как свой определённый уровень.
    const onStartLevelTest = vi.fn()
    const { container } = renderHome({ levelUnknown: true, onStartLevelTest })

    expect(screen.getByText('Прогресс вашего обучения недоступен')).toBeTruthy()
    expect(container.querySelector('.hm-level')).toBeNull()
    expect(container.querySelector('.hm-skills')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Начать тестирование сейчас' }))
    expect(onStartLevelTest).toHaveBeenCalled()
  })

  it('на «Главной» нет расписания, домашки и практики — только уровень, навыки и пробный', () => {
    // Так на макете демо-доступа: те же данные у ученика есть в своих
    // разделах, и дублировать их здесь значит растить экран без нужды.
    const { container } = renderHome()

    expect(container.querySelector('.hm-sched')).toBeNull()
    expect(container.querySelector('.hm-hw')).toBeNull()
    expect(screen.queryByText('Ваша практика на сегодня')).toBeNull()
    expect(container.querySelector('.hm-trial')).not.toBeNull()
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

  it('у новичка вместо цифр — приглашение позаниматься', async () => {
    localStats.value = {}
    levelProgress.value = { level: 'B1', next: 'B2', percent: 0, done: 0, total: 20, remaining: 20 }
    const { container } = renderHome({ token: 'T' })
    expect(container.querySelectorAll('.hm-skill')).toHaveLength(0)
    expect(screen.getByText(/Пройдите несколько заданий/)).toBeTruthy()
    // Нулевой прогресс — не повод обещать переход: план остаётся честным.
    await waitFor(() => expect(container.querySelector('.hm-level__fill')).not.toBeNull())
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

  // Время урока — всегда «через два часа», а не зашитая дата. С датой тест
  // становился бомбой с часовым механизмом: карточка показывает занятие, пока
  // оно не кончилось, и в назначенный день после назначенного часа тест начинал
  // падать сам по себе — что и случилось 10.09.2026 с прежним '2026-09-10T14:00'.
  const inTwoHours = () => {
    const at = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
      + `T${pad(at.getHours())}:${pad(at.getMinutes())}:00`
  }

  const lesson = (over = {}) => ({
    lessonId: 42,
    scheduledAt: inTwoHours(),
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
