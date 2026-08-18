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
  it('picks the question closest to viewport center immediately on mount', () => {
    const container = buildContainer([
      ['q1', 0, 100],
      ['q2', 380, 420], // центр вьюпорта — 400
      ['q3', 700, 800],
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))

    expect(onActiveChange).toHaveBeenCalledTimes(1)
    expect(onActiveChange).toHaveBeenCalledWith('q2')
  })

  it('throttles scroll, re-picks after settling, and skips duplicate ids', () => {
    const container = buildContainer([
      ['q1', 380, 420],
      ['q2', 700, 800],
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    expect(onActiveChange).toHaveBeenLastCalledWith('q1')

    // Прокрутили: q2 теперь у центра. Событие ловится на document (capture).
    mockRect(container.children[0], -400, -300)
    mockRect(container.children[1], 380, 420)
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(199)
    })
    // Ещё не прошло 200мс — второго вызова нет.
    expect(onActiveChange).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(1))
    expect(onActiveChange).toHaveBeenCalledTimes(2)
    expect(onActiveChange).toHaveBeenLastCalledWith('q2')

    // Ещё скролл, но геометрия не изменилась (тот же q2 у центра) — дубль не шлём.
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(200)
    })
    expect(onActiveChange).toHaveBeenCalledTimes(2)
  })

  it('does nothing when disabled', () => {
    const container = buildContainer([['q1', 380, 420]])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, false))
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('keeps the scroll listener alive across a parent re-render with a new callback reference (regression: was torn down + reattached every render, losing scroll events)', () => {
    const container = buildContainer([
      ['q1', 380, 420],
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
    mockRect(container.children[1], 380, 420)
    act(() => {
      document.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(200)
    })

    expect(calls2).toEqual(['q2'])
  })

  it('ignores questions fully outside the viewport', () => {
    const container = buildContainer([
      ['q1', -500, -400],
      ['q2', 900, 1000],
    ])
    const onActiveChange = vi.fn()
    const ref = { current: container }
    renderHook(() => useActiveQuestionTracker(ref, onActiveChange, true))
    expect(onActiveChange).not.toHaveBeenCalled()
  })
})
