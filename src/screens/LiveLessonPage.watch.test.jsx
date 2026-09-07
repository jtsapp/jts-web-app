// @vitest-environment jsdom
//
// Проводка «учитель смотрит ваш экран» на самом экране урока, а не в хуке.
//
// Хук useWatchAnnounce покрыт отдельно, но между ним и жизнью экрана лежит одна
// строка — `watchTarget`, — и именно она дважды была источником ошибки: сперва
// метка не появлялась вовсе (отправка висела на клике по кнопке, которую в
// уроке один на один нажимать не на кого), потом висела после ухода на «Доску».
// Проверяем ровно её: кому и когда экран сообщает о просмотре.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const sendWatch = vi.fn()
const sendCall = vi.fn()
// Обработчики входящих событий сокета: через них тест играет роль бэкенда.
let socketHandlers = {}

vi.mock('../api.js', () => ({
  getLessonById: vi.fn(async () => ({
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
  })),
  getLessonSections: vi.fn(async () => []),
  getLessonMessages: vi.fn(async () => []),
  sendLessonMessage: vi.fn(async () => ({})),
  setLessonMeetingUrl: vi.fn(async () => ({})),
  getLessonMaterialProgress: vi.fn(async () => ({})),
  saveLessonMaterialProgress: vi.fn(async () => ({})),
  startLiveLesson: vi.fn(async () => ({})),
  pauseLiveLesson: vi.fn(async () => ({})),
  resumeLiveLesson: vi.fn(async () => ({})),
  completeLiveLesson: vi.fn(async () => ({})),
  searchDictionary: vi.fn(async () => []),
}))

// Присутствие: преподаватель и ученик оба в классе — иначе объявление ждёт
// возвращения ученика (см. useWatchAnnounce).
vi.mock('./live/useLessonPresence.js', () => ({
  useLessonPresence: () => ({ roster: [{ userId: 7 }, { userId: 10 }], connected: true }),
}))

vi.mock('./live/useLessonLiveSocket.js', () => ({
  useLessonLiveSocket: (lessonId, token, selfUserId, opts) => ({
    connected: true,
    sendFocus: vi.fn(),
    sendMirror: vi.fn(),
    sendPresent: vi.fn(),
    sendStepProgress: vi.fn(),
    sendAudio: vi.fn(),
    sendCall,
    sendWatch,
    ...((socketHandlers = opts || {}), {}),
  }),
}))

vi.mock('./workspace/loadCatalogLesson.js', () => ({ loadCatalogLesson: vi.fn(async () => null) }))

// Доска рисуется на fabric.js поверх настоящего canvas — в jsdom он пустой и
// библиотека падает на инициализации. Нам от вкладки нужен только сам переход.
vi.mock('./live/LiveBoard.jsx', () => ({ default: () => <div data-testid="board" /> }))

// Токен преподавателя: роль и id читаются из полезной нагрузки JWT.
function tokenFor(role, id) {
  const payload = btoa(JSON.stringify({ role, userId: id, sub: '+77010000000' }))
  return `x.${payload}.y`
}

async function renderLesson(role = 'TEACHER', id = 7) {
  const { default: LiveLessonPage } = await import('./LiveLessonPage.jsx')
  return render(
    <I18nProvider>
      <LiveLessonPage lessonId={5} token={tokenFor(role, id)} userName="Тест" onBack={() => {}} />
    </I18nProvider>
  )
}

describe('LiveLessonPage — кому уходит «смотрю ваш экран»', () => {
  beforeEach(() => { sendWatch.mockClear() })

  // Ученик выбирается автоматически первым в списке, и его работа сразу видна в
  // центре экрана — объявление обязано уйти без единого клика.
  it('преподаватель открыл урок — просмотр объявлен сам', async () => {
    await renderLesson()
    await waitFor(() => expect(sendWatch).toHaveBeenCalledWith(10, true))
  })

  // На «Доске» преподаватель не читает ничего, и метка там висела бы неправдой.
  it('уход на «Доску» снимает метку, возврат — возвращает', async () => {
    await renderLesson()
    await waitFor(() => expect(sendWatch).toHaveBeenCalledWith(10, true))
    sendWatch.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Доска' }))
    await waitFor(() => expect(sendWatch).toHaveBeenCalledWith(10, false))
    sendWatch.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Урок' }))
    await waitFor(() => expect(sendWatch).toHaveBeenCalledWith(10, true))
  })

  // Метки жили внутри полотна с заданиями, а оно рисуется только у урока,
  // разобранного шагами: на файловом материале (и вообще везде, где полотна
  // нет) событие приходило, состояние ставилось, а на экране не менялось
  // ничего — при том что зеркало экрана работает как раз на файловом.
  it('вызов и просмотр видны ученику там, где полотна с заданиями нет', async () => {
    await renderLesson('STUDENT', 10)
    await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
    expect(document.querySelector('.lv-sheet')).toBeNull()

    await act(async () => { socketHandlers.onCall({ senderName: 'Адильжан' }) })
    expect(screen.getByText('Вас вызвали')).toBeTruthy()

    await act(async () => { socketHandlers.onWatch({ senderName: 'Адильжан', watching: true }) })
    expect(screen.getByText('Учитель смотрит ваш экран')).toBeTruthy()

    // Вызов снимает сам ученик, метку просмотра — преподаватель.
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(screen.queryByText('Вас вызвали')).toBeNull()

    await act(async () => { socketHandlers.onWatch({ senderName: 'Адильжан', watching: false }) })
    expect(screen.queryByText('Учитель смотрит ваш экран')).toBeNull()
  })

  // У ученика своего просмотра нет: канал учительский и на бэкенде закрыт ролью.
  it('ученик не объявляет ничего', async () => {
    await renderLesson('STUDENT', 10)
    await waitFor(() => expect(screen.getByText('Present Perfect')).toBeTruthy())
    expect(sendWatch).not.toHaveBeenCalled()
  })
})

/**
 * Слово, положенное преподавателем в словарь ученика.
 *
 * Обработчик этого события стоял в объекте ДВАЖДЫ: сперва звук без метки, потом
 * метка. Побеждал тот, что ниже по файлу, — то есть поведение зависело от
 * порядка строк, и любая перестановка молча вернула бы ученику один звук без
 * объяснения, что ему записали.
 */
describe('LiveLessonPage — слово в словаре ученика', () => {
  it('ученик видит слово и перевод, а не только слышит звук', async () => {
    await renderLesson('STUDENT', 10)
    await waitFor(() => expect(socketHandlers.onVocabSaved).toBeTypeOf('function'))

    await act(async () => {
      socketHandlers.onVocabSaved({ word: 'fall off a bike', translation: 'падение с велосипеда' })
    })

    expect(await screen.findByText(/fall off a bike — падение с велосипеда/)).toBeTruthy()
  })

  it('без перевода показывает одно слово, а не пустое тире', async () => {
    // Старый бэкенд перевод не шлёт, и слово без перевода тоже бывает.
    await renderLesson('STUDENT', 10)
    await waitFor(() => expect(socketHandlers.onVocabSaved).toBeTypeOf('function'))

    await act(async () => { socketHandlers.onVocabSaved({ word: 'holiday' }) })

    expect(await screen.findByText(/«holiday» — в вашем словаре/)).toBeTruthy()
  })

  it('преподавателю метку не показывает — слово клали не ему', async () => {
    await renderLesson('TEACHER', 7)
    await waitFor(() => expect(socketHandlers.onVocabSaved).toBeTypeOf('function'))

    await act(async () => { socketHandlers.onVocabSaved({ word: 'holiday', translation: 'отпуск' }) })

    expect(screen.queryByText(/holiday/)).toBeNull()
  })
})
