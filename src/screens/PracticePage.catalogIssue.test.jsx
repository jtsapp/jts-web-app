// @vitest-environment jsdom
// Книги и комиксы, которые не загрузились, не должны выглядеть как «Нет данных».
//
// Обращение: «на мобильной версии нет книжек и комиксов» — при 40 активных
// книгах и 87 комиксах в базе. Причина была в доставке, а не в данных: у
// незалогиненного посетителя на стенде без демо-витрины (`/api/practice/
// demo-token` → 503) нет серверного токена, каталог отказывает, а пустой catch
// превращал отказ в общее «Нет данных». Теперь у отказа свои слова.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

// Загрузчик комиксов замокан отдельно: у него свой кэш на уровне модуля, и
// пустой ответ предыдущего теста оседал бы в нём для следующего. Сам он — и то,
// что отказ не запоминается, — проверяется в comicsData.test.js.
vi.mock('../practice/comics/comicsData.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, loadComicsIndex: vi.fn(async () => []), searchComicsCatalog: vi.fn(async () => []) }
})

import * as api from '../api.js'
import { loadComicsIndex } from '../practice/comics/comicsData.js'
import PracticePage from './PracticePage.jsx'

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  api.getPracticeToken.mockImplementation(async (token) => token || null)
  loadComicsIndex.mockImplementation(async () => [])
})

// `target` — куда открыть Практику: книги разворачиваются отдельным списком, а
// комиксы живут рядом с ними на вкладке «Чтение» в обзоре.
function renderPage(token, target = { filter: 'books' }) {
  return render(
    <I18nProvider>
      <PracticePage userLevel="A1" userName="Тест" token={token} openTarget={target} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

const books = (c) => c.querySelector('#sec-books')

describe('PracticePage — каталог книг не загрузился', () => {
  it('гость на стенде без демо-витрины видит «после входа», а не «Нет данных»', async () => {
    api.getPracticeToken.mockResolvedValue(null) // /api/practice/demo-token → 503
    api.getAudiobooks.mockRejectedValue(Object.assign(new Error('401'), { status: 401 }))

    const { container } = renderPage(null)

    await waitFor(() => expect(books(container).textContent).toMatch(/после входа/i))
    expect(books(container).textContent).not.toMatch(/Нет данных/)
    // У гостя повтор бесполезен: дело не в соединении.
    expect(books(container).querySelector('.pp-empty__retry')).toBeNull()
  })

  it('вошедший после сбоя запроса видит ошибку и кнопку «Повторить»', async () => {
    api.getAudiobooks.mockRejectedValue(new Error('сеть'))

    const { container } = renderPage('T')

    await waitFor(() => expect(books(container).textContent).toMatch(/Не удалось загрузить каталог/i))
    expect(books(container).textContent).not.toMatch(/Нет данных/)
    expect(books(container).querySelector('.pp-empty__retry')).toBeTruthy()
  })

  it('«Повторить» перезапрашивает каталог, и книги появляются', async () => {
    api.getAudiobooks.mockRejectedValueOnce(new Error('сеть'))
    const { container } = renderPage('T')
    await waitFor(() => expect(books(container).querySelector('.pp-empty__retry')).toBeTruthy())

    api.getAudiobooks.mockResolvedValue([{ id: 1, title: 'Книга про море', level: 'A1', tracks: [] }])
    fireEvent.click(books(container).querySelector('.pp-empty__retry'))

    await waitFor(() => expect(books(container).textContent).toMatch(/Книга про море/))
    expect(books(container).querySelector('.pp-empty__retry')).toBeNull()
  })

  // Удачная загрузка не должна показывать ни одного из новых состояний.
  it('каталог загрузился — ни «после входа», ни ошибки', async () => {
    api.getAudiobooks.mockResolvedValue([{ id: 1, title: 'Книга про море', level: 'A1', tracks: [] }])

    const { container } = renderPage('T')

    await waitFor(() => expect(books(container).textContent).toMatch(/Книга про море/))
    expect(books(container).textContent).not.toMatch(/после входа|Не удалось загрузить/)
  })
})

describe('PracticePage — каталог комиксов не загрузился', () => {
  it('сбой не прячет раздел: «комиксов нет» и «не загрузились» — разное', async () => {
    loadComicsIndex.mockRejectedValue(new Error('сеть'))

    const { container } = renderPage('T', { skill: 'reading' })

    await waitFor(() => expect(container.querySelector('#sec-comics')).toBeTruthy())
    expect(container.querySelector('#sec-comics').textContent).toMatch(/Не удалось загрузить каталог/i)
  })
})

describe('PracticePage — каталог комиксов загрузился', () => {
  // Раздел без комиксов по-прежнему прячется: пустая лента выглядит поломкой, а
  // отсутствие каталога — не отказ. Новое состояние не должно его оживить.
  it('пустой каталог без сбоя — раздела нет вовсе', async () => {
    loadComicsIndex.mockResolvedValue([])

    const { container } = renderPage('T', { skill: 'reading' })

    await waitFor(() => expect(container.querySelector('#sec-books')).toBeTruthy())
    expect(container.querySelector('#sec-comics')).toBeNull()
  })
})
