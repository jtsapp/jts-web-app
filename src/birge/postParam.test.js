// @vitest-environment jsdom
import { it, expect, beforeEach } from 'vitest'
import { writePostParam } from './postParam.js'

beforeEach(() => {
  window.history.replaceState(null, '', '/?screen=birge&theme=dark')
})

it('пишет и снимает ?post=, чужие параметры не трогает', () => {
  writePostParam(101)
  expect(window.location.search).toBe('?screen=birge&theme=dark&post=101')
  writePostParam(null)
  expect(window.location.search).toBe('?screen=birge&theme=dark')
})
