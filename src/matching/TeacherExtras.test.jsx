// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getMatchingTeacherExtras: vi.fn(),
  getMatchingTeacherResultPhoto: vi.fn(),
  getMatchingTeacherVideo: vi.fn(),
}))
import * as api from '../api.js'
import TeacherExtras from './TeacherExtras.jsx'

const wrap = () => render(<I18nProvider><TeacherExtras token="t" teacherId={5} /></I18nProvider>)
const extras = (over = {}) => ({
  achievements: 'За год 9 студентов перешли на уровень выше',
  howLessonsGo: 'Структура, домашка, обратная связь',
  resultPhotos: [{ id: 11, caption: 'Было / стало', status: 'APPROVED' }, { id: 12, caption: null, status: 'APPROVED' }],
  video: { present: true, seconds: 42, sizeBytes: 1000, uploadedAt: '2026-10-28T10:00:00' },
  ...over,
})

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  api.getMatchingTeacherResultPhoto.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
  api.getMatchingTeacherVideo.mockResolvedValue(new Blob(['v'], { type: 'video/mp4' }))
})

describe('TeacherExtras — что учитель добавил к резюме', () => {
  it('показывает «как проходят уроки», результаты с фото и кнопку видео; сами файлы видео не качает', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(extras())
    wrap()

    expect((await screen.findByTestId('how-lessons')).textContent).toContain('Структура, домашка')
    expect(screen.getByTestId('results').textContent).toContain('9 студентов')
    await waitFor(() => expect(api.getMatchingTeacherResultPhoto).toHaveBeenCalledTimes(2))
    expect(api.getMatchingTeacherResultPhoto).toHaveBeenCalledWith('t', 5, 11)
    expect(screen.getByAltText('Было / стало')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Смотреть видео' })).toBeTruthy()
    expect(api.getMatchingTeacherVideo).not.toHaveBeenCalled()
  })

  it('видео качается только по нажатию и после этого играет', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(extras({ resultPhotos: [] }))
    const { container } = wrap()

    fireEvent.click(await screen.findByRole('button', { name: 'Смотреть видео' }))

    await waitFor(() => expect(container.querySelector('video')).not.toBeNull())
    expect(api.getMatchingTeacherVideo).toHaveBeenCalledWith('t', 5)
    expect(container.querySelector('video').getAttribute('src')).toBe('blob:x')
  })

  it('видео не открылось — об этом сказано, кнопку можно нажать ещё раз', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(extras({ resultPhotos: [] }))
    api.getMatchingTeacherVideo.mockResolvedValue(null)
    wrap()

    fireEvent.click(await screen.findByRole('button', { name: 'Смотреть видео' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Видео не открылось')
    expect(screen.getByRole('button', { name: 'Смотреть видео' }).disabled).toBe(false)
  })

  it('незаполненных блоков нет: пустой профиль не рисует ни заголовков, ни кнопок', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(extras({ achievements: null, howLessonsGo: null, resultPhotos: [], video: { present: false } }))
    const { container } = wrap()

    await waitFor(() => expect(api.getMatchingTeacherExtras).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('на стенде без ручки (null) блока нет вовсе', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(null)
    const { container } = wrap()

    await waitFor(() => expect(api.getMatchingTeacherExtras).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('фото результатов без текста «О результатах» всё равно показывается под своим заголовком', async () => {
    api.getMatchingTeacherExtras.mockResolvedValue(extras({ achievements: null, howLessonsGo: null, video: { present: false } }))
    wrap()

    expect((await screen.findByTestId('results')).textContent).toContain('Результаты моих учеников')
    expect(screen.queryByTestId('how-lessons')).toBeNull()
    expect(screen.queryByTestId('video')).toBeNull()
  })
})
