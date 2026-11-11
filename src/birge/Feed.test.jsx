// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('./birgeApi.js', async (load) => ({
  ...(await load()),
  listBirgePosts: vi.fn(),
  publishBirgePost: vi.fn(),
  uploadBirgeMedia: vi.fn(),
  setBirgeLike: vi.fn(),
  reportBirgePost: vi.fn(),
}))

import Feed from './Feed.jsx'
import { BirgeApiError, listBirgePosts, publishBirgePost } from './birgeApi.js'

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
  comments: 2,
  status: 'published',
  hiddenReason: null,
  mine: false,
  canReport: true,
  ...over,
})

function mount() {
  const handlers = { onOpen: vi.fn(), onMissing: vi.fn(), onToast: vi.fn(), onOpenFeedback: vi.fn() }
  render(
    <I18nProvider>
      <Feed token="T" authorName="Айгерім" {...handlers} />
    </I18nProvider>,
  )
  return handlers
}
const filters = () => screen.getByRole('group', { name: 'Темы' })

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  listBirgePosts.mockResolvedValue({ items: [card()], nextCursor: null })
})
afterEach(cleanup)

describe('лента Birge', () => {
  it('после загрузки — форма, фильтр тем и карточки', async () => {
    mount()
    expect(await screen.findByText('Present Perfect vs Past Simple?')).toBeTruthy()
    expect(screen.getByPlaceholderText('Что нового?')).toBeTruthy()
    expect(listBirgePosts).toHaveBeenCalledWith('T', { topic: null })
    expect(within(filters()).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Все',
      'Грамматика',
      'Speaking',
      'Словарь',
      'Мотивация',
      'Вопрос',
    ])
  })

  it('тема фильтрует запросом, «Все» снимает фильтр; черновик формы не теряется', async () => {
    mount()
    await screen.findByText('Present Perfect vs Past Simple?')
    fireEvent.change(screen.getByPlaceholderText('Что нового?'), { target: { value: 'Черновик' } })
    listBirgePosts.mockResolvedValue({ items: [], nextCursor: null })
    fireEvent.click(within(filters()).getByRole('button', { name: 'Грамматика' }))
    expect(await screen.findByText('В этой теме пока пусто')).toBeTruthy()
    expect(listBirgePosts).toHaveBeenLastCalledWith('T', { topic: 'GRAMMAR' })
    expect(screen.getByPlaceholderText('Что нового?').value).toBe('Черновик')
    fireEvent.click(within(filters()).getByRole('button', { name: 'Все' }))
    await waitFor(() => expect(listBirgePosts).toHaveBeenLastCalledWith('T', { topic: null }))
  })

  it('404 первой страницы — onMissing, формы нет', async () => {
    listBirgePosts.mockRejectedValue(new BirgeApiError(404, null))
    const { onMissing } = mount()
    await waitFor(() => expect(onMissing).toHaveBeenCalled())
    expect(screen.queryByPlaceholderText('Что нового?')).toBeNull()
  })

  it('сбой — сообщение и «Повторить»', async () => {
    listBirgePosts.mockRejectedValueOnce(new BirgeApiError(500, null))
    mount()
    expect(await screen.findByText(/Не удалось загрузить ленту/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Present Perfect vs Past Simple?')).toBeTruthy()
  })

  it('подгрузка по курсору — «Показать ещё», без повторов', async () => {
    listBirgePosts
      .mockResolvedValueOnce({ items: [card()], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [card(), card({ id: 102, text: 'Вторая ветка' })], nextCursor: null })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ещё' }))
    expect(await screen.findByText('Вторая ветка')).toBeTruthy()
    expect(listBirgePosts).toHaveBeenLastCalledWith('T', { topic: null, cursor: 'c1' })
    expect(screen.getAllByText('Present Perfect vs Past Simple?')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).toBeNull()
  })

  it('свой новый пост — сверху ленты с бейджем', async () => {
    publishBirgePost.mockResolvedValue({
      decision: 'pending',
      post: card({ id: 300, text: 'Мой вопрос', topic: 'QUESTION', mine: true, status: 'pending', canReport: false, likes: 0, comments: 0 }),
      risk: 48,
      reasons: [{ code: 'SOFT_CRITICISM', score: 48 }],
      hits: [],
      removedMediaIds: [],
      feedbackId: null,
    })
    mount()
    await screen.findByText('Present Perfect vs Past Simple?')
    fireEvent.change(screen.getByPlaceholderText('Что нового?'), { target: { value: 'Мой вопрос' } })
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }))
    await waitFor(() => expect(document.querySelector('.brg-feed .brg-post').textContent).toContain('Мой вопрос'))
    expect(within(document.querySelector('.brg-feed .brg-post')).getByText('На проверке у модератора')).toBeTruthy()
  })

  it('«Комментарии» открывают ветку', async () => {
    const { onOpen } = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Комментарии' }))
    expect(onOpen).toHaveBeenCalledWith(101)
  })
})
