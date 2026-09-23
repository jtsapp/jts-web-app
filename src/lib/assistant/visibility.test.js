import { describe, it, expect } from 'vitest'
import { assistantAllowedOn } from './visibility.js'

const student = { token: 't' }

describe('где показывать помощника', () => {
  it.each(['home', 'lessons', 'lesson-workspace', 'kingdom-interior', 'practice', 'homework', 'vocab', 'profile', 'ielts', 'ielts-progress', 'tutor-dashboard', 'pricing'])(
    '%s — показываем',
    (screen) => {
      expect(assistantAllowedOn(screen, student)).toBe(true)
    },
  )

  // Там помощник был бы шпаргалкой.
  it.each(['test', 'test-intro', 'speaking-test', 'ielts-listening', 'ielts-reading', 'ielts-writing', 'ielts-speaking'])(
    '%s — экзамен, не показываем',
    (screen) => {
      expect(assistantAllowedOn(screen, student)).toBe(false)
    },
  )

  it.each(['live-lesson', 'tutor-voice-chat', 'tutor-choose', 'otp', 'welcome'])(
    '%s — не показываем',
    (screen) => {
      expect(assistantAllowedOn(screen, student)).toBe(false)
    },
  )

  it('без входа, преподавателю и классному аккаунту — нет', () => {
    expect(assistantAllowedOn('home', { token: null })).toBe(false)
    expect(assistantAllowedOn('home', { token: 't', teacher: true })).toBe(false)
    expect(assistantAllowedOn('home', { token: 't', boothAccount: true })).toBe(false)
  })

  it('без экрана — нет', () => {
    expect(assistantAllowedOn(null, student)).toBe(false)
  })
})
