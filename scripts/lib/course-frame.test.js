import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { isFrame } = require('./course-frame.js')

describe('course-frame', () => {
  it('рамка — строка с пропуском «…» или «...»', () => {
    expect(isFrame('Would you mind …ing?')).toBe(true)
    expect(isFrame("I'll … to …")).toBe(true)
    expect(isFrame('<b>I\'d definitely recommend…</b>')).toBe(true)
    expect(isFrame('We don\'t have a lot in common, but...')).toBe(true)
  })

  it('законченная фраза — не рамка', () => {
    expect(isFrame("I've got some good news!")).toBe(false)
    expect(isFrame('Go to the cinema. Go to the theatre.')).toBe(false)
    expect(isFrame('')).toBe(false)
    expect(isFrame(null)).toBe(false)
  })
})
