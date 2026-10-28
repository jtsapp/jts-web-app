// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { holdTours, useToursHeld } from './tourBus.js'

describe('пауза туров на время окна приложения', () => {
  afterEach(() => {
    holdTours('a', false)
    holdTours('b', false)
  })

  function Probe({ seen }) {
    seen.push(useToursHeld())
    return null
  }

  it('тур на паузе, пока держит хоть одна причина', () => {
    const seen = []
    render(<Probe seen={seen} />)
    expect(seen.at(-1)).toBe(false)
    act(() => holdTours('a', true))
    expect(seen.at(-1)).toBe(true)
    act(() => holdTours('b', true))
    act(() => holdTours('a', false))
    expect(seen.at(-1)).toBe(true)
    act(() => holdTours('b', false))
    expect(seen.at(-1)).toBe(false)
  })

  it('повторное снятие одной причины не снимает чужую', () => {
    holdTours('a', true)
    holdTours('b', false)
    holdTours('b', false)
    const seen = []
    render(<Probe seen={seen} />)
    expect(seen.at(-1)).toBe(true)
  })
})
