// @vitest-environment jsdom
//
// Просмотрщик PDF урока: загрузка, листание и что считается «своим» листанием —
// от этого зависит, поведёт ли преподаватель класс (см. SectionMaterialFrame).
// pdf.js подменён: тест про поведение экрана, а не про разбор файла (настоящий
// pdf.js проверяет pdfjsContract.test.js).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, act, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import { openPdf } from './pdfLoader.js'
import PdfViewer from './PdfViewer.jsx'

vi.mock('./pdfLoader.js', () => ({ openPdf: vi.fn() }))

const URL_A = 'https://files/a/book.pdf'
const URL_B = 'https://files/b/other.pdf'
// Ширина ленты до замера — 600 (у элементов jsdom размеров нет), страница
// 100 × 140 → 600 × 840. Верх каждой: 12 + n × 852.
const TOPS = [12, 864, 1716, 2568, 3420]

function fakeDoc(numPages) {
  return {
    numPages,
    getPage: vi.fn(async () => ({
      getViewport: ({ scale }) => ({ width: 100 * scale, height: 140 * scale }),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    })),
  }
}

/** Загрузка, которую тест завершает сам. */
function deferredLoad() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  const handle = { promise, destroy: vi.fn() }
  return { handle, resolve, reject }
}

function viewer(props) {
  return (
    <I18nProvider>
      <PdfViewer url={URL_A} title="Unit 1" {...props} />
    </I18nProvider>
  )
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {})
  }
}

/** Окно ленты высотой 500 и прокрутка, которую тест двигает руками. */
function sizeScroller() {
  const scroller = document.querySelector('.pdfv__scroller')
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 500 })
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, writable: true, value: 0 })
  return scroller
}

async function scrollTo(scroller, top, { byUser }) {
  if (byUser) fireEvent.wheel(scroller)
  scroller.scrollTop = top
  fireEvent.scroll(scroller)
  await act(async () => {
    vi.advanceTimersByTime(250)
  })
}

let doc
let onPageChange

beforeEach(() => {
  vi.useFakeTimers()
  // jsdom не рисует: контекст канвы — пустышка, рендер подменён у страницы.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
  doc = fakeDoc(5)
  onPageChange = vi.fn()
  openPdf.mockReset()
  openPdf.mockImplementation(() => ({ promise: Promise.resolve(doc), destroy: vi.fn() }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('PdfViewer', () => {
  it('пока файл грузится — лоадер, потом страницы и «1 / 5»', async () => {
    const load = deferredLoad()
    openPdf.mockReturnValue(load.handle)
    render(viewer({ onPageChange }))

    expect(screen.getByText('Загружаем PDF…')).toBeTruthy()
    expect(document.querySelectorAll('.pdfv__page')).toHaveLength(0)

    load.resolve(doc)
    await flush()

    expect(screen.queryByText('Загружаем PDF…')).toBeNull()
    expect(screen.getByText('1 / 5')).toBeTruthy()
    expect(document.querySelectorAll('.pdfv__page')).toHaveLength(5)
    expect(screen.getByRole('img', { name: 'Страница 3 из 5' })).toBeTruthy()
    expect(openPdf).toHaveBeenCalledWith(URL_A)
  })

  it('рисует видимые страницы и соседнюю, дальние — нет', async () => {
    render(viewer({ onPageChange }))
    await flush()

    // getPage(1) звали и для пропорций; рендер — только у первых двух.
    const pagesRendered = doc.getPage.mock.calls.map(([n]) => n)
    expect(new Set(pagesRendered)).toEqual(new Set([1, 2]))
  })

  it('«Следующая» — своё листание: страница уходит наружу с own', async () => {
    render(viewer({ onPageChange }))
    await flush()

    expect(screen.getByRole('button', { name: 'Предыдущая страница' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))

    expect(onPageChange).toHaveBeenLastCalledWith(1, { own: true })
  })

  it('два быстрых нажатия «Следующая» — две страницы, а не одна', async () => {
    render(viewer({ onPageChange }))
    await flush()
    sizeScroller()

    // Лента ещё едет к первой странице — второе нажатие считает от неё, а не от экрана.
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))
    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))

    expect(onPageChange.mock.calls).toEqual([[1, { own: true }], [2, { own: true }]])
  })

  it('прокрутка человеком — своя, номер уходит, когда лента встала', async () => {
    render(viewer({ onPageChange }))
    await flush()
    const scroller = sizeScroller()

    await scrollTo(scroller, TOPS[2], { byUser: true })

    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenLastCalledWith(2, { own: true })
    expect(screen.getByText('3 / 5')).toBeTruthy()
  })

  it('прокрутка без касания (подстройка ленты) — не своя', async () => {
    render(viewer({ onPageChange }))
    await flush()
    const scroller = sizeScroller()

    await scrollTo(scroller, TOPS[3], { byUser: false })

    expect(onPageChange).toHaveBeenLastCalledWith(3, { own: false })
  })

  it('та же страница повторно наружу не уходит', async () => {
    render(viewer({ onPageChange }))
    await flush()
    const scroller = sizeScroller()

    await scrollTo(scroller, TOPS[2], { byUser: true })
    await scrollTo(scroller, TOPS[2] + 40, { byUser: true })

    expect(onPageChange).toHaveBeenCalledTimes(1)
  })

  it('страница класса листает ленту, и это не своё листание', async () => {
    const view = render(viewer({ onPageChange }))
    await flush()
    const scroller = sizeScroller()

    view.rerender(viewer({ onPageChange, page: 3 }))
    await flush()

    expect(scroller.scrollTop).toBe(TOPS[3] - 12)
    expect(onPageChange).toHaveBeenLastCalledWith(3, { own: false })

    // Отголосок своей прокрутки после перехода — не листание человека.
    fireEvent.scroll(scroller)
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(onPageChange).toHaveBeenCalledTimes(1)
  })

  it('страница класса, пришедшая до загрузки, применяется после неё', async () => {
    const load = deferredLoad()
    openPdf.mockReturnValue(load.handle)
    render(viewer({ onPageChange, page: 2 }))
    expect(onPageChange).not.toHaveBeenCalled()

    load.resolve(doc)
    await flush()

    expect(onPageChange).toHaveBeenLastCalledWith(2, { own: false })
  })

  it('goToPage снаружи: свой переход и доводка различаются', async () => {
    const ref = createRef()
    render(viewer({ onPageChange, ref }))
    await flush()

    act(() => ref.current.goToPage(4, { own: true }))
    expect(onPageChange).toHaveBeenLastCalledWith(4, { own: true })
    act(() => ref.current.goToPage(1))
    expect(onPageChange).toHaveBeenLastCalledWith(1, { own: false })
    // За пределами документа — к ближайшей странице.
    act(() => ref.current.goToPage(99, { own: true }))
    expect(onPageChange).toHaveBeenLastCalledWith(4, { own: true })
  })

  it('битый или запароленный файл — ошибка и запасная ссылка, без вечной загрузки', async () => {
    const load = deferredLoad()
    openPdf.mockReturnValue(load.handle)
    render(viewer({ onPageChange }))

    load.reject(new Error('PasswordException'))
    await flush()

    expect(screen.getByRole('alert').textContent).toContain('Не удалось открыть PDF.')
    const links = screen.getAllByRole('link', { name: 'Открыть в новой вкладке' })
    expect(links.every((link) => link.getAttribute('href') === URL_A)).toBe(true)
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.queryByText('Загружаем PDF…')).toBeNull()
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('уход с экрана освобождает документ', async () => {
    const load = deferredLoad()
    openPdf.mockReturnValue(load.handle)
    const view = render(viewer({ onPageChange }))
    load.resolve(doc)
    await flush()

    view.unmount()

    expect(load.handle.destroy).toHaveBeenCalledTimes(1)
  })

  it('сменился адрес — запоздавший старый документ не показывается', async () => {
    const first = deferredLoad()
    const second = deferredLoad()
    openPdf.mockReturnValueOnce(first.handle).mockReturnValueOnce(second.handle)
    const view = render(viewer({ onPageChange }))

    view.rerender(viewer({ onPageChange, url: URL_B }))
    expect(first.handle.destroy).toHaveBeenCalledTimes(1)

    first.resolve(fakeDoc(9))
    await flush()
    expect(screen.queryByText('1 / 9')).toBeNull()
    expect(screen.getByText('Загружаем PDF…')).toBeTruthy()

    second.resolve(fakeDoc(2))
    await flush()
    expect(screen.getByText('1 / 2')).toBeTruthy()
  })

  it('масштаб: крупнее, мельче и обратно по ширине', async () => {
    render(viewer({ onPageChange }))
    await flush()
    const page = () => document.querySelector('.pdfv__page')

    // После щелчка страницы дорисовываются в новом размере — асинхронно.
    const click = async (name) => {
      fireEvent.click(screen.getByRole('button', { name }))
      await flush()
    }

    expect(page().style.width).toBe('600px')
    await click('Крупнее')
    expect(page().style.width).toBe('750px')
    expect(screen.getByText('125%')).toBeTruthy()
    await click('Мельче')
    await click('Мельче')
    expect(page().style.width).toBe('450px')
    await click('По ширине')
    expect(page().style.width).toBe('600px')
    // Подстройка ленты под масштаб — не листание.
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
