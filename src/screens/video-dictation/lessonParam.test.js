// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { clearLessonParam, writeLessonParam } from './lessonParam.js'

beforeEach(() => {
  window.history.replaceState(null, '', '/?screen=video-dictation&theme=dark')
})

it('пишет и снимает ?lesson=, чужие параметры не трогает', () => {
  writeLessonParam('rainy-day-k3f9q')
  expect(window.location.search).toBe('?screen=video-dictation&theme=dark&lesson=rainy-day-k3f9q')
  clearLessonParam('rainy-day-k3f9q')
  expect(window.location.search).toBe('?screen=video-dictation&theme=dark')
})

it('не снимает ?lesson=, который уже стал чужим (id урока lesson-workspace)', () => {
  writeLessonParam('rainy-day-k3f9q')
  window.history.replaceState(null, '', '/?screen=lesson-workspace&lesson=4821')
  clearLessonParam('rainy-day-k3f9q')
  expect(window.location.search).toBe('?screen=lesson-workspace&lesson=4821')
  clearLessonParam(null)
  expect(window.location.search).toBe('?screen=lesson-workspace&lesson=4821')
})
