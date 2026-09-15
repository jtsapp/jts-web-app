// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TutorFace from './TutorFace.jsx'

const shownSrc = (container) => container.querySelector('.t-face__img.is-on').getAttribute('src')
const img = (container, key) => container.querySelector(`img[src="/tutor/buddy/${key}.webp"]`)

describe('TutorFace', () => {
  it('на первом кадре сразу показывает запрошенную эмоцию', () => {
    const { container, getByRole } = render(<TutorFace emotion="angry" />)
    expect(shownSrc(container)).toBe('/tutor/buddy/angry.webp')
    expect(getByRole('img').getAttribute('aria-label')).toBe('Злится')
  })

  it('незнакомый ключ показывает дефолт', () => {
    const { container } = render(<TutorFace emotion="nope" />)
    expect(shownSrc(container)).toBe('/tutor/buddy/idle.webp')
  })

  it('держит прежнее лицо, пока новое не догрузилось', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" />)
    rerender(<TutorFace emotion="happy" />)
    expect(shownSrc(container)).toBe('/tutor/buddy/idle.webp')

    fireEvent.load(img(container, 'happy'))
    expect(shownSrc(container)).toBe('/tutor/buddy/happy.webp')
  })

  it('пока тьютор говорит — «Говорит», замолчал — снова его эмоция', () => {
    const { container, rerender } = render(<TutorFace emotion="angry" />)
    fireEvent.load(img(container, 'angry'))

    rerender(<TutorFace emotion="angry" speaking />)
    fireEvent.load(img(container, 'talking'))
    expect(shownSrc(container)).toBe('/tutor/buddy/talking.webp')

    rerender(<TutorFace emotion="angry" speaking={false} />)
    expect(shownSrc(container)).toBe('/tutor/buddy/angry.webp')
  })
})
