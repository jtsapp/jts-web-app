// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import FeedbackCenter from './FeedbackCenter.jsx'
import * as api from '../api.js'
const language = vi.hoisted(() => ({ value: 'ru' }))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: language.value }) }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children, active, userName }) => <div data-active={active} data-user={userName}>{children}</div> }))
vi.mock('../api.js', () => ({ getCabinetFeedback: vi.fn(), getCabinetFeedbackMessages: vi.fn(), getCabinetFeedbackTargets: vi.fn(), getCabinetFeedbackHistory: vi.fn(), replyCabinetFeedback: vi.fn(), submitCabinetFeedback: vi.fn(), uploadCabinetFeedbackFile: vi.fn() }))
const teacher = { id: 9, name: 'Teacher Name' }
const manager = { id: 42, name: 'Manager Name' }
const item = (id = 17) => ({ id, feedbackType: 'PLATFORM', category: 'Другое', status: 'Новая', createdAt: '2026-10-27T10:00:00', body: `Original ${id}` })
const mount = () => render(<FeedbackCenter token="token" userName="Student Name" userLevel="A2" onNav={() => {}} onProfile={() => {}} onBack={() => {}} />)
const open = async (name = 'Хороший отзыв о преподавателе') => {
  fireEvent.click(screen.getByRole('button', { name, exact: true }))
  await waitFor(() => expect(screen.queryByText('Загружаем…')).toBeNull())
  return screen.getByRole('form', { name: 'Новое обращение' })
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
afterEach(cleanup)
beforeEach(() => {
  vi.resetAllMocks(); language.value = 'ru'
  api.getCabinetFeedback.mockResolvedValue([])
  api.getCabinetFeedbackTargets.mockResolvedValue({ targets: [teacher], currentTeacher: teacher, currentManager: manager, managers: [manager] })
  api.getCabinetFeedbackMessages.mockResolvedValue([])
  api.getCabinetFeedbackHistory.mockResolvedValue([])
  api.submitCabinetFeedback.mockResolvedValue(item())
  api.replyCabinetFeedback.mockResolvedValue({ id: 99, body: 'Reply body', createdAt: '2026-10-27T12:00:00', authorName: 'Student Name' })
  api.uploadCabinetFeedbackFile.mockResolvedValue({ url: 'https://files.justtostudy.kz/screenshot.png' })
})
describe('Student Feedback prototype', () => {
  it('starts with four cards and no form or artificial empty inbox', async () => {
    const { container } = mount()
    await waitFor(() => expect(screen.queryByText('Загружаем…')).toBeNull())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Feedback')
    expect(container.querySelectorAll('.fc__type').length).toBe(4)
    expect(screen.queryByRole('form')).toBeNull(); expect(screen.queryByText('Мои обращения')).toBeNull()
    expect(container.firstChild.dataset.active).toBe('feedback'); expect(container.firstChild.dataset.user).toBe('Student Name')
  })
  it.each([
    ['Хороший отзыв о преподавателе', 'GOOD_REVIEW', 9, 'Хороший урок'],
    ['Жалоба на преподавателя', 'TEACHER_COMPLAINT', 9, 'Другое'],
    ['Жалоба на менеджера', 'MANAGER_COMPLAINT', 42, 'Другое'],
    ['Жалоба на платформу', 'PLATFORM', null, 'Ошибка сайта или приложения'],
  ])('routes %s with the expected target and API type', async (label, feedbackType, targetUserId, category) => {
    mount(); const form = await open(label)
    if (targetUserId === 9) expect(screen.getByText('Teacher Name')).toBeTruthy()
    if (targetUserId === 42) expect(screen.getByText('Manager Name')).toBeTruthy()
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: '  Текст обращения  ' } }); fireEvent.submit(form)
    await waitFor(() => expect(api.submitCabinetFeedback).toHaveBeenCalledWith('token', { feedbackType, targetUserId, category, body: 'Текст обращения', attachmentsJson: [] }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Новое обращение' })).toBeNull())
  })
  it('shows positive reviews as delivered while keeping server statuses unchanged', async () => {
    api.getCabinetFeedback.mockResolvedValue([{ ...item(), feedbackType: 'GOOD_REVIEW', status: 'Решена' }])
    mount(); expect(await screen.findByText('Доставлено')).toBeTruthy()
    expect(screen.queryByText('Решено')).toBeNull()
  })
  it('offers only associated teachers and defaults to the current one', async () => {
    api.getCabinetFeedbackTargets.mockResolvedValue({ targets: [teacher, { id: 10, name: 'Previous Teacher' }], currentTeacher: teacher })
    mount(); const form = await open(); const select = within(form).getByLabelText('Преподаватель')
    expect(select.value).toBe('9'); fireEvent.change(select, { target: { value: '10' } })
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Спасибо' } }); fireEvent.submit(form)
    await waitFor(() => expect(api.submitCabinetFeedback.mock.calls[0][1].targetUserId).toBe(10))
  })
  it('disables teacher submission without a teacher but allows a platform complaint', async () => {
    api.getCabinetFeedbackTargets.mockResolvedValue({ targets: [] }); mount(); let form = await open()
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Спасибо' } })
    expect(within(form).getByRole('button', { name: 'Отправить' }).disabled).toBe(true)
    form = await open('Жалоба на платформу'); fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Проблема' } })
    expect(within(form).getByRole('button', { name: 'Отправить' }).disabled).toBe(false)
  })
  it('keeps a failed draft and prevents duplicate submission', async () => {
    api.submitCabinetFeedback.mockRejectedValueOnce({ serverMessage: 'Напишите обращение (до 2000 символов)' })
    mount(); const form = await open(); const textbox = within(form).getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'Текст не теряется' } }); fireEvent.submit(form)
    await screen.findByRole('alert'); expect(textbox.value).toBe('Текст не теряется')
    const pending = deferred(); api.submitCabinetFeedback.mockReturnValueOnce(pending.promise)
    fireEvent.submit(form); fireEvent.submit(form); expect(api.submitCabinetFeedback).toHaveBeenCalledTimes(2)
    pending.resolve(item()); await waitFor(() => expect(screen.queryByRole('form', { name: 'Новое обращение' })).toBeNull())
  })
  it('does not restore an unsent draft when conversation GET fails after a successful POST', async () => {
    api.getCabinetFeedbackMessages.mockRejectedValue(new Error('offline')); mount(); const form = await open('Жалоба на платформу')
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Problem' } }); fireEvent.submit(form)
    await screen.findByText('Не удалось загрузить переписку.')
    expect(api.submitCabinetFeedback).toHaveBeenCalledTimes(1); expect(screen.queryByRole('form', { name: 'Новое обращение' })).toBeNull()
    expect(screen.getByText('Обращение отправлено по назначению.')).toBeTruthy()
  })
  it('loads list and targets independently and retries failed targets', async () => {
    api.getCabinetFeedbackTargets.mockRejectedValueOnce(new Error('offline')); api.getCabinetFeedback.mockResolvedValue([item()])
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Хороший отзыв о преподавателе' }))
    await screen.findByText('Не удалось загрузить преподавателей.'); expect(screen.getByRole('button', { name: /Original 17/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' })); await screen.findByText('Teacher Name')
  })
  it('keeps attachments for a new case separate from reply attachments', async () => {
    api.getCabinetFeedback.mockResolvedValue([item()]); const { container } = mount(); const form = await open('Жалоба на платформу')
    const file = new File(['image'], 'screenshot.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText('Скриншот или файл'), { target: { files: [file] } })
    await screen.findByRole('link', { name: 'screenshot.png' })
    fireEvent.click(screen.getByRole('button', { name: /Original 17/ }))
    await waitFor(() => expect(container.querySelector('.fc__reply')).toBeTruthy())
    fireEvent.change(within(container.querySelector('.fc__reply')).getByRole('textbox'), { target: { value: 'Reply body' } })
    fireEvent.submit(container.querySelector('.fc__reply'))
    await waitFor(() => expect(api.replyCabinetFeedback).toHaveBeenCalledWith('token', 17, { body: 'Reply body', attachmentsJson: [] }))
    expect(within(form).getByRole('link', { name: 'screenshot.png' })).toBeTruthy()
  })
  it('rejects invalid and oversized files before uploading', async () => {
    mount(); const form = await open('Жалоба на платформу'); const large = new File(['x'], 'large.png')
    Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(within(form).getByLabelText('Скриншот или файл'), { target: { files: [new File(['script'], 'run.html'), large] } })
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(api.uploadCabinetFeedbackFile).not.toHaveBeenCalled()
  })
  it('keeps a newly created case when an older list request finishes late', async () => {
    const pending = deferred(); api.getCabinetFeedback.mockReturnValueOnce(pending.promise)
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Жалоба на платформу' }))
    const form = screen.getByRole('form', { name: 'Новое обращение' })
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'New problem' } }); fireEvent.submit(form)
    await screen.findByRole('button', { name: /Original 17/ })
    pending.resolve([])
    await waitFor(() => expect(screen.getByRole('button', { name: /Original 17/ })).toBeTruthy())
  })
  it('ignores stale responses after switching cases', async () => {
    const pending = deferred(); api.getCabinetFeedback.mockResolvedValue([item(17), item(18)])
    api.getCabinetFeedbackMessages.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([{ id: 2, body: 'Current conversation' }])
    mount(); fireEvent.click(await screen.findByRole('button', { name: /Original 17/ })); fireEvent.click(screen.getByRole('button', { name: /Original 18/ }))
    await screen.findByText('Current conversation'); pending.resolve([{ id: 1, body: 'Old conversation' }])
    await waitFor(() => expect(screen.queryByText('Old conversation')).toBeNull())
  })
  it('renders translated decisions with original comments and only safe attachment links', async () => {
    language.value = 'kk'; api.getCabinetFeedback.mockResolvedValue([{ ...item(), status: 'Решена', decisionComment: 'Решение написано пользователем' }])
    api.getCabinetFeedbackMessages.mockResolvedValue([{ id: 1, body: 'Original body', attachmentsJson: '["https://files.justtostudy.kz/image.png", "javascript:alert(1)"]' }])
    api.getCabinetFeedbackHistory.mockResolvedValue([{ id: 2, fromStatus: 'На рассмотрении', toStatus: 'Решена', createdAt: '2026-10-26T10:00:00', comment: 'Проверили запись урока' }])
    mount(); fireEvent.click(await screen.findByRole('button', { name: /Original 17/ }))
    expect(await screen.findByText('Тарих және шешімдер')).toBeTruthy(); expect(screen.getByText('Решение написано пользователем')).toBeTruthy()
    fireEvent.click(screen.getByText('Тарих және шешімдер')); expect(screen.getByText('Проверили запись урока')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
  it.each([['ru', 'Хороший отзыв о преподавателе', 'Что понравилось?'], ['kk', 'Оқытушы туралы жақсы пікір', 'Сізге не ұнады?'], ['en', 'Positive review of a teacher', 'What did you like?']])('translates the form to %s', async (lang, card, question) => {
    language.value = lang; mount(); fireEvent.click(screen.getByRole('button', { name: card }))
    expect(await screen.findByText('Teacher Name')).toBeTruthy(); expect(screen.getByRole('textbox').closest('label').textContent).toContain(question)
  })
})
