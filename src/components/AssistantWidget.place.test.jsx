// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Размер и место окна Луны (placement.js): компактное по умолчанию, «телефон» по
// кнопке, кнопку и окно можно перетащить, место запоминается.
vi.mock('../lib/speech.js', () => ({ unlockSpeech: () => {}, stopTts: () => {}, playUrl: () => true }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

// В jsdom нет PointerEvent — без него у события не было бы clientX.
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.isPrimary = init.isPrimary ?? true
    }
  }
}

// jsdom не раскладывает страницу: прямоугольник элемента берём из его же style —
// его и ставит виджет.
function rectFromStyle() {
  const px = (v) => parseFloat(v) || 0
  const left = px(this.style.left)
  const top = px(this.style.top)
  const width = px(this.style.width) || 56
  const height = px(this.style.height) || 56
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
}

function Harness() {
  return (
    <I18nProvider>
      <div className="scr-in">Главная</div>
      <AssistantWidget token="tok" screen="home" enabled />
    </I18nProvider>
  )
}

const launcher = () => screen.getByRole('button', { name: 'Помощник' })

// jsdom 1024 × 768
const VW = 1024
const VH = 768

describe('место и размер окна Луны', () => {
  let rectSpy
  beforeEach(() => {
    localStorage.clear()
    rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(rectFromStyle)
  })
  afterEach(() => rectSpy.mockRestore())

  it('кнопка — в правом нижнем углу, окно встаёт на её место компактным', () => {
    render(<Harness />)
    expect(launcher().style.left).toBe(`${VW - 24 - 56}px`)
    expect(launcher().style.top).toBe(`${VH - 24 - 56}px`)
    fireEvent.click(launcher())
    const panel = screen.getByRole('dialog', { name: 'Луна' })
    expect(panel.style.width).toBe('320px')
    expect(panel.style.height).toBe('480px')
    // Правый нижний угол окна — там же, где был у кнопки.
    expect(parseFloat(panel.style.left) + 320).toBe(VW - 24)
    expect(parseFloat(panel.style.top) + 480).toBe(VH - 24)
  })

  it('«Развернуть» — до размера телефона, но не выше экрана; обратно — компактное', () => {
    render(<Harness />)
    fireEvent.click(launcher())
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть до размера телефона' }))
    const panel = screen.getByRole('dialog', { name: 'Луна' })
    expect(panel.style.width).toBe('390px')
    expect(panel.style.height).toBe(`${VH - 68 - 12}px`)
    fireEvent.click(screen.getByRole('button', { name: 'Сделать окно компактным' }))
    expect(panel.style.width).toBe('320px')
  })

  it('кнопку перетащили — окно не открылось, место запомнилось и у окна', () => {
    const { unmount } = render(<Harness />)
    const btn = launcher()
    const x0 = VW - 24 - 56
    const y0 = VH - 24 - 56
    fireEvent.pointerDown(btn, { button: 0, clientX: x0 + 10, clientY: y0 + 10 })
    fireEvent.pointerMove(btn, { clientX: 110, clientY: 110 })
    fireEvent.pointerUp(btn, { clientX: 110, clientY: 110 })
    fireEvent.click(btn)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(btn.style.left).toBe('100px')
    expect(btn.style.top).toBe('100px')
    expect(JSON.parse(localStorage.getItem('jts_assistant_place'))).toEqual({ h: 'l', x: 100, v: 't', y: 100 })

    // Перезагрузка: кнопка там же, окно открывается от того же угла.
    unmount()
    render(<Harness />)
    expect(launcher().style.left).toBe('100px')
    fireEvent.click(launcher())
    const panel = screen.getByRole('dialog', { name: 'Луна' })
    expect(panel.style.left).toBe('100px')
    expect(panel.style.top).toBe('100px')
  })

  it('окно таскается за шапку, двойной клик возвращает в угол', () => {
    render(<Harness />)
    fireEvent.click(launcher())
    const panel = screen.getByRole('dialog', { name: 'Луна' })
    const head = panel.querySelector('.asst__head')
    const left = parseFloat(panel.style.left)
    const top = parseFloat(panel.style.top)
    fireEvent.pointerDown(head, { button: 0, clientX: left + 100, clientY: top + 20 })
    fireEvent.pointerMove(head, { clientX: left - 300, clientY: top - 100 })
    fireEvent.pointerUp(head, { clientX: left - 300, clientY: top - 100 })
    expect(panel.style.left).toBe(`${left - 400}px`)
    expect(panel.style.top).toBe(`${top - 120}px`)
    fireEvent.doubleClick(head)
    expect(panel.style.left).toBe(`${left}px`)
    expect(localStorage.getItem('jts_assistant_place')).toBeNull()
  })

  it('нажатие по кнопке в шапке окно не двигает', () => {
    render(<Harness />)
    fireEvent.click(launcher())
    const panel = screen.getByRole('dialog', { name: 'Луна' })
    const left = panel.style.left
    const close = screen.getByRole('button', { name: 'Закрыть' })
    fireEvent.pointerDown(close, { button: 0, clientX: 900, clientY: 300 })
    fireEvent.pointerMove(close, { clientX: 500, clientY: 300 })
    fireEvent.pointerUp(close, { clientX: 500, clientY: 300 })
    expect(panel.style.left).toBe(left)
  })
})
