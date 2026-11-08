// @vitest-environment jsdom
//
// «Повторить по расписанию» на главной «Словаря» (ТЗ v2.0, 8.3): слова, у которых вышел срок, — с переводом, кнопка
// собирает тренировку с теми же ключами, что у слов модели (по ним ответ сдвинет коробку). Нет слов — нет блока.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import DueReview, { dueCards, useDueWords } from './DueReview.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (k, v) => (v?.n ? `${k}:${v.n}` : k)
const WORDS = [
  { key: 'decide', en: 'decide', ru: 'решать', kk: 'шешу', example: '' },
  { key: 'borrow', en: 'borrow', ru: 'занимать', kk: '', example: '' },
]

describe('DueReview', () => {
  it('слова с переводом на языке словаря; кнопка — тренировка с ключами модели', () => {
    const onStart = vi.fn()
    render(<DueReview t={t} vlang="kk" words={WORDS} speak={() => {}} onStart={onStart} />)
    expect(screen.getByText('vocab.home.dueLead:2')).toBeTruthy()
    expect(screen.getByText('шешу')).toBeTruthy()
    expect(screen.getByText('занимать')).toBeTruthy() // казахского нет — русский
    fireEvent.click(screen.getByText('vocab.home.dueStart'))
    expect(onStart).toHaveBeenCalledWith(dueCards(WORDS))
    expect(dueCards(WORDS)[0]).toEqual({ id: 'decide', en: 'decide', ru: 'решать', kk: 'шешу', example: '' })
  })

  it('нет слов — нет блока', () => {
    const { container } = render(<DueReview t={t} vlang="ru" words={[]} speak={() => {}} onStart={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('useDueWords: спрашивает только на главной и только со входом', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ words: WORDS }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result, rerender } = renderHook(({ token, key }) => useDueWords(token, key), { initialProps: { token: null, key: 'home' } })
    expect(result.current).toEqual([])
    rerender({ token: 'tok', key: null })
    expect(fetchMock).not.toHaveBeenCalled()
    rerender({ token: 'tok', key: 'home' })
    await waitFor(() => expect(result.current).toHaveLength(2))
    expect(fetchMock).toHaveBeenCalledWith('/api/study/review', expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }))
  })
})
