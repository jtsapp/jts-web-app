// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { holdTours } from '../lib/tourBus.js'

vi.mock('../i18n/LanguageContext.jsx', () => ({ useT: () => (key) => key }))

import OnboardingTour from './OnboardingTour.jsx'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function scrollIntoView() {}
})

afterEach(() => {
  holdTours('celebrate', false)
  cleanup()
  document.body.innerHTML = ''
})

const intro = { title: 'Привет', text: 'Тур', cta: 'Начать', skip: 'Пропустить' }

describe('тур на паузе, пока App держит своё окно', () => {
  it('окно открыто до тура — тура нет, после окна он начинается', () => {
    holdTours('celebrate', true)
    render(<OnboardingTour look="coach" intro={intro} steps={[]} />)
    expect(document.querySelector('.t-tour')).toBeNull()

    act(() => holdTours('celebrate', false))
    expect(document.querySelector('.t-tour__intro-go')).not.toBeNull()
  })

  it('окно пришло посреди тура — тур снимается и отпускает прокрутку, потом идёт заново', () => {
    const target = document.createElement('div')
    target.className = 'target'
    document.body.appendChild(target)
    const steps = [{ selector: '.target', title: 'Шаг', text: 'Текст' }]
    render(<OnboardingTour steps={steps} />)
    expect(document.querySelector('.t-tour__pop')).not.toBeNull()
    expect(document.documentElement.style.overflow).toBe('hidden')

    act(() => holdTours('celebrate', true))
    expect(document.querySelector('.t-tour')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('')

    act(() => holdTours('celebrate', false))
    expect(document.querySelector('.t-tour__pop')).not.toBeNull()
  })

  it('Escape на окне не закрывает поставленный на паузу тур', () => {
    const onFinish = vi.fn()
    holdTours('celebrate', true)
    render(<OnboardingTour look="coach" intro={intro} steps={[]} onFinish={onFinish} />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onFinish).not.toHaveBeenCalled()
  })
})

describe('маскоты приветствия', () => {
  const srcs = () => [...document.querySelectorAll('.t-tour__intro-art')].map((img) => img.getAttribute('src'))

  it('без intro.art — нарезка макета «Главной» на всех четырёх местах', () => {
    render(<OnboardingTour look="coach" intro={intro} steps={[]} />)
    expect(document.querySelector('.t-tour__intro--cast')).toBeNull()
    expect(srcs()).toEqual([
      '/assets/first-login/welcome-top1.webp',
      '/assets/first-login/welcome-top2.webp',
      '/assets/first-login/welcome-left.webp',
      '/assets/first-login/welcome-right.webp',
    ])
  })

  it('intro.art экрана — свои фигуры, пустое место остаётся пустым', () => {
    const art = { top1: '/a.webp', left: '/b.webp', right: '/c.webp' }
    render(<OnboardingTour look="coach" intro={{ ...intro, art }} steps={[]} />)
    expect(document.querySelector('.t-tour__intro--cast')).not.toBeNull()
    expect(srcs()).toEqual(['/a.webp', '/b.webp', '/c.webp'])
    expect(document.querySelector('.t-tour__intro-art--top2')).toBeNull()
  })
})
