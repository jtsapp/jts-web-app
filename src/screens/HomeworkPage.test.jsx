// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const ASSIGNMENT = {
  id: 7,
  title: 'Unit 3 · Present Perfect',
  status: 'ASSIGNED',
  dueDate: '2026-08-22',
  createdByName: 'Адильжан Алимжанов',
  materials: [{ id: 1, fileName: 'task.pdf', url: 'https://files.example/task.pdf' }],
  submissions: [],
}

const withAnswer = {
  ...ASSIGNMENT,
  submissions: [{ id: 9, fileName: 'answer.jpg', url: 'https://files.example/answer.jpg' }],
}

vi.mock('../api.js', () => ({
  // Сайдбар оболочки тянет баланс — без заглушки падает весь экран.
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getMyHomework: vi.fn(async () => [ASSIGNMENT]),
  getHomeworkById: vi.fn(async () => ASSIGNMENT),
  uploadMedia: vi.fn(async () => ({ url: 'https://files.example/answer.jpg', fileId: 'f1' })),
  attachHomeworkAnswer: vi.fn(async () => withAnswer),
  removeHomeworkAnswer: vi.fn(async () => ASSIGNMENT),
  submitHomework: vi.fn(async () => ({ ...withAnswer, status: 'SUBMITTED' })),
  saveHomeworkAnswer: vi.fn(async () => ASSIGNMENT),
  // Задания с живых уроков (назначенные материалы) — по умолчанию их нет.
  getMyMaterialAssignments: vi.fn(async () => []),
  startMaterialAssignment: vi.fn(async () => ({ id: 77 })),
  materialAssignmentRenderUrl: vi.fn((materialId, assignmentId, token, sessionId) =>
    `https://api.example/student/materials/${materialId}/render?assignmentId=${assignmentId}&sessionId=${sessionId}`),
}))

import HomeworkPage from './HomeworkPage.jsx'
import * as api from '../api.js'

function renderPage() {
  return render(
    <I18nProvider>
      <HomeworkPage token="TOK" userName="Сакен" onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>
  )
}

function pickFile(container, ...files) {
  const input = container.querySelector('.hw-upload__input')
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

const file = (name, type) => new File(['x'], name, { type })

describe('HomeworkPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает историю заданий и открывает первое', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-card')).not.toBeNull())
    expect(screen.getAllByText('Unit 3 · Present Perfect').length).toBeGreaterThan(0)
    expect(container.querySelector('.hw-detail__title').textContent).toBe('Unit 3 · Present Perfect')
  })

  // Файл идёт в два шага: сначала в хранилище, потом ссылка — в домашнюю работу.
  it('прикрепляет файл: загрузка в хранилище, затем привязка к заданию', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-upload__input')).not.toBeNull())

    pickFile(container, file('answer.jpg', 'image/jpeg'))

    await waitFor(() => expect(api.attachHomeworkAnswer).toHaveBeenCalled())
    expect(api.uploadMedia).toHaveBeenCalledTimes(1)
    expect(api.attachHomeworkAnswer).toHaveBeenCalledWith('TOK', 7, 'answer.jpg', 'https://files.example/answer.jpg')
    // Ответ сервера подменяет карточку на месте — файл виден сразу.
    await waitFor(() => expect(screen.getByText('answer.jpg')).toBeTruthy())
  })

  // Чужой формат отсекается до сети: гонять .docx в хранилище незачем, бэкенд
  // всё равно откажет при прикреплении.
  it('файл не того формата не уходит в сеть и объясняет причину', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-upload__input')).not.toBeNull())

    pickFile(container, file('решение.docx', 'application/msword'))

    await waitFor(() => expect(container.querySelector('.hw__error')).not.toBeNull())
    expect(api.uploadMedia).not.toHaveBeenCalled()
    expect(container.querySelector('.hw__error').textContent).toMatch(/решение\.docx/)
  })

  // Два файла разом: параллельные запросы затирали друг друга в списке, и
  // ученик видел одно вложение вместо двух.
  it('несколько файлов грузятся по очереди и оба доезжают', async () => {
    const twoFiles = {
      ...ASSIGNMENT,
      submissions: [
        { id: 9, fileName: 'first.png', url: 'https://files.example/first.png' },
        { id: 10, fileName: 'second.pdf', url: 'https://files.example/second.pdf' },
      ],
    }
    api.attachHomeworkAnswer
      .mockResolvedValueOnce({ ...ASSIGNMENT, submissions: [twoFiles.submissions[0]] })
      .mockResolvedValueOnce(twoFiles)

    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-upload__input')).not.toBeNull())

    pickFile(container, file('first.png', 'image/png'), file('second.pdf', 'application/pdf'))

    await waitFor(() => expect(api.attachHomeworkAnswer).toHaveBeenCalledTimes(2))
    // Порядок вызовов — тот же, что и порядок выбора: загрузка последовательная.
    expect(api.attachHomeworkAnswer.mock.calls.map((c) => c[2])).toEqual(['first.png', 'second.pdf'])
    await waitFor(() => expect(screen.getByText('second.pdf')).toBeTruthy())
    expect(screen.getByText('first.png')).toBeTruthy()
  })

  it('чужой формат в пачке отменяет всю загрузку до сети', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-upload__input')).not.toBeNull())

    pickFile(container, file('ok.png', 'image/png'), file('плохой.docx', 'application/msword'))

    await waitFor(() => expect(container.querySelector('.hw__error')).not.toBeNull())
    expect(api.uploadMedia).not.toHaveBeenCalled()
    expect(container.querySelector('.hw__error').textContent).toMatch(/плохой\.docx/)
  })

  it('отправляет работу на проверку и показывает новый статус', async () => {
    api.getMyHomework.mockResolvedValueOnce([withAnswer])
    const { container } = renderPage()
    const submit = await screen.findByRole('button', { name: /отправить на проверку/i })

    fireEvent.click(submit)

    await waitFor(() => expect(api.submitHomework).toHaveBeenCalledWith('TOK', 7))
    await waitFor(() => expect(container.querySelector('.hw-badge--submitted')).not.toBeNull())
  })

  it('ошибку загрузки показывает, а карточку не ломает', async () => {
    api.uploadMedia.mockRejectedValueOnce(new Error('boom'))
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-upload__input')).not.toBeNull())

    pickFile(container, file('answer.png', 'image/png'))

    await waitFor(() => expect(container.querySelector('.hw__error')).not.toBeNull())
    expect(container.querySelector('.hw-detail__title')).not.toBeNull()
  })

  it('когда список не загрузился — честная ошибка вместо пустого экрана', async () => {
    api.getMyHomework.mockRejectedValueOnce(new Error('nope'))
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw__error')).not.toBeNull())
  })

  // --- Задания с живых уроков: материалы, назначенные преподавателем как ДЗ ---

  const MATERIAL = {
    id: 5, materialId: 12, materialTitle: 'Present Perfect · practice test',
    materialType: 'INTERACTIVE_HTML', isGraded: true, fileUrl: 'https://files.example/m.html',
    dueDate: '2026-08-25', teacherScore: null, teacherFeedback: null, gradedAt: null,
  }

  it('назначенный материал виден в общем списке с меткой «Задание с урока»', async () => {
    api.getMyMaterialAssignments.mockResolvedValueOnce([MATERIAL])
    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('Present Perfect · practice test')).toBeTruthy())
    expect(screen.getAllByText('Задание с урока').length).toBeGreaterThan(0)
    // Обычная домашка никуда не делась.
    expect(screen.getAllByText('Unit 3 · Present Perfect').length).toBeGreaterThan(0)
  })

  it('интерактив открывается через сессию: start, затем render в новой вкладке', async () => {
    api.getMyMaterialAssignments.mockResolvedValueOnce([MATERIAL])
    const opened = []
    vi.stubGlobal('open', (url) => { opened.push(url); return null })

    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('Present Perfect · practice test')).toBeTruthy())
    // Открываем карточку материала из списка.
    fireEvent.click(screen.getAllByText('Present Perfect · practice test')[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Открыть задание' }))

    await waitFor(() => expect(api.startMaterialAssignment).toHaveBeenCalledWith('TOK', 5))
    expect(opened).toHaveLength(1)
    expect(opened[0]).toContain('/student/materials/12/render')
    expect(opened[0]).toContain('sessionId=77')
    vi.unstubAllGlobals()
  })

  it('падение списка назначений не ломает обычную домашку', async () => {
    api.getMyMaterialAssignments.mockRejectedValueOnce(new Error('403'))
    const { container } = renderPage()
    await waitFor(() => expect(container.querySelector('.hw-card')).not.toBeNull())
    expect(screen.getAllByText('Unit 3 · Present Perfect').length).toBeGreaterThan(0)
  })
})

// Регрессия на «преподаватель не видит ответов ученика». Ответ уезжает по кнопке
// «Проверить» у каждого задания, но нажимать её ученик не обязан — он решает и
// сдаёт работу. Раньше сдача ничего не досылала: статус «сдано» стоял, а у
// преподавателя было «ученик ещё не отвечал» и оценивать нечего.
describe('HomeworkPage: сдача досылает решённое', () => {
  const CHOICE = { id: 11, question: { id: 'q1', type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' } }
  const GAP = { id: 12, question: { id: 'g1', type: 'gap', gapBefore: 'I', gapAfter: '.', answers: ['like'] } }
  const withExercises = { ...ASSIGNMENT, exercises: [CHOICE, GAP] }

  // Кнопка оживает эффектом из HomeworkExercises (черновик посчитан → onAnswered),
  // а не в первом же кадре. Ждём именно доступности, иначе клик уходит в
  // disabled и тест ловит не поведение, а гонку.
  const жмёмСдать = async () => {
    const button = await screen.findByRole('button', { name: /Отправить на проверку/i })
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)
  }

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    api.getMyHomework.mockResolvedValue([withExercises])
    api.getHomeworkById.mockResolvedValue(withExercises)
    api.getMyMaterialAssignments.mockResolvedValue([])
    api.getBalance.mockResolvedValue({ coins: 0, streak: 0, streakActiveToday: false })
    api.saveHomeworkAnswer.mockResolvedValue(withExercises)
    api.submitHomework.mockResolvedValue({ ...withExercises, status: 'SUBMITTED' })
  })

  it('черновик уходит преподавателю перед сменой статуса', async () => {
    localStorage.setItem('hw-answers:7', JSON.stringify({ q1: 'b', g1: 'like' }))
    renderPage()

    await жмёмСдать()

    await waitFor(() => expect(api.submitHomework).toHaveBeenCalled())
    expect(api.saveHomeworkAnswer).toHaveBeenCalledTimes(2)
    // Вердикт считается тем же грейдингом, что и на уроке: 'b' — мимо, 'like' — в точку.
    expect(api.saveHomeworkAnswer.mock.calls.map((c) => [c[1], c[3], c[4]]))
      .toEqual([[11, 'b', false], [12, 'like', true]])
  })

  it('уже сохранённое на сервере повторно не шлёт', async () => {
    const сохранено = { ...withExercises, exercises: [{ ...CHOICE, studentAnswer: 'a' }, GAP] }
    api.getMyHomework.mockResolvedValue([сохранено])
    localStorage.setItem('hw-answers:7', JSON.stringify({ q1: 'a', g1: 'like' }))
    renderPage()

    await жмёмСдать()

    await waitFor(() => expect(api.submitHomework).toHaveBeenCalled())
    expect(api.saveHomeworkAnswer.mock.calls.map((c) => c[1])).toEqual([12])
  })

  it('упавшая досылка не даёт работе уйти «сданной» без ответов', async () => {
    localStorage.setItem('hw-answers:7', JSON.stringify({ q1: 'a' }))
    api.saveHomeworkAnswer.mockRejectedValue(new Error('offline'))
    renderPage()

    await жмёмСдать()

    await waitFor(() => expect(screen.getByText(/Не удалось отправить/i)).toBeTruthy())
    expect(api.submitHomework).not.toHaveBeenCalled()
  })
})
