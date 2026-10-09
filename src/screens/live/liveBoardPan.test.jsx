// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

// «Уменьшил доску, дописал снизу надписи и фото, а ученик нижнюю часть не видит»
// (преподаватель, 09.10.2026). У ученика холст был ровно по окну, и двигать его было
// нечем: ни прокрутки, ни масштаба. Теперь лист бесконечный — колесо, «Рука», пробел и
// полосы двигают окно.
//
// Настоящий fabric в jsdom не поднять (нет 2d-контекста), поэтому движок подменён: здесь
// проверяется, что делает компонент — какой вид (viewportTransform) он выдаёт холсту на
// колесо, перетаскивание и кнопки. Сама арифметика — в boardViewport.test.js.
const canvases = []
let sceneObjects = []

class FakeCanvas {
  constructor(el, opts) {
    this.el = el
    this.opts = { ...opts }
    this.isDrawingMode = false
    this.selection = false
    this.viewportTransform = [1, 0, 0, 1, 0, 0]
    this.setDimensions = vi.fn((d) => { this.opts.width = d.width; this.opts.height = d.height })
    canvases.push(this)
  }
  on() {}
  off() {}
  add() {}
  remove() {}
  clear() {}
  dispose() {}
  setViewportTransform(v) { this.viewportTransform = v }
  setCursor(c) { this.cursor = c }
  getZoom() { return this.viewportTransform[0] }
  getVpCenter() {
    const [z, , , , tx, ty] = this.viewportTransform
    return { x: (this.opts.width / 2 - tx) / z, y: (this.opts.height / 2 - ty) / z }
  }
  getObjects() { return sceneObjects }
  getActiveObjects() { return [] }
  discardActiveObject() {}
  forEachObject() {}
  requestRenderAll() {}
  getWidth() { return this.opts.width }
  getHeight() { return this.opts.height }
}

vi.mock('fabric', () => ({
  Canvas: FakeCanvas,
  PencilBrush: class { constructor(canvas) { this.canvas = canvas } },
  IText: class {},
  Rect: class {},
  Ellipse: class {},
  FabricImage: { fromURL: () => Promise.resolve({ set() {} }) },
  util: { enlivenObjects: () => Promise.resolve([]) },
}))

let handlers = {}
const board = {
  connected: true,
  sendAdd: vi.fn(),
  sendUpdate: vi.fn(),
  sendRemove: vi.fn(),
  sendClear: vi.fn(),
  sendCursor: vi.fn(),
}
vi.mock('./useLessonBoard.js', () => ({
  useLessonBoard: (_lessonId, _token, _self, h) => { handlers = h; return board },
}))

let settings = null
vi.mock('../../api.js', () => ({
  getBoardObjects: () => Promise.resolve([]),
  getBoardSettings: () => Promise.resolve(settings),
  updateBoardSettings: () => Promise.resolve({}),
  uploadMedia: () => Promise.resolve({ url: '' }),
}))

const { default: LiveBoard } = await import('./LiveBoard.jsx')

const BOX_PROPS = ['clientWidth', 'clientHeight']
const originalBoxProps = {}

beforeEach(() => {
  canvases.length = 0
  settings = null
  // Объект, который преподаватель оставил далеко внизу (в координатах листа).
  sceneObjects = [{ getBoundingRect: () => ({ left: 100, top: 6000, width: 200, height: 80 }) }]
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  for (const prop of BOX_PROPS) {
    originalBoxProps[prop] = Object.getOwnPropertyDescriptor(Element.prototype, prop)
    Object.defineProperty(Element.prototype, prop, {
      configurable: true,
      get() {
        if (!this.classList.contains('board__stage')) return 0
        return prop === 'clientWidth' ? 1000 : 600
      },
    })
  }
})

afterEach(() => {
  cleanup()
  for (const prop of BOX_PROPS) Object.defineProperty(Element.prototype, prop, originalBoxProps[prop])
  delete globalThis.ResizeObserver
  vi.clearAllMocks()
})

async function mount({ isStaff = true } = {}) {
  let utils
  await act(async () => {
    utils = render(
      <I18nProvider>
        <LiveBoard lessonId={7} token="TOK" selfUserId={1} isStaff={isStaff} />
      </I18nProvider>,
    )
  })
  const stage = utils.container.querySelector('.board__stage')
  return { ...utils, stage, canvas: canvases[0], surface: stage.querySelector('canvas') }
}

const ty = (canvas) => canvas.viewportTransform[5]

describe('LiveBoard — лист двигается во все стороны', () => {
  it('колесо над доской двигает лист и не прокручивает страницу под ней', async () => {
    const { stage, canvas } = await mount({ isStaff: false })
    const event = new WheelEvent('wheel', { deltaY: 150, cancelable: true, bubbles: true })

    await act(async () => { stage.dispatchEvent(event) })

    expect(event.defaultPrevented).toBe(true)
    expect(ty(canvas)).toBe(-150)
  })

  it('ученик долистывает колесом до надписи, лежащей далеко внизу', async () => {
    const { stage, canvas } = await mount({ isStaff: false })

    for (let i = 0; i < 80; i++) {
      await act(async () => { stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })) })
    }

    const [zoom, , , , , offsetY] = canvas.viewportTransform
    const top = 6000 * zoom + offsetY
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top + 80 * zoom).toBeLessThanOrEqual(600)
  })

  it('Ctrl + колесо масштабирует вокруг курсора', async () => {
    const { stage, canvas } = await mount({ isStaff: false })

    await act(async () => {
      stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 500, clientY: 300, cancelable: true, bubbles: true }))
    })

    expect(canvas.viewportTransform[0]).toBeGreaterThan(1)
  })

  it('«Рука»: перетаскивание двигает лист, а до холста нажатие не доходит', async () => {
    const { surface, canvas } = await mount({ isStaff: false })
    fireEvent.click(screen.getByRole('button', { name: 'Рука — двигать доску' }))
    const reachedCanvas = vi.fn()
    surface.addEventListener('mousedown', reachedCanvas)

    await act(async () => {
      fireEvent.mouseDown(surface, { button: 0, clientX: 300, clientY: 400 })
      fireEvent.mouseMove(window, { clientX: 300, clientY: 250 })
      fireEvent.mouseUp(window)
    })

    expect(reachedCanvas).not.toHaveBeenCalled()
    expect(ty(canvas)).toBe(-150)
  })

  it('с «Курсором» нажатие доходит до холста — выделять и рисовать по-прежнему можно', async () => {
    const { surface, canvas } = await mount({ isStaff: false })
    fireEvent.click(screen.getByRole('button', { name: 'Курсор' }))
    const reachedCanvas = vi.fn()
    surface.addEventListener('mousedown', reachedCanvas)

    await act(async () => {
      fireEvent.mouseDown(surface, { button: 0, clientX: 300, clientY: 400 })
      fireEvent.mouseMove(window, { clientX: 300, clientY: 250 })
      fireEvent.mouseUp(window)
    })

    expect(reachedCanvas).toHaveBeenCalled()
    expect(ty(canvas)).toBe(0)
  })

  it('средняя кнопка двигает лист при любом инструменте', async () => {
    const { surface, canvas } = await mount()

    await act(async () => {
      fireEvent.mouseDown(surface, { button: 1, clientX: 300, clientY: 400 })
      fireEvent.mouseMove(window, { clientX: 300, clientY: 350 })
      fireEvent.mouseUp(window)
    })

    expect(ty(canvas)).toBe(-50)
  })

  it('зажатый пробел над доской — временная «Рука», отпустили — снова обычный инструмент', async () => {
    const { stage, surface, canvas } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Курсор' }))
    await act(async () => { fireEvent.mouseEnter(stage) })

    await act(async () => { fireEvent.keyDown(window, { key: ' ' }) })
    await act(async () => {
      fireEvent.mouseDown(surface, { button: 0, clientX: 300, clientY: 400 })
      fireEvent.mouseMove(window, { clientX: 300, clientY: 340 })
      fireEvent.mouseUp(window)
    })
    expect(ty(canvas)).toBe(-60)

    await act(async () => { fireEvent.keyUp(window, { key: ' ' }) })
    const reachedCanvas = vi.fn()
    surface.addEventListener('mousedown', reachedCanvas)
    await act(async () => { fireEvent.mouseDown(surface, { button: 0, clientX: 300, clientY: 400 }) })
    expect(reachedCanvas).toHaveBeenCalled()
  })

  it('пробел в поле ввода (чат) доску не двигает и печататься не мешает', async () => {
    const { stage } = await mount()
    await act(async () => { fireEvent.mouseEnter(stage) })
    const input = document.createElement('input')
    document.body.appendChild(input)

    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true })
    await act(async () => { input.dispatchEvent(event) })
    input.remove()

    expect(event.defaultPrevented).toBe(false)
  })

  it('пробел вне доски (курсор не над ней) страницу прокручивать не запрещает', async () => {
    await mount()

    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true })
    await act(async () => { window.dispatchEvent(event) })

    expect(event.defaultPrevented).toBe(false)
  })

  it('когда рисование запрещено, левая кнопка двигает лист и без «Руки»', async () => {
    settings = { drawingDisabled: true, cursorsHidden: false }
    const { surface, canvas } = await mount({ isStaff: false })

    await act(async () => {
      fireEvent.mouseDown(surface, { button: 0, clientX: 100, clientY: 400 })
      fireEvent.mouseMove(window, { clientX: 100, clientY: 300 })
      fireEvent.mouseUp(window)
    })

    expect(ty(canvas)).toBe(-100)
  })

  it('«Рука» доступна и при запрете рисования — остальные инструменты закрыты', async () => {
    settings = { drawingDisabled: true, cursorsHidden: false }
    await mount({ isStaff: false })

    expect(screen.getByRole('button', { name: 'Рука — двигать доску' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Перо' }).disabled).toBe(true)
  })

  it('«Показать всё» собирает в окне и верх, и дальний низ', async () => {
    sceneObjects = [
      { getBoundingRect: () => ({ left: 50, top: 50, width: 200, height: 80 }) },
      { getBoundingRect: () => ({ left: 300, top: 3500, width: 200, height: 80 }) },
    ]
    const { canvas } = await mount({ isStaff: false })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Показать всё' })) })

    const [zoom, , , , offsetX, offsetY] = canvas.viewportTransform
    expect(zoom).toBeLessThan(1)
    expect(50 * zoom + offsetX).toBeGreaterThanOrEqual(0)
    expect(50 * zoom + offsetY).toBeGreaterThanOrEqual(0)
    expect(3580 * zoom + offsetY).toBeLessThanOrEqual(600)
  })

  it('кнопки +/− и «100%» двигают масштаб, подпись показывает его в процентах', async () => {
    const { canvas } = await mount({ isStaff: false })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Уменьшить' })) })
    expect(canvas.viewportTransform[0]).toBeLessThan(1)
    expect(screen.getByRole('button', { name: 'Масштаб 100%' }).textContent).toMatch(/^9\d%$/)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Масштаб 100%' })) })
    expect(canvas.viewportTransform[0]).toBe(1)
    expect(screen.getByRole('button', { name: 'Масштаб 100%' }).textContent).toBe('100%')
  })

  it('у доски две полосы прокрутки, и ползунок вертикальной короче половины, когда лист длинный', async () => {
    const { container } = await mount({ isStaff: false })

    expect(container.querySelector('.board__scroll--v')).toBeTruthy()
    expect(container.querySelector('.board__scroll--h')).toBeTruthy()
    const thumb = container.querySelector('.board__scroll--v .board__thumb')
    expect(parseFloat(thumb.style.height)).toBeLessThan(50)
  })

  it('курсор преподавателя остаётся на своём месте листа, когда ученик прокрутил доску', async () => {
    const { container, stage } = await mount({ isStaff: false })
    await act(async () => { handlers.onCursor({ userId: 9, name: 'Teacher', x: 150, y: 120 }) })
    const cursor = () => container.querySelector('.board__cursor')
    expect(cursor().style.top).toBe('120px')

    await act(async () => { stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true })) })

    expect(cursor().style.top).toBe('20px')
    expect(cursor().style.left).toBe('150px')
  })
})
