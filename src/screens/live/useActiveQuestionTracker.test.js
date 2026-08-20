// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useActiveQuestionTracker } from './useActiveQuestionTracker.js'

// jsdom не считает layout, поэтому все геометрии — вручную.
function mockRect(el, top, bottom) {
  el.getBoundingClientRect = () => ({ top, bottom, height: bottom - top, left: 0, right: 100, width: 100 })
}

function buildContainer(rects) {
  const container = document.createElement('div')
  rects.forEach(([id, top, bottom]) => {
    const node = document.createElement('div')
    node.setAttribute('data-question-id', id)
    mockRect(node, top, bottom)
    container.appendChild(node)
  })
  document.body.appendChild(container)
  return container
}

beforeEach(() => {
  vi.useFakeTimers()
  window.innerHeight = 800
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('useActiveQuestionTracker', () => {
  it('picks the last block whose top has crossed the reading line immediately on mount', () => {
    const container = buildContainer([
      ['q1', -300, -200], // уже пролистан выше экрана
      ['q2', 50, 200], // как раз пересёк линию чтения (100) — читают его
      ['q3', 500, 700], // ещё не долистали
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))

    expect(onActiveChange).toHaveBeenCalledTimes(1)
    expect(onActiveChange).toHaveBeenCalledWith('q2')
  })

  it('does not let a tall block that still fills the screen block the next, already-reached one', () => {
    // Регрессия: старая метрика «ближе к центру» отдавала бы q1 (его центр —
    // 400, центр вьюпорта), хотя студент уже читает q2 у самого верха.
    const container = buildContainer([
      ['q1', -100, 750], // высокая карточка, всё ещё занимает почти весь экран
      ['q2', 50, 90], // короткая, но уже наверху — её и читают
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))

    expect(onActiveChange).toHaveBeenCalledWith('q2')
  })

  it('throttles scroll, re-picks after settling, and skips duplicate ids', () => {
    const container = buildContainer([
      ['q1', 50, 200],
      ['q2', 700, 800],
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    expect(onActiveChange).toHaveBeenLastCalledWith('q1')

    // Прокрутили: q2 теперь пересёк линию чтения. Событие ловится на document (capture).
    mockRect(container.children[0], -400, -300)
    mockRect(container.children[1], 50, 150)
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(199)
    })
    // Ещё не прошло 200мс — второго вызова нет.
    expect(onActiveChange).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(1))
    expect(onActiveChange).toHaveBeenCalledTimes(2)
    expect(onActiveChange).toHaveBeenLastCalledWith('q2')

    // Ещё скролл, но геометрия не изменилась (тот же q2 читают) — дубль не шлём.
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(200)
    })
    expect(onActiveChange).toHaveBeenCalledTimes(2)
  })

  it('does nothing when disabled', () => {
    const container = buildContainer([['q1', 50, 90]])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, false))
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('keeps the scroll listener alive across a parent re-render with a new callback reference (regression: was torn down + reattached every render, losing scroll events)', () => {
    const container = buildContainer([
      ['q1', 50, 200],
      ['q2', 700, 800],
    ])
    const calls1 = []
    const calls2 = []
    const ref = { current: container }
    const { rerender } = renderHook(
      ({ onChange }) => useActiveQuestionTracker(ref, onChange, true),
      { initialProps: { onChange: (id) => calls1.push(id) } }
    )
    expect(calls1).toEqual(['q1'])

    // Родитель ре-рендерится с НОВОЙ функцией-колбэком (как LiveLessonPage
    // на каждый тик поллинга) — эффект не должен пересобираться из-за этого.
    rerender({ onChange: (id) => calls2.push(id) })

    mockRect(container.children[0], -400, -300)
    mockRect(container.children[1], 50, 150)
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(200)
    })

    expect(calls2).toEqual(['q2'])
  })

  it('falls back to the very first block when nothing has reached the reading line yet', () => {
    const container = buildContainer([
      ['q1', 500, 600],
      ['q2', 900, 1000],
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    expect(onActiveChange).toHaveBeenCalledWith('q1')
  })

  it('reports the focused field immediately, without waiting for scroll (regression: several short cards fit on screen at once - focusin is the only signal, scroll never fires at all)', () => {
    const container = buildContainer([
      ['q1', 500, 600], // ниже линии чтения — скролл ничего не выбрал
      ['q2', 700, 800],
    ])
    const input = document.createElement('input')
    container.children[1].appendChild(input)
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    onActiveChange.mockClear() // сбросить исходный pick() при монтировании (q1)

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    expect(onActiveChange).toHaveBeenCalledWith('q2')
  })

  it('skips a duplicate report when focusin lands on a field whose question is already the tracked one', () => {
    const container = buildContainer([['q1', 50, 90]])
    const input = document.createElement('input')
    container.children[0].appendChild(input)
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    expect(onActiveChange).toHaveBeenCalledTimes(1) // исходный pick() уже выбрал q1

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    expect(onActiveChange).toHaveBeenCalledTimes(1)
  })

  it('ignores focusin on an element outside any tracked question', () => {
    const container = buildContainer([['q1', 500, 600]])
    const outside = document.createElement('input')
    container.appendChild(outside) // не внутри [data-question-id]
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    onActiveChange.mockClear()

    act(() => {
      outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    expect(onActiveChange).not.toHaveBeenCalled()
  })
})
