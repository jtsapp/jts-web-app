// @vitest-environment jsdom
import { act, render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudentNewsPage from './StudentNewsPage.jsx'
import StudentNewsPopup from './StudentNewsPopup.jsx'
import NewsCard, { studentNewsLink } from './NewsCard.jsx'
import { getStudentNews, getStudentNewsPopup, reactToStudentNews } from '../api.js'
import { menuItems } from '../lib/navSections.js'
import { notificationTarget } from '../lib/studentDeepLink.js'

const language = vi.hoisted(() => ({ value: 'ru' }))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: language.value }) }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../api.js', () => ({ getStudentNews: vi.fn(), getStudentNewsPopup: vi.fn(), reactToStudentNews: vi.fn() }))
const post = (extra = {}) => ({ id: 2, targetRole: 'STUDENT', type: 'update', title: 'Студенческая новость', body: 'Для студентов',
  titleEn: 'Student news', bodyEn: 'For students', mascot: 'run', theme: 'clouds', popup: true, seen: false, ...extra })

beforeEach(() => {
  vi.resetAllMocks(); language.value = 'ru'
  getStudentNews.mockResolvedValue([post(), post({ id: 1, targetRole: 'TEACHER', title: 'Только преподавателям' })])
  getStudentNewsPopup.mockResolvedValue([post()])
  reactToStudentNews.mockImplementation(async (_token, id, kind, extra) => post({ id, seen: true, acked: kind === 'ack', myVote: extra?.vote }))
})
afterEach(cleanup)

describe('student announcements', () => {
  it('shows only student posts and saves reactions without an extra seen request', async () => {
    render(<StudentNewsPage token="student" />)
    expect(await screen.findByText('Студенческая новость')).toBeTruthy()
    expect(screen.queryByText('Только преподавателям')).toBeNull()
    expect(screen.queryByText('rocket_launch')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '👍 0' }))
    await waitFor(() => expect(reactToStudentNews).toHaveBeenCalledWith('student', 2, 'react', { reaction: '👍' }))
    expect(reactToStudentNews).toHaveBeenCalledTimes(1)
  })

  it('offers retry after a feed error', async () => {
    getStudentNews.mockRejectedValueOnce(new Error('offline'))
    render(<StudentNewsPage token="student" />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Студенческая новость')).toBeTruthy()
  })

  it('marks a dismissed popup as seen and opens the complete feed', async () => {
    const onNav = vi.fn()
    getStudentNewsPopup.mockResolvedValue([post(), post({ id: 3 })])
    render(<StudentNewsPopup token="student" onNav={onNav} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('2 из 2')).toBeTruthy())
    expect(reactToStudentNews).toHaveBeenCalledWith('student', 2, 'seen', {})
    fireEvent.click(screen.getByRole('button', { name: 'Все объявления' }))
    await waitFor(() => expect(onNav).toHaveBeenCalledWith('whats-new'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps a failed dismissal open and prevents duplicate requests while saving', async () => {
    reactToStudentNews.mockRejectedValueOnce(new Error('offline'))
    render(<StudentNewsPopup token="student" onNav={vi.fn()} />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Закрыть', exact: true }))[0])
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    let resolve
    reactToStudentNews.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const buttons = screen.getAllByRole('button', { name: 'Закрыть', exact: true })
    fireEvent.click(buttons[0]); fireEvent.click(buttons[1])
    expect(reactToStudentNews).toHaveBeenCalledTimes(2)
    resolve(post({ seen: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('supports option zero, acknowledgement and translated text with Russian fallback', async () => {
    language.value = 'en'
    const onAction = vi.fn()
    render(<NewsCard post={post({ type: 'poll', titleEn: ' ', options: ['Yes', 'No'], votes: [3, 1], ackRequired: true })} onAction={onAction} />)
    expect(screen.getByText('Студенческая новость')).toBeTruthy()
    expect(screen.getByText('For students')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes 75%' }))
    expect(onAction).toHaveBeenLastCalledWith(expect.anything(), 'vote', { vote: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'I have read this' }))
    expect(onAction).toHaveBeenLastCalledWith(expect.anything(), 'ack', {})
  })

  it('renders the current editor attachments and tracks clicks without accepting unsafe URLs', () => {
    const onAction = vi.fn()
    render(<NewsCard post={post({ attachments: [
      { kind: 'LINK', title: 'Открыть материал', url: 'https://example.com/material' },
      { kind: 'PDF', title: 'Инструкция', url: 'https://example.com/guide.pdf' },
      { kind: 'IMAGE', title: 'Баннер', url: 'https://example.com/banner.png' },
      { kind: 'LINK', title: 'Небезопасная ссылка', url: 'javascript:alert(1)' },
    ] })} onAction={onAction} />)
    const link = screen.getByRole('link', { name: 'Открыть материал' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: '📄 Инструкция' }).getAttribute('href')).toBe('https://example.com/guide.pdf')
    expect(screen.getByRole('img', { name: 'Баннер' }).getAttribute('src')).toBe('https://example.com/banner.png')
    expect(screen.queryByText('Небезопасная ссылка')).toBeNull()
    fireEvent.click(link)
    expect(onAction).toHaveBeenCalledWith(expect.anything(), 'click', {})
  })

  it('defers popups during lessons and excludes teacher announcements from the popup', async () => {
    getStudentNewsPopup.mockResolvedValue([post({ targetRole: 'TEACHER' }), post()])
    const view = render(<StudentNewsPopup token="student" enabled={false} onNav={vi.fn()} />)
    await waitFor(() => expect(getStudentNewsPopup).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.rerender(<StudentNewsPopup token="student" enabled onNav={vi.fn()} />)
    expect(await screen.findByText('1 из 1')).toBeTruthy()
  })

  it('shows navigation to every student, including exam accounts, and handles reminder links', () => {
    for (const options of [{}, { ieltsAccount: true }, { sections: { known: true, allowed: [] } }]) {
      expect(menuItems(options).some((item) => item.key === 'whats-new')).toBe(true)
    }
    expect(menuItems({ teacher: true }).some((item) => item.key === 'whats-new')).toBe(false)
    expect(notificationTarget('whats-new').screen).toBe('whats-new')
    expect(notificationTarget('/system/whats-new').screen).toBe('whats-new')
    expect(studentNewsLink('javascript:alert(1)')).toBeNull()
    expect(studentNewsLink('/system/whats-new')).toBeNull()
    expect(studentNewsLink('/?screen=practice')).toBe('/?screen=practice')
  })

  it('waits for another entry dialog to close before showing news', async () => {
    const other = document.createElement('section')
    other.setAttribute('role', 'dialog'); other.setAttribute('aria-modal', 'true')
    document.body.appendChild(other)
    try {
      render(<StudentNewsPopup token="student" onNav={vi.fn()} />)
      await act(async () => { await Promise.resolve() })
      expect(document.querySelector('.student-news-popup')).toBeNull()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(reactToStudentNews).not.toHaveBeenCalled()
      other.remove()
      expect(await screen.findByText('Студенческая новость')).toBeTruthy()
    } finally { other.remove() }
  })

  it('does not navigate after the student session is unmounted during a request', async () => {
    let resolve
    reactToStudentNews.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const onNav = vi.fn()
    const view = render(<StudentNewsPopup token="student" onNav={onNav} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Все объявления' }))
    view.unmount()
    await act(async () => { resolve(post({ seen: true })) })
    expect(onNav).not.toHaveBeenCalled()
  })
})
