// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { writeLessonParam } from './lessonParam.js'

beforeEach(() => {
  window.history.replaceState(null, '', '/?screen=video-dictation&theme=dark')
})

it('пишет и снимает ?lesson=, чужие параметры не трогает', () => {
  writeLessonParam('rainy-day-k3f9q')
  expect(window.location.search).toBe('?screen=video-dictation&theme=dark&lesson=rainy-day-k3f9q')
  writeLessonParam(null)
  expect(window.location.search).toBe('?screen=video-dictation&theme=dark')
})
