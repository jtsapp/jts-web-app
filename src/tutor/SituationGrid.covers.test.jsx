// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import SituationGrid from './SituationGrid.jsx'

vi.mock('../i18n/LanguageContext.jsx', () => ({ useLang: () => ({ t: (key) => key }) }))

// Обложки — главный груз страницы тьютора: на проде они делят канал с лицом.
const covers = (container) => [...container.querySelectorAll('.tp-scen__img')]
const started = (container) => covers(container).filter((c) => c.getAttribute('src'))

describe('обложки ситуаций', () => {
  let observers

  beforeEach(() => {
    observers = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb, opts) {
          this.cb = cb
          this.opts = opts
          this.el = null
          observers.push(this)
        }
        observe(el) {
          this.el = el
        }
        disconnect() {
          this.el = null
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const reveal = (i) => act(() => observers[i].cb([{ isIntersecting: true, target: observers[i].el }]))

  it('пока обложка далеко от экрана, файл не просится', () => {
    const { container } = render(<SituationGrid />)
    expect(covers(container).length).toBeGreaterThan(0)
    expect(started(container)).toHaveLength(0)
  })

  it('обложка у экрана начинает качаться, остальные ждут', () => {
    const { container } = render(<SituationGrid />)
    reveal(0)
    expect(started(container)).toHaveLength(1)
  })

  it('пока идёт лицо, не качается и обложка у экрана', () => {
    const { container, rerender } = render(<SituationGrid hold />)
    reveal(0)
    expect(started(container)).toHaveLength(0)

    rerender(<SituationGrid hold={false} />)
    expect(started(container)).toHaveLength(1)
  })

  // Лицо могло не загрузиться вовсе: сетка не должна остаться серой навсегда.
  it('лицо не приехало — через 4 с обложки всё равно идут', () => {
    vi.useFakeTimers()
    const { container } = render(<SituationGrid hold />)
    reveal(0)
    act(() => vi.advanceTimersByTime(3999))
    expect(started(container)).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(started(container)).toHaveLength(1)
  })

  it('без наблюдателя в браузере обложки просто грузятся', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<SituationGrid />)
    expect(started(container).length).toBe(covers(container).length)
  })
})
