// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

// Доска на планшете: повернули iPad — .board__stage стал другого размера, и
// холст обязан пересчитаться под него. Настоящий fabric в jsdom не поднять
// (нет 2d-контекста), поэтому движок подменён: проверяем не рисование, а то,
// какие размеры компонент ему выдаёт.
const canvases = []

class FakeCanvas {
  constructor(el, opts) {
    this.el = el
    this.opts = opts
    this.isDrawingMode = false
    this.selection = false
    this.setDimensions = vi.fn()
    canvases.push(this)
  }
  on() {}
  off() {}
  add() {}
  remove() {}
  clear() {}
  dispose() {}
  getObjects() { return [] }
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

const board = {
  connected: true,
  sendAdd: vi.fn(),
  sendUpdate: vi.fn(),
  sendRemove: vi.fn(),
  sendClear: vi.fn(),
  sendCursor: vi.fn(),
}
vi.mock('./useLessonBoard.js', () => ({ useLessonBoard: () => board }))
vi.mock('../../api.js', () => ({
  getBoardObjects: () => Promise.resolve([]),
  getBoardSettings: () => Promise.resolve(null),
  updateBoardSettings: () => Promise.resolve({}),
  uploadMedia: () => Promise.resolve({ url: '' }),
}))

const { default: LiveBoard } = await import('./LiveBoard.jsx')

// Размер сцены задаёт тест: jsdom ничего не раскладывает, а нам важно
// именно то, ОТКУДА компонент берёт число.
let stageSize = { width: 0, height: 0 }
let onResizeObserved = null

class FakeResizeObserver {
  constructor(cb) { onResizeObserved = cb }
  observe() {}
  disconnect() { onResizeObserved = null }
}

const BOX_PROPS = ['clientWidth', 'clientHeight']
const originalBoxProps = {}

beforeEach(() => {
  canvases.length = 0
  onResizeObserved = null
  stageSize = { width: 1000, height: 600 }
  globalThis.ResizeObserver = FakeResizeObserver
  for (const prop of BOX_PROPS) {
    originalBoxProps[prop] = Object.getOwnPropertyDescriptor(Element.prototype, prop)
    Object.defineProperty(Element.prototype, prop, {
      configurable: true,
      get() {
        if (!this.classList.contains('board__stage')) return 0
        return prop === 'clientWidth' ? stageSize.width : stageSize.height
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

async function mount() {
  await act(async () => {
    render(
      <I18nProvider>
        <LiveBoard lessonId={7} token="TOK" selfUserId={1} isStaff />
      </I18nProvider>,
    )
  })
}

describe('LiveBoard — размер холста и поворот планшета', () => {
  it('холст создаётся по внутреннему боксу сцены, а не по её рамке', async () => {
    await mount()
    expect(canvases).toHaveLength(1)
    // getBoundingClientRect в jsdom — нули; если бы размер брался оттуда,
    // здесь оказались бы запасные 600×480.
    expect(canvases[0].opts.width).toBe(1000)
    expect(canvases[0].opts.height).toBe(600)
  })

  it('поворот планшета пересчитывает размер холста и не вылезает за сцену', async () => {
    await mount()
    const canvas = canvases[0]
    expect(onResizeObserved).toBeTypeOf('function')

    // Ландшафт: сцена стала шире и ниже, размеры дробные.
    await act(async () => {
      onResizeObserved([{ contentRect: { width: 1180.6, height: 610.4 } }])
    })

    expect(canvas.setDimensions).toHaveBeenCalledWith({ width: 1180, height: 610 })
  })

  it('пустая сцена (вкладка скрыта) размер не сбрасывает', async () => {
    await mount()
    const canvas = canvases[0]
    await act(async () => {
      onResizeObserved([{ contentRect: { width: 0, height: 0 } }])
    })
    expect(canvas.setDimensions).not.toHaveBeenCalled()
  })
})
