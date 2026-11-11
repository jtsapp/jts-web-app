// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import PostCard from './PostCard.jsx'

afterEach(cleanup)

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

function mount(post, props = {}) {
  const handlers = { onOpen: vi.fn(), onLike: vi.fn(), onReport: vi.fn() }
  render(
    <I18nProvider>
      <PostCard post={post} {...handlers} {...props} />
    </I18nProvider>,
  )
  return handlers
}

describe('карточка поста', () => {
  it('автор, уровень, тема, текст, фото и продолжения цепочкой', () => {
    mount(card({ continuations: ['Ещё вопрос'], media: [{ id: 7, url: 'https://x/a.jpg', width: 1600, height: 1200 }] }))
    expect(screen.getByText('Аружан К.')).toBeTruthy()
    expect(screen.getByText('A2')).toBeTruthy()
    expect(screen.getByText('Грамматика')).toBeTruthy()
    expect(screen.getByText('Present Perfect vs Past Simple?')).toBeTruthy()
    expect(screen.getByText('Ещё вопрос').className).toBe('brg-more')
    expect(screen.getByAltText('Фото 1').getAttribute('src')).toBe('https://x/a.jpg')
    expect(document.querySelector('.brg-av').textContent).toBe('А')
  })

  it('аватар из профиля — картинкой; без уровня — без плашки', () => {
    mount(card({ author: { id: 1, name: 'Дана С.', level: null, avatarUrl: 'https://x/ava.jpg' } }))
    expect(document.querySelector('img.brg-av').getAttribute('src')).toBe('https://x/ava.jpg')
    expect(document.querySelector('.brg-lvl')).toBeNull()
  })

  it.each([
    ['pending', null, 'На проверке у модератора'],
    ['tomorrow', null, 'На проверке у модератора'],
    ['rejected', null, 'Отклонено'],
    ['hidden', 'reports', 'Скрыто'],
    ['hidden', 'manager', 'Скрыто'],
  ])('свой %s (%s) — бейдж «%s»', (status, hiddenReason, label) => {
    mount(card({ mine: true, canReport: false, status, hiddenReason }))
    expect(document.querySelector('.brg-badge').textContent).toBe(label)
  })

  it('если сервер всё же отдал hidden/overflow (обычно автору приходит published) — без бейджа', () => {
    mount(card({ mine: true, canReport: false, status: 'hidden', hiddenReason: 'overflow' }))
    expect(document.querySelector('.brg-badge')).toBeNull()
  })

  it('лайк, комментарии и жалоба зовут свои обработчики', () => {
    const post = card()
    const { onLike, onOpen, onReport } = mount(post)
    expect(screen.getByRole('button', { name: 'Нравится' }).textContent).toBe('12')
    fireEvent.click(screen.getByRole('button', { name: 'Нравится' }))
    fireEvent.click(screen.getByRole('button', { name: 'Комментарии' }))
    fireEvent.click(screen.getByRole('button', { name: 'Пожаловаться' }))
    expect(onLike).toHaveBeenCalledWith(post)
    expect(onOpen).toHaveBeenCalledWith(post)
    expect(onReport).toHaveBeenCalledWith(post)
  })

  it('на свой — не пожаловаться; неопубликованный — не лайкнуть', () => {
    mount(card({ mine: true, status: 'pending', canReport: false }))
    expect(screen.queryByRole('button', { name: 'Пожаловаться' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Нравится' }).disabled).toBe(true)
  })

  it('комментарий — без темы и счётчика ответов, жалоба есть', () => {
    mount(card({ parentId: 101, topic: null }), { comment: true })
    expect(screen.queryByRole('button', { name: 'Комментарии' })).toBeNull()
    expect(document.querySelector('.brg-post--cm')).not.toBeNull()
    expect(document.querySelector('.brg-topic')).toBeNull()
    expect(screen.getByRole('button', { name: 'Пожаловаться' })).toBeTruthy()
  })
})
