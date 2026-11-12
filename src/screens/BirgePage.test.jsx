// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Оболочка кабинета (меню, колокольчик) — своими тестами; здесь важно, что экран отдаёт ей свой пункт меню.
vi.mock('../components/LearningLayout.jsx', () => ({
  default: ({ children, active, userName }) => (
    <div data-active={active} data-user={userName}>
      {children}
    </div>
  ),
}))
vi.mock('../birge/birgeApi.js', async (load) => ({
  ...(await load()),
  listBirgePosts: vi.fn(),
  getBirgeThread: vi.fn(),
  publishBirgePost: vi.fn(),
  uploadBirgeMedia: vi.fn(),
  setBirgeLike: vi.fn(),
  reportBirgePost: vi.fn(),
}))

import BirgePage from './BirgePage.jsx'
import { BirgeApiError, getBirgeThread, listBirgePosts, publishBirgePost } from '../birge/birgeApi.js'

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

const page = (props = {}, onNav = vi.fn()) => (
  <I18nProvider>
    <BirgePage token="T" userName="Айгерім" userLevel="A1" onNav={onNav} onProfile={() => {}} {...props} />
  </I18nProvider>
)
const postParam = () => new URLSearchParams(window.location.search).get('post')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  window.history.replaceState(null, '', '/?screen=birge')
  listBirgePosts.mockResolvedValue({ items: [card()], nextCursor: null })
  getBirgeThread.mockResolvedValue({
    thread: card(),
    comments: [card({ id: 102, parentId: 101, topic: null, text: 'Past Simple — когда есть конкретное время.' })],
  })
})
afterEach(cleanup)

describe('экран Birge', () => {
  it('шапка раздела, пункт меню, правила', async () => {
    const { container } = render(page())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Just to Study Birge')
    expect(screen.getByText('Учимся вместе — сообщество студентов JTS')).toBeTruthy()
    expect(container.firstChild.dataset.active).toBe('birge')
    expect(await screen.findByText('Present Perfect vs Past Simple?')).toBeTruthy()
    expect(screen.getAllByText('Правила сообщества').length).toBe(2)
  })

  it('бэкенд без раздела (404) — «Раздел скоро откроется», формы нет', async () => {
    listBirgePosts.mockRejectedValue(new BirgeApiError(404, { message: 'Not Found' }))
    render(page())
    expect(await screen.findByText('Раздел скоро откроется')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Что нового?')).toBeNull()
  })

  it('из ленты — в ветку и обратно; открытая ветка держится в ?post=', async () => {
    render(page())
    fireEvent.click(await screen.findByRole('button', { name: 'Комментарии' }))
    expect(await screen.findByText('Past Simple — когда есть конкретное время.')).toBeTruthy()
    expect(getBirgeThread).toHaveBeenCalledWith('T', 101)
    expect(postParam()).toBe('101')
    fireEvent.click(screen.getByRole('button', { name: '← Все ветки' }))
    expect(await screen.findByPlaceholderText('Что нового?')).toBeTruthy()
    expect(postParam()).toBeNull()
  })

  it('цель из уведомления открывает ветку сразу; новая цель — другую', async () => {
    const { rerender } = render(page({ target: { postId: 101, at: 1 } }))
    expect(await screen.findByText('Past Simple — когда есть конкретное время.')).toBeTruthy()
    expect(listBirgePosts).not.toHaveBeenCalled()
    getBirgeThread.mockResolvedValue({ thread: card({ id: 300, text: 'Другая ветка' }), comments: [] })
    rerender(page({ target: { postId: 300, at: 2 } }))
    expect(await screen.findByText('Другая ветка')).toBeTruthy()
    expect(postParam()).toBe('300')
  })

  it('пункт меню при открытой ветке возвращает в ленту', async () => {
    const { rerender } = render(page({ target: { postId: 101, at: 1 } }))
    await screen.findByText('Past Simple — когда есть конкретное время.')
    rerender(page({ target: { postId: null, at: 2 } }))
    expect(await screen.findByPlaceholderText('Что нового?')).toBeTruthy()
  })

  it('уход с экрана снимает ?post=', async () => {
    const { unmount } = render(page({ target: { postId: 101, at: 1 } }))
    await screen.findByText('Past Simple — когда есть конкретное время.')
    unmount()
    expect(postParam()).toBeNull()
  })

  it('«Открыть обращение» ведёт в Feedback с id обращения', async () => {
    publishBirgePost.mockResolvedValue({
      decision: 'feedback',
      post: null,
      risk: 78,
      reasons: [{ code: 'PLATFORM_COMPLAINT', score: 78 }],
      hits: [],
      removedMediaIds: [],
      feedbackId: 55,
    })
    const onNav = vi.fn()
    render(page({}, onNav))
    fireEvent.change(await screen.findByPlaceholderText('Что нового?'), { target: { value: 'Это развод, верните деньги' } })
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Открыть обращение' }))
    expect(onNav).toHaveBeenCalledWith('feedback', { feedbackId: 55 })
  })
})
