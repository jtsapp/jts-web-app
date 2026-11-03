// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { fireEvent, render } from '@testing-library/react'
import TutorPortrait from './TutorPortrait.jsx'
import { TUTORS } from './tutors.js'

const dexter = TUTORS.find((t) => t.key === 'dexter')
const shown = (container) => container.querySelector('.tp-portrait__img.is-on').getAttribute('src')
const img = (container, src) => container.querySelector(`.tp-portrait__img[src="${src}"]`)

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

  // Замер 04.11.2026: на Slow 4G рамка пустела на 270–300 мс при первом показе эмоции.
  describe('смена лица', () => {
    it('старое лицо остаётся, пока новое не загрузилось', () => {
      const { container, rerender } = render(<TutorPortrait tutor={dexter} />)
      fireEvent.load(img(container, dexter.portrait))
      rerender(<TutorPortrait tutor={dexter} emotion="happy" />)
      expect(shown(container)).toBe(dexter.portrait)

      fireEvent.load(img(container, dexter.portraits.happy))
      expect(shown(container)).toBe(dexter.portraits.happy)
    })

    it('файл эмоции не загрузился — остаётся прежнее лицо, а не пустая рамка', () => {
      const { container, rerender } = render(<TutorPortrait tutor={dexter} />)
      fireEvent.load(img(container, dexter.portrait))
      rerender(<TutorPortrait tutor={dexter} emotion="happy" />)
      fireEvent.error(img(container, dexter.portraits.happy))
      expect(shown(container)).toBe(dexter.portrait)
    })

    it('эмоция сменилась, пока файл в пути, — ждём ту, что нужна сейчас', () => {
      const { container, rerender } = render(<TutorPortrait tutor={dexter} />)
      fireEvent.load(img(container, dexter.portrait))
      rerender(<TutorPortrait tutor={dexter} emotion="happy" />)
      rerender(<TutorPortrait tutor={dexter} emotion="thinking" />)
      fireEvent.load(img(container, dexter.portraits.happy))
      expect(shown(container)).toBe(dexter.portrait)

      fireEvent.load(img(container, dexter.portraits.thinking))
      expect(shown(container)).toBe(dexter.portraits.thinking)
    })

    it('возврат к уже загруженному лицу — сразу', () => {
      const { container, rerender } = render(<TutorPortrait tutor={dexter} />)
      fireEvent.load(img(container, dexter.portrait))
      rerender(<TutorPortrait tutor={dexter} emotion="happy" />)
      fireEvent.load(img(container, dexter.portraits.happy))
      rerender(<TutorPortrait tutor={dexter} />)
      expect(shown(container)).toBe(dexter.portrait)
    })
  })

  describe('прогрев и готовность', () => {
    it('эмоции начинают качаться только после первого лица', () => {
      const { container } = render(<TutorPortrait tutor={dexter} />)
      expect(container.querySelectorAll('.tp-portrait__img')).toHaveLength(1)

      fireEvent.load(img(container, dexter.portrait))
      for (const src of Object.values(dexter.portraits)) {
        expect(img(container, src), src).not.toBeNull()
      }
      expect(shown(container)).toBe(dexter.portrait)
    })

    it('первое лицо просит у браузера высокий приоритет, прогрев — низкий', () => {
      const { container } = render(<TutorPortrait tutor={dexter} />)
      expect(img(container, dexter.portrait).getAttribute('fetchpriority')).toBe('high')

      fireEvent.load(img(container, dexter.portrait))
      expect(img(container, dexter.portraits.happy).getAttribute('fetchpriority')).toBe('low')
    })

    it('у тьютора без эмоций прогревать нечего', () => {
      const luna = TUTORS.find((t) => t.key === 'luna')
      const { container } = render(<TutorPortrait tutor={luna} />)
      fireEvent.load(img(container, luna.portrait))
      expect(container.querySelectorAll('.tp-portrait__img')).toHaveLength(1)
    })

    // Сетка ситуаций ждёт этот сигнал: сбой лица не должен оставить её без картинок.
    it('onReady срабатывает и на загрузку, и на сбой первого лица', () => {
      for (const event of ['load', 'error']) {
        const onReady = vi.fn()
        const { container, unmount } = render(<TutorPortrait tutor={dexter} onReady={onReady} />)
        expect(onReady).not.toHaveBeenCalled()
        fireEvent[event](img(container, dexter.portrait))
        expect(onReady).toHaveBeenCalled()
        unmount()
      }
    })

    // Профиль может догрузиться, когда страница уже открыта: чужая отметка «загружено» оставила бы лицо прежнего тьютора.
    it('смена тьютора начинает заново', () => {
      const luna = TUTORS.find((t) => t.key === 'luna')
      const { container, rerender } = render(<TutorPortrait tutor={dexter} />)
      fireEvent.load(img(container, dexter.portrait))
      rerender(<TutorPortrait tutor={luna} />)
      expect(shown(container)).toBe(luna.portrait)
      expect(container.querySelectorAll('.tp-portrait__img')).toHaveLength(1)
    })
  })

  // Опечатка в пути не ловится ничем, кроме пустой рамки посреди звонка.
  it('каждая картинка лица лежит в public/', () => {
    for (const t of TUTORS) {
      for (const src of [t.portrait, t.mini, ...Object.values(t.portraits || {})].filter(Boolean)) {
        expect(existsSync(`public${src}`), `${t.key}: ${src}`).toBe(true)
      }
    }
  })

  it('у каждого тьютора есть маленькое лицо для кружка', () => {
    for (const t of TUTORS) expect(t.mini, t.key).toBeTruthy()
  })
})
