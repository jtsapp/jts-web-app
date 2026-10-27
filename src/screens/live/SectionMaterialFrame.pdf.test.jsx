// @vitest-environment jsdom
//
// PDF в рамке урока: вместо iframe — свой просмотрщик, а его страница идёт по
// той же цепочке стадий, что и у файлового урока (onStage / stage / gotoStage /
// restoreStage). На этом держится синхронное листание: ведущий листает — класс
// идёт следом, ученик листает сам — класс стоит.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, act, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { openPdf } from './pdf/pdfLoader.js'
import SectionMaterialFrame from './SectionMaterialFrame.jsx'

vi.mock('./pdf/pdfLoader.js', () => ({ openPdf: vi.fn() }))

const PDF = { id: 3, materialId: 33, title: 'Unit 1 · Workbook', materialType: 'PDF', fileUrl: 'https://files/u1.pdf' }
const VIDEO = { id: 4, materialId: 44, title: 'Clip', materialType: 'VIDEO', fileUrl: 'https://files/clip.mp4' }

function fakeDoc(numPages) {
  return {
    numPages,
    getPage: vi.fn(async () => ({
      getViewport: ({ scale }) => ({ width: 100 * scale, height: 140 * scale }),
      render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
    })),
  }
}

function frame(props) {
  return (
    <I18nProvider>
      <SectionMaterialFrame lessonId={14} token="t" material={PDF} isStaff {...props} />
    </I18nProvider>
  )
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {})
  }
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
  openPdf.mockReset()
  openPdf.mockImplementation(() => ({ promise: Promise.resolve(fakeDoc(4)), destroy: vi.fn() }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SectionMaterialFrame — PDF', () => {
  it('PDF рисует просмотрщик, а не iframe', async () => {
    const { container } = render(frame())
    await flush()

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('.lw-material-frame--pdf .pdfv')).toBeTruthy()
    expect(openPdf).toHaveBeenCalledWith(PDF.fileUrl)
  })

  it('PDF по адресу у ссылки — тоже просмотрщик', async () => {
    const { container } = render(frame({ material: { ...PDF, materialType: 'LINK' } }))
    await flush()

    expect(container.querySelector('.pdfv')).toBeTruthy()
  })

  it('видео по-прежнему в iframe, pdf.js не грузится', () => {
    const { container } = render(frame({ material: VIDEO }))

    expect(container.querySelector('iframe').getAttribute('src')).toBe(VIDEO.fileUrl)
    expect(openPdf).not.toHaveBeenCalled()
  })

  it('листание ведущего уходит стадией с own — по ней класс идёт следом', async () => {
    const onStage = vi.fn()
    render(frame({ onStage }))
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Следующая страница' }))

    expect(onStage).toHaveBeenLastCalledWith({ index: 1 }, { own: true })
  })

  it('страница класса у ученика — переход, но не своё листание', async () => {
    const onStage = vi.fn()
    const view = render(frame({ isStaff: false, onStage }))
    await flush()

    view.rerender(frame({ isStaff: false, onStage, stage: 2 }))
    await flush()

    expect(onStage).toHaveBeenLastCalledWith({ index: 2 }, { own: false })
    expect(screen.getByRole('img', { name: 'Страница 3 из 4' })).toBeTruthy()
  })

  it('gotoStage — свой переход, restoreStage — доводка', async () => {
    const onStage = vi.fn()
    const ref = createRef()
    render(frame({ onStage, ref }))
    await flush()

    act(() => ref.current.gotoStage(3))
    expect(onStage).toHaveBeenLastCalledWith({ index: 3 }, { own: true })

    act(() => ref.current.restoreStage(1))
    expect(onStage).toHaveBeenLastCalledWith({ index: 1 }, { own: false })
  })

  it('доводка после F5 до загрузки файла применяется, когда он открылся', async () => {
    const onStage = vi.fn()
    const ref = createRef()
    let resolve
    openPdf.mockReturnValue({ promise: new Promise((res) => { resolve = res }), destroy: vi.fn() })
    render(frame({ onStage, ref }))

    act(() => ref.current.restoreStage(2))
    expect(onStage).not.toHaveBeenCalled()

    resolve(fakeDoc(4))
    await flush()
    expect(onStage).toHaveBeenLastCalledWith({ index: 2 }, { own: false })
  })
})
