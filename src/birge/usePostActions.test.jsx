// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('./birgeApi.js', async (load) => ({ ...(await load()), setBirgeLike: vi.fn(), reportBirgePost: vi.fn() }))

import { usePostActions } from './usePostActions.js'
import { BirgeApiError, reportBirgePost, setBirgeLike } from './birgeApi.js'

function Harness({ post, update, remove, onToast }) {
  const { like, report } = usePostActions({ token: 'T', update, remove, onToast })
  return (
    <>
      <button type="button" onClick={() => like(post)}>
        like
      </button>
      <button type="button" onClick={() => report(post)}>
        report
      </button>
    </>
  )
}

function mount(post) {
  const spies = { update: vi.fn(), remove: vi.fn(), onToast: vi.fn() }
  render(
    <I18nProvider>
      <Harness post={post} {...spies} />
    </I18nProvider>,
  )
  return spies
}

const post = { id: 101, liked: false, likes: 12, mine: false, canReport: true, status: 'published' }

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('лайк', () => {
  it('сразу на экране, потом — число с сервера', async () => {
    setBirgeLike.mockResolvedValue({ liked: true, likes: 20 })
    const { update } = mount(post)
    fireEvent.click(screen.getByText('like'))
    expect(update).toHaveBeenNthCalledWith(1, 101, { liked: true, likes: 13 })
    await waitFor(() => expect(update).toHaveBeenNthCalledWith(2, 101, { liked: true, likes: 20 }))
    expect(setBirgeLike).toHaveBeenCalledWith('T', 101, true)
  })

  it('не прошёл — прежнее значение и тост', async () => {
    setBirgeLike.mockRejectedValue(new BirgeApiError(500, null))
    const { update, onToast } = mount({ ...post, liked: true, likes: 5 })
    fireEvent.click(screen.getByText('like'))
    expect(update).toHaveBeenNthCalledWith(1, 101, { liked: false, likes: 4 })
    await waitFor(() => expect(update).toHaveBeenNthCalledWith(2, 101, { liked: true, likes: 5 }))
    expect(onToast).toHaveBeenCalledWith('Не удалось поставить лайк')
    expect(setBirgeLike).toHaveBeenCalledWith('T', 101, false)
  })
})

describe('жалоба', () => {
  it('принята — кнопка уходит, тост «спасибо»', async () => {
    reportBirgePost.mockResolvedValue({ reports: 1, hidden: false })
    const { update, remove, onToast } = mount(post)
    fireEvent.click(screen.getByText('report'))
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Жалоба отправлена. Спасибо!'))
    expect(reportBirgePost).toHaveBeenCalledWith('T', 101, null)
    expect(update).toHaveBeenCalledWith(101, { canReport: false })
    expect(remove).not.toHaveBeenCalled()
  })

  it('двойное нажатие — одна жалоба, без «уже жаловались» поверх «спасибо»', async () => {
    let done
    reportBirgePost.mockReturnValue(new Promise((resolve) => (done = resolve)))
    const { onToast } = mount(post)
    fireEvent.click(screen.getByText('report'))
    fireEvent.click(screen.getByText('report'))
    done({ reports: 1, hidden: false })
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Жалоба отправлена. Спасибо!'))
    expect(reportBirgePost).toHaveBeenCalledTimes(1)
    expect(onToast).toHaveBeenCalledTimes(1)
  })

  it('жалоба скрыла пост — он уходит и у пожаловавшегося', async () => {
    reportBirgePost.mockResolvedValue({ reports: 3, hidden: true })
    const { remove, onToast } = mount(post)
    fireEvent.click(screen.getByText('report'))
    await waitFor(() => expect(remove).toHaveBeenCalledWith(101))
    expect(onToast).toHaveBeenCalledWith('Спасибо! Пост скрыт и отправлен модератору.')
  })

  it('повтор (409) — «уже жаловались»; прочий сбой — «не удалось»', async () => {
    reportBirgePost.mockRejectedValueOnce(new BirgeApiError(409, null)).mockRejectedValueOnce(new BirgeApiError(500, null))
    const { update, onToast } = mount(post)
    fireEvent.click(screen.getByText('report'))
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Вы уже жаловались на этот пост'))
    expect(update).toHaveBeenCalledWith(101, { canReport: false })
    fireEvent.click(screen.getByText('report'))
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Не удалось отправить жалобу'))
  })
})
