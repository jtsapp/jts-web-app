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
})
