// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('./birgeApi.js', () => ({ publishBirgePost: vi.fn(), uploadBirgeMedia: vi.fn() }))
// Пережатие подменяем: в jsdom нет ни декодера картинок, ни canvas (само пережатие — photo.test.js).
vi.mock('./photo.js', async (load) => ({ ...(await load()), shrinkPhoto: vi.fn() }))

import Composer from './Composer.jsx'
import { publishBirgePost, uploadBirgeMedia } from './birgeApi.js'
import { shrinkPhoto } from './photo.js'

function mount(props = {}) {
  const onPublished = vi.fn()
  const onOpenFeedback = vi.fn()
  render(
    <I18nProvider>
      <Composer kind="thread" token="T" authorName="Айгерім" onPublished={onPublished} onOpenFeedback={onOpenFeedback} {...props} />
    </I18nProvider>,
  )
  return { onPublished, onOpenFeedback }
}
const box = () => screen.getByPlaceholderText('Что нового?')
const publish = () => fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }))
const reply = (over = {}) => ({ decision: 'published', post: null, risk: 5, reasons: [], hits: [], removedMediaIds: [], feedbackId: null, ...over })
const jpeg = () => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), width: 1600, height: 1200 })

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  // Превью фото — объектные URL; в jsdom их нет.
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

describe('форма «Новая ветка»', () => {
  it('имя и тема рядом, по умолчанию — «Вопрос»', () => {
    mount()
    expect(screen.getByText('Айгерім')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Тема: Вопрос' })).toBeTruthy()
  })

  it('счётчик символов — с 450, до этого его нет', () => {
    mount()
    fireEvent.change(box(), { target: { value: 'a'.repeat(449) } })
    expect(screen.queryByText('449/500')).toBeNull()
    fireEvent.change(box(), { target: { value: 'a'.repeat(450) } })
    expect(screen.getByText('450/500')).toBeTruthy()
  })

  it('смайлик встаёт в позицию курсора, панель остаётся открытой, «Недавние» запоминаются', () => {
    mount()
    const ta = box()
    fireEvent.change(ta, { target: { value: 'Hello world' } })
    ta.setSelectionRange(5, 5)
    fireEvent.click(ta)
    fireEvent.click(screen.getByRole('button', { name: 'Смайлики' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Смайлики' })).getByRole('button', { name: '😀' }))
    expect(box().value).toBe('Hello😀 world')
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Смайлики' })).getByRole('button', { name: '😃' }))
    expect(box().value).toBe('Hello😀😃 world')
    expect(JSON.parse(localStorage.getItem('jts_birge_recent_emoji'))).toEqual(['😃', '😀'])
  })

  it('продолжений — не больше четырёх', () => {
    mount()
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Дополните ветку' }))
    expect(screen.getAllByPlaceholderText('Продолжение…')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Дополните ветку' })).toBeNull()
  })

  it('публикация: тема, текст, продолжения по контракту; «Опубликовано» очищает форму', async () => {
    const post = { id: 202, topic: 'GRAMMAR', text: 'Как запомнить артикли?', status: 'published' }
    publishBirgePost.mockResolvedValue(reply({ post }))
    const { onPublished } = mount()
    fireEvent.change(box(), { target: { value: '  Как запомнить артикли?  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Тема: Вопрос' }))
    fireEvent.click(screen.getByRole('option', { name: 'Грамматика' }))
    fireEvent.click(screen.getByRole('button', { name: 'Дополните ветку' }))
    fireEvent.change(screen.getByPlaceholderText('Продолжение…'), { target: { value: 'Особенно the и a' } })
    publish()
    expect(await screen.findByText('Опубликовано')).toBeTruthy()
    expect(publishBirgePost).toHaveBeenCalledWith('T', { topic: 'GRAMMAR', text: 'Как запомнить артикли?', continuations: ['Особенно the и a'] })
    expect(box().value).toBe('')
    expect(screen.queryByPlaceholderText('Продолжение…')).toBeNull()
    expect(onPublished).toHaveBeenCalledWith(post)
    expect(screen.getByText(/Проверка по словарю стоп-слов/)).toBeTruthy()
    expect(screen.queryByText(/Проверка фото/)).toBeNull()
  })

  it('отказ: причины, риск и подсвеченные слова; разметка ученика — текстом; текст остаётся', async () => {
    publishBirgePost.mockResolvedValue(reply({ decision: 'rejected', risk: 96, reasons: [{ code: 'PROFANITY', score: 96 }], hits: ['х@й'] }))
    mount()
    fireEvent.change(box(), { target: { value: 'Да Х@Й поймёшь <b>артикли</b>' } })
    publish()
    expect(await screen.findByText('Не прошло проверку')).toBeTruthy()
    expect(screen.getByText('Причина: Нецензурная лексика. Риск 96/100.')).toBeTruthy()
    expect([...document.querySelectorAll('.brg-res mark')].map((m) => m.textContent)).toEqual(['Х@Й'])
    expect(document.querySelector('.brg-res__copy b')).toBeNull()
    expect(document.querySelector('.brg-res__copy').textContent).toBe('Да Х@Й поймёшь <b>артикли</b>')
    expect(box().value).toBe('Да Х@Й поймёшь <b>артикли</b>')
  })

  it('429 — «Слишком часто — попробуйте через N мин», шагов нет, текст остаётся', async () => {
    publishBirgePost.mockRejectedValue(Object.assign(new Error('rate'), { status: 429, retryAfterSec: 1200 }))
    mount()
    fireEvent.change(box(), { target: { value: 'Ещё один пост' } })
    publish()
    expect(await screen.findByText('Слишком часто — попробуйте через 20 мин')).toBeTruthy()
    expect(document.querySelector('.brg-step')).toBeNull()
    expect(box().value).toBe('Ещё один пост')
  })

  it('короткая ветка без фото — «Опубликовать» закрыта, подсказка «Напишите хотя бы пару слов»', () => {
    mount()
    fireEvent.change(box(), { target: { value: 'Да!' } })
    expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(true)
    expect(screen.getByText('Напишите хотя бы пару слов')).toBeTruthy()
    fireEvent.change(box(), { target: { value: 'Да, согласна' } })
    expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(false)
    expect(screen.queryByText('Напишите хотя бы пару слов')).toBeNull()
  })

  it('400 проверки запроса — текст сервера, текст в поле остаётся', async () => {
    publishBirgePost.mockRejectedValue(Object.assign(new Error('bad'), { status: 400, serverMessage: 'Напишите хотя бы пару слов' }))
    mount()
    fireEvent.change(box(), { target: { value: 'Привет!' } })
    publish()
    expect(await screen.findByText('Напишите хотя бы пару слов', { selector: '.brg-res p' })).toBeTruthy()
    expect(box().value).toBe('Привет!')
  })

  it('отзыв ушёл в Feedback: поле очищено, кнопка ведёт в обращение', async () => {
    publishBirgePost.mockResolvedValue(reply({ decision: 'feedback', risk: 78, reasons: [{ code: 'PLATFORM_COMPLAINT', score: 78 }], feedbackId: 55 }))
    const { onOpenFeedback } = mount()
    fireEvent.change(box(), { target: { value: 'Это развод, верните деньги' } })
    publish()
    expect(await screen.findByText(/Ваш отзыв не потерян/)).toBeTruthy()
    expect(box().value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Открыть обращение' }))
    expect(onOpenFeedback).toHaveBeenCalledWith(55)
  })

  it('фото: пережимается, сразу грузится, пока грузится — «Опубликовать» закрыта; уходит в mediaIds', async () => {
    shrinkPhoto.mockResolvedValue(jpeg())
    let finish
    uploadBirgeMedia.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    publishBirgePost.mockResolvedValue(reply())
    mount()
    const file = new File(['raw'], 'IMG_1.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Фото'), { target: { files: [file] } })
    await waitFor(() => expect(uploadBirgeMedia).toHaveBeenCalled())
    expect(shrinkPhoto).toHaveBeenCalledWith(file)
    expect(uploadBirgeMedia.mock.calls[0][0]).toBe('T')
    expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(true)
    finish({ id: 7, width: 1600, height: 1200 })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(false))
    publish()
    await waitFor(() => expect(publishBirgePost).toHaveBeenCalledWith('T', { topic: 'QUESTION', text: '', mediaIds: [7] }))
    expect(await screen.findByText('Проверка фото: 18+, насилие, текст на картинке (1 шт.)')).toBeTruthy()
  })

  it('пока фото пережимается — «Опубликовать» закрыта; места заняты сразу, пятое фото двумя выборами не взять', async () => {
    const shrinks = []
    shrinkPhoto.mockImplementation(() => new Promise((resolve) => shrinks.push(resolve)))
    let n = 0
    uploadBirgeMedia.mockImplementation(() => Promise.resolve({ id: ++n, width: 1600, height: 1200 }))
    publishBirgePost.mockResolvedValue(reply())
    mount()
    fireEvent.change(box(), { target: { value: 'Делюсь табличкой глаголов' } })
    const pick = (count) =>
      fireEvent.change(screen.getByLabelText('Фото'), {
        target: { files: Array.from({ length: count }, (_, i) => new File(['raw'], `IMG_${i}.png`, { type: 'image/png' })) },
      })
    pick(3)
    await waitFor(() => expect(shrinkPhoto).toHaveBeenCalledTimes(1))
    // Фото ещё нет в черновике, но пост без него уйти не должен.
    expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(true)
    expect(screen.getByText('Загружаем и проверяем фото…')).toBeTruthy()
    pick(2)
    expect(await screen.findByText('Можно приложить не больше 4 фото')).toBeTruthy()
    for (let i = 0; i < 4; i += 1) {
      await waitFor(() => expect(shrinks.length).toBeGreaterThan(i))
      shrinks[i](jpeg())
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Опубликовать' }).disabled).toBe(false))
    expect(shrinkPhoto).toHaveBeenCalledTimes(4)
    publish()
    await waitFor(() => expect(publishBirgePost).toHaveBeenCalled())
    expect(publishBirgePost.mock.calls[0][1].mediaIds).toHaveLength(4)
  })

  it('фото больше 10 МБ — подсказка, загрузки нет', async () => {
    shrinkPhoto.mockRejectedValue(Object.assign(new Error('too_big'), { code: 'too_big' }))
    mount()
    fireEvent.change(screen.getByLabelText('Фото'), { target: { files: [new File(['x'], 'big.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText('Фото больше 10 МБ — выберите поменьше')).toBeTruthy()
    expect(uploadBirgeMedia).not.toHaveBeenCalled()
  })

  it('отказ из-за фото: убирается только удалённое сервером, остальное остаётся для повтора', async () => {
    shrinkPhoto.mockResolvedValue(jpeg())
    uploadBirgeMedia.mockResolvedValueOnce({ id: 7, width: 1600, height: 1200 }).mockResolvedValueOnce({ id: 8, width: 1600, height: 1200 })
    publishBirgePost
      .mockResolvedValueOnce(reply({ decision: 'rejected', risk: 92, reasons: [{ code: 'IMAGE_UNSAFE', score: 92 }], removedMediaIds: [7] }))
      .mockResolvedValueOnce(reply())
    mount()
    fireEvent.change(box(), { target: { value: 'Мой кот' } })
    fireEvent.change(screen.getByLabelText('Фото'), {
      target: { files: [new File(['a'], 'cat.jpg', { type: 'image/jpeg' }), new File(['b'], 'dog.jpg', { type: 'image/jpeg' })] },
    })
    await waitFor(() => expect(document.querySelectorAll('.brg-mitem')).toHaveLength(2))
    await waitFor(() => expect(document.querySelector('.brg-mitem.is-loading')).toBeNull())
    publish()
    expect(await screen.findByText('Не прошло проверку')).toBeTruthy()
    expect(document.querySelectorAll('.brg-mitem')).toHaveLength(1)
    expect(box().value).toBe('Мой кот')
    // Повтор уходит с оставшимся фото: вложения своего автоотклонённого поста сервер переносит в новый.
    publish()
    await waitFor(() => expect(publishBirgePost).toHaveBeenLastCalledWith('T', { topic: 'QUESTION', text: 'Мой кот', mediaIds: [8] }))
  })

  it('429 на загрузке фото — «Слишком часто — попробуйте через N мин», превью убирается', async () => {
    shrinkPhoto.mockResolvedValue(jpeg())
    uploadBirgeMedia.mockRejectedValue(Object.assign(new Error('rate'), { status: 429, retryAfterSec: 600 }))
    mount()
    fireEvent.change(screen.getByLabelText('Фото'), { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText('Слишком часто — попробуйте через 10 мин')).toBeTruthy()
    expect(document.querySelector('.brg-mitem')).toBeNull()
  })
})

describe('форма ответа', () => {
  it('без темы и продолжений, в теле parentId; короткий ответ («Да!») — норма', async () => {
    publishBirgePost.mockResolvedValue(reply())
    mount({ kind: 'comment', parentId: 101 })
    expect(screen.queryByRole('button', { name: /^Тема/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Дополните ветку' })).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('Ответить…'), { target: { value: 'Да!' } })
    expect(screen.queryByText('Напишите хотя бы пару слов')).toBeNull()
    publish()
    await waitFor(() => expect(publishBirgePost).toHaveBeenCalledWith('T', { text: 'Да!', parentId: 101 }))
  })
})
