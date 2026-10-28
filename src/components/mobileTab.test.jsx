// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MobileTabContext, useMobileTab } from './mobileTab.js'

function Shell({ active }) {
  useMobileTab(active)
  return null
}

describe('вкладка нижней панели от оболочки экрана', () => {
  it('оболочка сообщает свою вкладку App, смена экрана — новую', () => {
    const set = vi.fn()
    const { rerender } = render(
      <MobileTabContext.Provider value={set}>
        <Shell active="practice" />
      </MobileTabContext.Provider>,
    )
    expect(set).toHaveBeenLastCalledWith('practice')
    rerender(
      <MobileTabContext.Provider value={set}>
        <Shell active={null} />
      </MobileTabContext.Provider>,
    )
    expect(set).toHaveBeenLastCalledWith(null)
  })

  it('без App (тесты экранов) — молча ничего', () => {
    expect(() => render(<Shell active="home" />)).not.toThrow()
  })
})
