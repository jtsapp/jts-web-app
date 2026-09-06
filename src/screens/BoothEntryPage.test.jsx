// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ enterTrialBooth: vi.fn(), getLessonById: vi.fn() }))
vi.mock('./live/audioReport.js', () => ({ unlockBroadcastAudio: vi.fn() }))

import BoothEntryPage from './BoothEntryPage.jsx'
import { enterTrialBooth, getLessonById } from '../api.js'
import { unlockBroadcastAudio } from './live/audioReport.js'

const failWith = (status) => Object.assign(new Error(`http ${status}`), { status })

const renderPage = (props = {}) =>
  render(
    <I18nProvider>
      <BoothEntryPage token="TOK" onEnter={() => {}} {...props} />
    </I18nProvider>
  )

describe('экран класса', () => {
  beforeEach(() => {
    // resetAllMocks, а не clearAllMocks: тот не чистит очередь
    // mockResolvedValueOnce/mockRejectedValueOnce, и остаток из одного теста
    // утекал в следующий, делая порядок тестов значимым (при мутации это уже
    // дало ложное падение не в том тесте). reset сбрасывает и очередь, и
    // реализацию — тесты ниже настраивают её заново сами, ни один не
    // полагается на реализацию, оставшуюся от соседнего теста.
    vi.resetAllMocks()
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

  // Находка 3 финального ревью: «класс закрыт» был тупиком — автоповтора по
  // спеке нет (см. тест выше), но и кнопки не было. Преподаватель мог включить
  // класс через минуту, а посетителю нечего нажать. Ручной повтор — не
  // автоповтор, спеку не нарушает.
  it('класс закрыт — кнопка ручного повтора заводит новую попытку', async () => {
    enterTrialBooth.mockRejectedValueOnce(failWith(403))
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 14, lessonId: 99, resumed: false })
    const onEnter = vi.fn()

    renderPage({ onEnter })
    await act(async () => {})

    expect(screen.getByText('Класс закрыт')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    await act(async () => {})

    expect(enterTrialBooth).toHaveBeenCalledTimes(2)
    expect(onEnter).toHaveBeenCalledWith(99)
  })

  // Ручной повтор — тот же жест, что у enterNow и backToLesson, и уводит тем
  // же путём прямо в урок: без снятия блокировки звука здесь ученику пришлось
  // бы отдельно жать «Включить звук» уже внутри урока.
  it('класс закрыт — кнопка ручного повтора тоже снимает блокировку звука', async () => {
    enterTrialBooth.mockRejectedValueOnce(failWith(403))
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 14, lessonId: 99, resumed: false })

    renderPage()
    await act(async () => {})

    expect(unlockBroadcastAudio).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }))
    await act(async () => {})

    expect(unlockBroadcastAudio).toHaveBeenCalledTimes(1)
  })

  // Кнопка сама по себе не заводит цикл — только явный клик, иначе это уже
  // автоповтор под другим именем, а его спека запрещает.
  it('класс закрыт — без клика по-прежнему ни одного повтора', async () => {
    enterTrialBooth.mockRejectedValue(failWith(403))

    renderPage()
    await act(async () => {})

    expect(screen.getByRole('button', { name: 'Попробовать снова' })).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })

    expect(enterTrialBooth).toHaveBeenCalledTimes(1)
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

  // Правило 2 памяти вкладки (второе ревью): известному lessonId не верят на
  // слово — прежде чем предложить «Вернуться в класс», экран спрашивает
  // бэкенд о статусе занятия. Три ветки этой проверки — три теста ниже.

  // Ветка 1: IN_PROGRESS/PAUSED — сеанс жив, показываем «Вернуться в класс» и
  // никакого /enter. Вышел из урока сам: повторный вход закрыл бы открытый
  // сеанс как забытый и завёл новое занятие — с пустой доской.
  it('известный урок ещё идёт — предлагаем вернуться, без нового входа', async () => {
    getLessonById.mockResolvedValueOnce({ id: 77, status: 'IN_PROGRESS' })
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
    await act(async () => {})

    expect(getLessonById).toHaveBeenCalledWith('TOK', 77)
    expect(screen.getByText('Вы вышли из класса')).toBeTruthy()
    expect(enterTrialBooth).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Вернуться в класс' }))

    expect(onEnter).toHaveBeenCalledWith(77)
    expect(enterTrialBooth).not.toHaveBeenCalled()
  })

  // Тот же живой сеанс, но на паузе — вторая половина условия IN_PROGRESS ||
  // PAUSED. Отдельный тест, а не довесок к предыдущему: мутация, стянувшая
  // проверку к одному ==='IN_PROGRESS', сломала бы именно этот случай.
  it('известный урок на паузе — тоже считается живым', async () => {
    getLessonById.mockResolvedValueOnce({ id: 77, status: 'PAUSED' })

    renderPage({ lessonId: 77 })
    await act(async () => {})

    expect(screen.getByText('Вы вышли из класса')).toBeTruthy()
  })

  // Ветка 2: любой другой статус (COMPLETED и всё, чего нет в списке живых) —
  // сеанс кончился. Находка 1 финального ревью в новом виде: раньше об этом
  // сообщал отдельный проп justFinished из App.jsx, живший только в
  // React-состоянии и терявшийся при перезагрузке (находка второго ревью).
  // Теперь источник правды один — ответ бэкенда на статус самого lessonId.
  it('известный урок уже завершён — ждём нажатия, а не входим сами', async () => {
    getLessonById.mockResolvedValueOnce({ id: 77, status: 'COMPLETED' })
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
    await act(async () => {})

    expect(screen.getByText('Урок завершён')).toBeTruthy()
    expect(enterTrialBooth).not.toHaveBeenCalled()

    // И дальше ничего не меняется само — ни по таймеру, ни как-то ещё.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(enterTrialBooth).not.toHaveBeenCalled()
    expect(onEnter).not.toHaveBeenCalled()
  })

  // Нажатие кнопки — и только оно — заводит новый вход, теперь уже настоящий
  // /enter, а не возврат в тот же (уже дохлый) урок.
  it('урок завершён — кнопка заводит ровно один новый вход', async () => {
    getLessonById.mockResolvedValueOnce({ id: 77, status: 'COMPLETED' })
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 13, lessonId: 88, resumed: false })
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
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
    getLessonById.mockResolvedValueOnce({ id: 77, status: 'COMPLETED' })
    enterTrialBooth.mockRejectedValueOnce(failWith(503))
    enterTrialBooth.mockResolvedValueOnce({ sessionId: 13, lessonId: 88, resumed: false })
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: 'Войти в класс' }))
    await act(async () => {})

    expect(screen.getByText('Преподаватель ещё не открыл класс')).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(enterTrialBooth).toHaveBeenCalledTimes(2)
    expect(onEnter).toHaveBeenCalledWith(88)
  })

  // Ветка 3: запрос статуса не удался — сеть или бэкенд подвели. Спека прямо
  // запрещает входить заново в этом случае (мы бы рисковали убить ещё живой
  // сеанс из-за одной секунды сети), поэтому экран деградирует к «вернуться»,
  // а не к автовходу.
  it('проверка статуса не удалась — не входим заново, показываем «вернуться»', async () => {
    getLessonById.mockRejectedValueOnce(new Error('network down'))
    const onEnter = vi.fn()

    renderPage({ lessonId: 77, onEnter })
    await act(async () => {})

    expect(screen.getByText('Вы вышли из класса')).toBeTruthy()
    expect(enterTrialBooth).not.toHaveBeenCalled()

    // И дальше без клика ничего не заводится само.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(enterTrialBooth).not.toHaveBeenCalled()

    // Кнопка по-прежнему просто возвращает в известный урок — не через /enter.
    fireEvent.click(screen.getByRole('button', { name: 'Вернуться в класс' }))
    expect(onEnter).toHaveBeenCalledWith(77)
    expect(enterTrialBooth).not.toHaveBeenCalled()
  })
})
