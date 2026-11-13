// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('./birgeApi.js', async (load) => ({
  ...(await load()),
  getBirgeThread: vi.fn(),
  publishBirgePost: vi.fn(),
  uploadBirgeMedia: vi.fn(),
  setBirgeLike: vi.fn(),
  reportBirgePost: vi.fn(),
}))

import Thread from './Thread.jsx'
import { BirgeApiError, getBirgeThread, publishBirgePost } from './birgeApi.js'

const card = (over = {}) => ({
  id: 101,
  parentId: null,
  author: { id: 42, name: 'Аружан К.', level: 'A2', avatarUrl: null },
  topic: 'GRAMMAR',
  text: 'Present Perfect vs Past Simple?',
  continuations: [],
  media: [],
  createdAt: '2026-11-11T09:40:00+05:00',
  likes: 12,
  liked: false,
  comments: 0,
  status: 'published',
  hiddenReason: null,
  mine: false,
  canReport: true,
  ...over,
})

function mount() {
  const onBack = vi.fn()
  render(
    <I18nProvider>
      <Thread token="T" postId={101} authorName="Айгерім" onBack={onBack} onToast={vi.fn()} onOpenFeedback={vi.fn()} />
    </I18nProvider>,
  )
  return { onBack }
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})
afterEach(cleanup)

describe('ветка', () => {
  it('пост, комментарии с отступом и форма ответа без темы', async () => {
    getBirgeThread.mockResolvedValue({ thread: card({ comments: 1 }), comments: [card({ id: 102, parentId: 101, topic: null, text: 'Ответ Тимура' })] })
    mount()
    expect(await screen.findByText('Ответ Тимура')).toBeTruthy()
    expect(getBirgeThread).toHaveBeenCalledWith('T', 101)
    expect(document.querySelectorAll('.brg-post--cm')).toHaveLength(1)
    expect(screen.getByPlaceholderText('Ответить…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Тема/ })).toBeNull()
  })

  it('нет комментариев — приглашение ответить первым', async () => {
    getBirgeThread.mockResolvedValue({ thread: card(), comments: [] })
    mount()
    expect(await screen.findByText('Пока нет комментариев — будьте первым')).toBeTruthy()
  })

  it('своя непубличная ветка — ответить нельзя, есть подсказка', async () => {
    getBirgeThread.mockResolvedValue({ thread: card({ mine: true, status: 'pending', canReport: false }), comments: [] })
    mount()
    expect(await screen.findByText('Ответить можно будет, когда ветку опубликуют')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Ответить…')).toBeNull()
  })

  it('404 — «Ветка не найдена или недоступна»; «← Все ветки» ведёт назад', async () => {
    getBirgeThread.mockRejectedValue(new BirgeApiError(404, null))
    const { onBack } = mount()
    expect(await screen.findByText('Ветка не найдена или недоступна')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '← Все ветки' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('опубликованный ответ — в конец, счётчик ветки +1', async () => {
    getBirgeThread.mockResolvedValue({ thread: card(), comments: [] })
    publishBirgePost.mockResolvedValue({
      decision: 'published',
      post: card({ id: 103, parentId: 101, topic: null, text: 'Мой ответ', mine: true, canReport: false }),
      risk: 5,
      reasons: [],
      hits: [],
      removedMediaIds: [],
      feedbackId: null,
    })
    mount()
    fireEvent.change(await screen.findByPlaceholderText('Ответить…'), { target: { value: 'Мой ответ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }))
    expect(await screen.findByText('Мой ответ', { selector: '.brg-pt' })).toBeTruthy()
    expect(publishBirgePost).toHaveBeenCalledWith('T', { text: 'Мой ответ', parentId: 101 })
    expect(screen.getByRole('button', { name: 'Комментарии' }).textContent).toBe('1')
  })
})
