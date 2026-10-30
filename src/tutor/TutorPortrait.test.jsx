// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { render } from '@testing-library/react'
import TutorPortrait from './TutorPortrait.jsx'
import { TUTORS } from './tutors.js'

const dexter = TUTORS.find((t) => t.key === 'dexter')
const shown = (container) => container.querySelector('.tp-portrait__img.is-on').getAttribute('src')

describe('TutorPortrait', () => {
  it('у Декстера «слушает» — своя поза, а не нейтральное лицо', () => {
    const { container } = render(<TutorPortrait tutor={dexter} emotion="listening" />)
    expect(shown(container)).toBe(dexter.portraits.listening)
  })

  it('злость и ярость — одно лицо «Злится»', () => {
    for (const emotion of ['angry', 'rage']) {
      const { container, unmount } = render(<TutorPortrait tutor={dexter} emotion={emotion} />)
      expect(shown(container)).toBe(dexter.portraits.angry)
      unmount()
    }
  })

  // Эмоция без своего варианта не должна оставлять рамку пустой.
  it('без своего варианта — нейтральное лицо', () => {
    for (const emotion of ['sympathy', 'sleepy', 'idle', 'constructor']) {
      const { container, unmount } = render(<TutorPortrait tutor={dexter} emotion={emotion} />)
      expect(shown(container)).toBe(dexter.portrait)
      unmount()
    }
  })

  it('у тьютора без эмоций любая эмоция — его единственное лицо', () => {
    const luna = TUTORS.find((t) => t.key === 'luna')
    const { container } = render(<TutorPortrait tutor={luna} emotion="angry" />)
    expect(shown(container)).toBe(luna.portrait)
  })

  // Опечатка в пути не ловится ничем, кроме пустой рамки посреди звонка.
  it('каждая картинка лица лежит в public/', () => {
    for (const t of TUTORS) {
      for (const src of [t.portrait, ...Object.values(t.portraits || {})].filter(Boolean)) {
        expect(existsSync(`public${src}`), `${t.key}: ${src}`).toBe(true)
      }
    }
  })
})
