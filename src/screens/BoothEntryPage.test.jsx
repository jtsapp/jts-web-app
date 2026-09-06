// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ enterTrialBooth: vi.fn() }))

import BoothEntryPage from './BoothEntryPage.jsx'
import { enterTrialBooth } from '../api.js'

const failWith = (status) => Object.assign(new Error(`http ${status}`), { status })

const renderPage = (props = {}) =>
  render(
    <I18nProvider>
      <BoothEntryPage token="TOK" onEnter={() => {}} {...props} />
    </I18nProvider>
  )

describe('экран класса', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // Тело ответа каноническое целиком: resumed: true — бэкенд вернул уже
  // открытый сеанс (в классе кто-то есть). Для экрана это ничем не отличается
  // от нового сеанса, и тест это прибивает: никакой отдельной ветки на resumed
  // здесь быть не должно.
  it('класс открыт — экран сразу уводит в урок', async () => {
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 12, lessonId: 77, resumed: true })
    const onEnter = vi.fn()

    renderPage({ onEnter })
    await act(async () => {})

    expect(enterTrialBooth).toHaveBeenCalledWith('TOK')
    expect(onEnter).toHaveBeenCalledWith(77)
  })

  // Преподаватель ещё не открыл класс: занятия нет, но будет — человек стоит
  // перед экраном и ждёт, поэтому экран спрашивает сам, а не просит нажать F5.
  it('занятия ещё нет — ждём и повторяем вход раз в пять секунд', async () => {
    enterTrialBooth.mockRejectedValueOnce(failWith(503))
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 12, lessonId: 77, resumed: false })
    const onEnter = vi.fn()

    renderPage({ onEnter })
    await act(async () => {})

    expect(screen.getByText('Преподаватель ещё не открыл класс')).toBeTruthy()
    expect(enterTrialBooth).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(enterTrialBooth).toHaveBeenCalledTimes(2)
    expect(onEnter).toHaveBeenCalledWith(77)
  })

  // 403 — это не «пока нет», а «и не будет»: класс выключен либо аккаунт вообще
  // не закреплён ни за одним классом. Повторять такое каждые пять секунд значит
  // врать человеку, что он вот-вот войдёт.
  it('класс выключен — говорим об этом и не повторяем', async () => {
    enterTrialBooth.mockRejectedValue(failWith(403))
    const onEnter = vi.fn()

    renderPage({ onEnter })
    await act(async () => {})

    expect(screen.getByText('Класс закрыт')).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })

    expect(enterTrialBooth).toHaveBeenCalledTimes(1)
    expect(onEnter).not.toHaveBeenCalled()
  })

  it('несуществующий класс — тот же ответ, что и выключенный', async () => {
    enterTrialBooth.mockRejectedValue(failWith(404))

    renderPage()
    await act(async () => {})

    expect(screen.getByText('Класс закрыт')).toBeTruthy()
  })

  // Ответ есть, а урока в нём нет — для человека это то же самое «класса ещё
  // нет», а не повод показать пустой экран.
  it('ответ без урока считается ожиданием', async () => {
    enterTrialBooth.mockResolvedValueOnce({})
    const onEnter = vi.fn()

    renderPage({ onEnter })
    await act(async () => {})

    expect(screen.getByText('Преподаватель ещё не открыл класс')).toBeTruthy()
    expect(onEnter).not.toHaveBeenCalled()
  })

  // Вышел из урока сам: сеанс этой вкладки известен. Повторный вход закрыл бы
  // открытый сеанс как забытый и завёл новое занятие — с пустой доской.
  it('известный сеанс не входит заново, а возвращает в тот же урок', async () => {
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
    await act(async () => {})

    expect(enterTrialBooth).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Вернуться в класс' }))

    expect(onEnter).toHaveBeenCalledWith(77)
  })

  // Находка 1 финального ревью: преподаватель завершил сеанс — App.jsx забыл
  // урок (lessonId снова null) и передал justFinished. Автовход здесь означал
  // бы новое занятие в ту же секунду, когда преподаватель закончил, хотя за
  // планшетом ещё никого нет, — поэтому в отличие от обычного «entering» этот
  // экран сам /enter не зовёт.
  it('урок завершён — ждём нажатия, а не входим сами', async () => {
    const onEnter = vi.fn()

    renderPage({ lessonId: null, justFinished: true, onEnter })
    await act(async () => {})

    expect(screen.getByText('Урок завершён')).toBeTruthy()
    expect(enterTrialBooth).not.toHaveBeenCalled()

    // И дальше ничего не меняется само — ни по таймеру, ни как-то ещё.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(enterTrialBooth).not.toHaveBeenCalled()
    expect(onEnter).not.toHaveBeenCalled()
  })

  // Нажатие кнопки — и только оно — заводит новый вход.
  it('урок завершён — кнопка заводит ровно один новый вход', async () => {
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 13, lessonId: 88, resumed: false })
    const onEnter = vi.fn()

    renderPage({ lessonId: null, justFinished: true, onEnter })
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: 'Войти в класс' }))
    await act(async () => {})

    expect(enterTrialBooth).toHaveBeenCalledTimes(1)
    expect(enterTrialBooth).toHaveBeenCalledWith('TOK')
    expect(onEnter).toHaveBeenCalledWith(88)
  })

  // После клика та же кнопка ведёт себя как обычный вход: занятия ещё нет —
  // ждём и повторяем, как в «entering» с самого начала.
  it('урок завершён — после клика поведение то же, что у обычного входа', async () => {
    enterTrialBooth.mockRejectedValueOnce(failWith(503))
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 13, lessonId: 88, resumed: false })
    const onEnter = vi.fn()

    renderPage({ lessonId: null, justFinished: true, onEnter })
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: 'Войти в класс' }))
    await act(async () => {})

    expect(screen.getByText('Преподаватель ещё не открыл класс')).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(enterTrialBooth).toHaveBeenCalledTimes(2)
    expect(onEnter).toHaveBeenCalledWith(88)
  })
})
