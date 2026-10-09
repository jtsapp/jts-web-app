// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026, #60: экран «Не получилось загрузить комикс»
// был тупиком — повторить можно было только выйдя из читалки, а после выхода
// и входа загрузчик отдавал запомненный сбой. Теперь на экране сбоя есть
// «Повторить».
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

const loadComic = vi.fn()
vi.mock('../api.js', () => ({ saveWord: vi.fn() }))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/comics/comicsData.js', () => ({
  loadComic: (...a) => loadComic(...a),
  getComicPage: () => 1,
  setComicPage: () => {},
}))

const { default: ComicReader } = await import('./ComicReader.jsx')

afterEach(cleanup)

describe('ComicReader — сбой загрузки', () => {
  it('«Повторить» загружает комикс заново', async () => {
    loadComic
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ title: 'The Ghost', pages: [{ src: 'p1.webp', blocks: [{ kind: 'speech', en: 'Boo', ru: 'Бу' }] }] })
    render(<ComicReader comic={{ id: 5, slug: 'ghost', title: 'The Ghost' }} token="T" onBack={() => {}} />)
    expect(await screen.findByText('comics.failed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'comics.retry' }))
    expect(await screen.findByText('Boo')).toBeTruthy()
    expect(loadComic).toHaveBeenCalledTimes(2)
  })
})
