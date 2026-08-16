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

function pickFile(container, file) {
  const input = container.querySelector('.hw-upload__input')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
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
})
