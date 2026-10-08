// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026, «Загрузка»:
// #59 — сбой загрузки каталога книг (/api/books) запоминался до перезагрузки
//       страницы: текст книги из статики больше не находился вовсе;
// #62 — в демо закрытые главы в читалке выглядели живыми кнопками, а нажатие
//       ничего не делало (и «Перейти к следующей главе» — тоже).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'

const getAudiobook = vi.fn()
vi.mock('../api.js', () => ({
  saveWord: vi.fn(),
  getAudiobook: (...args) => getAudiobook(...args),
}))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))

beforeEach(() => {
  getAudiobook.mockReset()
})

afterEach(() => {
  cleanup()
  vi.resetModules()
})

describe('#59 — каталог книг после сбоя', () => {
  it('сбой /api/books не запоминается: следующее открытие находит книгу', async () => {
    const STATIC = { title: 'The Happy Prince', chapters: [{ num: '1', title: 'One', text: 'Text.' }], dict: {} }
    let indexCalls = 0
    global.fetch = vi.fn((url) => {
      if (url === '/api/books') {
        indexCalls += 1
        if (indexCalls === 1) return Promise.reject(new TypeError('Failed to fetch'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'happy', title: 'The Happy Prince' }]) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(STATIC) })
    })
    const { loadBookContent } = await import('./BookDetail.jsx')
    const book = { title: 'The Happy Prince' }
    expect(await loadBookContent(book, null)).toBeFalsy()
    const second = await loadBookContent(book, null)
    expect(second?.chapters?.length).toBe(1)
    expect(indexCalls).toBe(2)
  })

  it('ответ сервера с ошибкой тоже не запоминается пустым каталогом', async () => {
    let indexCalls = 0
    global.fetch = vi.fn((url) => {
      if (url === '/api/books') {
        indexCalls += 1
        if (indexCalls === 1) return Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) })
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: false })
    })
    const { loadBookContent } = await import('./BookDetail.jsx')
    await loadBookContent({ title: 'X' }, null)
    await loadBookContent({ title: 'X' }, null)
    expect(indexCalls).toBe(2)
  })
})

describe('#62 — закрытые главы в читалке', () => {
  async function openReader() {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    getAudiobook.mockResolvedValue({
      id: 77,
      title: 'Книга 77',
      tracks: [
        { trackIndex: 1, title: 'Open One', text: 'The first chapter.' },
        { trackIndex: 2, title: 'Locked Two', text: '', locked: true },
        { trackIndex: 3, title: 'Locked Three', text: '', locked: true },
      ],
    })
    const { default: BookDetail } = await import('./BookDetail.jsx')
    render(<BookDetail book={{ id: 77, title: 'Книга 77', author: 'A', tracks: [] }} token="t" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Open One')).toBeTruthy())
    fireEvent.click(screen.getByText('Open One').closest('button'))
    // Текст главы читалка режет на слова для тап-перевода — ждём саму читалку.
    await waitFor(() => expect(document.querySelector('.bk-read__side')).toBeTruthy())
  }

  it('в списке глав читалки закрытая глава неактивна и помечена замком', async () => {
    await openReader()
    const side = document.querySelector('.bk-read__side')
    const locked = [...side.querySelectorAll('.bk-chapter')].find((b) => b.textContent.includes('Locked Two'))
    expect(locked.disabled).toBe(true)
    expect(locked.textContent).toContain('🔒')
  })

  it('следующая глава закрыта — вместо мёртвой кнопки объяснение', async () => {
    await openReader()
    expect(screen.queryByText('Перейти к следующей главе')).toBeNull()
    expect(screen.getByText(/откроются с полным доступом/)).toBeTruthy()
  })
})
