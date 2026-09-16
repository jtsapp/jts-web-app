// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TutorFace from './TutorFace.jsx'

const shownKey = (container) =>
  [...container.querySelector('.t-face__stack.is-on').classList].find((c) => c.startsWith('t-face--')).slice(8)
const body = (container, key) => container.querySelector(`.t-face--${key} .t-face__layer--base`)

describe('TutorFace', () => {
  it('на первом кадре сразу показывает запрошенную эмоцию', () => {
    const { container, getByRole } = render(<TutorFace emotion="angry" />)
    expect(shownKey(container)).toBe('angry')
    expect(getByRole('img').getAttribute('aria-label')).toBe('Злится')
  })

  it('незнакомый ключ показывает дефолт', () => {
    const { container } = render(<TutorFace emotion="nope" />)
    expect(shownKey(container)).toBe('idle')
  })

  it('рисует все слои карточки, а не одну картинку', () => {
    const { container } = render(<TutorFace emotion="sleepy" />)
    const parts = [...container.querySelectorAll('.t-face--sleepy .t-face__layer')].map((el) =>
      [...el.classList].find((c) => c.startsWith('t-face__layer--')).slice(15)
    )
    expect(parts).toEqual(['base', 'eyes', 'z1', 'z2', 'z3'])
  })

  it('петля макета качает тело с глазами, а пузырь вне тела стоит', () => {
    const { container } = render(<TutorFace emotion="talking" />)
    const inBody = [...container.querySelectorAll('.t-face--talking .t-face__body .t-face__layer')].map((el) => el.alt || el.className)
    expect(inBody.join(' ')).toMatch(/--base.*--eyes/)
    expect(container.querySelector('.t-face--talking .t-face__body .t-face__layer--bubble')).toBeNull()
    expect(container.querySelector('.t-face--talking .t-face__rig > .t-face__layer--bubble')).not.toBeNull()
  })

  it('бровь «Соркастичен» — отдельный слой в теле', () => {
    const { container } = render(<TutorFace emotion="gloat" />)
    expect(container.querySelector('.t-face--gloat .t-face__body .t-face__layer--brow')).not.toBeNull()
  })

  it('держит прежнее лицо, пока новое не догрузилось', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" />)
    rerender(<TutorFace emotion="happy" />)
    expect(shownKey(container)).toBe('idle')

    fireEvent.load(body(container, 'happy'))
    expect(shownKey(container)).toBe('happy')
  })

  it('обычная эмоция на время речи уступает «Говорит», замолчал — возвращается', () => {
    const { container, rerender } = render(<TutorFace emotion="confused" />)
    fireEvent.load(body(container, 'confused'))

    rerender(<TutorFace emotion="confused" speaking />)
    fireEvent.load(body(container, 'talking'))
    expect(shownKey(container)).toBe('talking')

    rerender(<TutorFace emotion="confused" speaking={false} />)
    expect(shownKey(container)).toBe('confused')
  })

  it('сильная эмоция держится на лице, пока тьютор говорит', () => {
    for (const key of ['happy', 'celebrate', 'sympathy', 'gloat', 'angry', 'rage']) {
      const { container, unmount } = render(<TutorFace emotion={key} speaking />)
      expect(shownKey(container), key).toBe(key)
      unmount()
    }
  })

  it('без эмоции речь показывает «Говорит» с первого кадра', () => {
    const { container } = render(<TutorFace emotion="idle" speaking />)
    expect(shownKey(container)).toBe('talking')
  })
})
