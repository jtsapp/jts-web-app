// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import TutorFace from './TutorFace.jsx'
import { SWAP_MS } from './buddyPose.js'

const shownKey = (container) =>
  [...container.querySelector('.t-face__stack.is-on').classList].find((c) => c.startsWith('t-face--')).slice(8)
const body = (container, key) => container.querySelector(`.t-face--${key} .t-face__layer--base`)

describe('TutorFace', () => {
  it('на первом кадре сразу показывает запрошенную эмоцию', () => {
    const { container, getByRole } = render(<TutorFace emotion="angry" />)
    expect(shownKey(container)).toBe('angry')
    expect(getByRole('img').getAttribute('aria-label')).toBe('Злится')
  })

  it('незнакомый ключ показывает дефолт, в том числе ключ прототипа', () => {
    for (const key of ['nope', 'constructor']) {
      const { container, unmount } = render(<TutorFace emotion={key} />)
      expect(shownKey(container), key).toBe('idle')
      unmount()
    }
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

  it('preload монтирует набор скрытым, видимое лицо не меняется', () => {
    const { container } = render(<TutorFace emotion="idle" preload={['happy']} />)
    expect(shownKey(container)).toBe('idle')
    const happy = container.querySelector('.t-face__stack.t-face--happy')
    expect(happy).not.toBeNull()
    expect(happy.classList.contains('is-on')).toBe(false)
  })

  it('заранее догруженный набор показывается сразу, без ожидания', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} />)
    fireEvent.load(body(container, 'happy'))
    rerender(<TutorFace emotion="happy" />)
    expect(shownKey(container)).toBe('happy')
  })

  it('незнакомые ключи и null в preload пропускаются', () => {
    const { container } = render(<TutorFace emotion="idle" preload={['nope', 'constructor', null]} />)
    expect(container.querySelectorAll('.t-face__stack')).toHaveLength(1)
  })

  it('без morph смена как раньше: ни позы, ни is-morph, ни is-leaving', () => {
    const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} />)
    expect(container.querySelector('.t-face').classList.contains('is-morph')).toBe(false)
    expect(container.querySelector('.t-face--happy').style.transform).toBe('')
    fireEvent.load(body(container, 'happy'))
    rerender(<TutorFace emotion="happy" />)
    expect(container.querySelector('.is-leaving')).toBeNull()
  })

  it('morph ставит каждый набор в позу видимого', () => {
    const { container } = render(<TutorFace emotion="talking" preload={['happy']} morph />)
    expect(container.querySelector('.t-face').classList.contains('is-morph')).toBe(true)
    const happy = container.querySelector('.t-face--happy')
    // «Счастлив» совмещается в первом кадре петли: −6°, а не −18° карточки.
    expect(happy.style.transform).toBe('translate(-3.32%, 0.42%) rotate(15.2deg)')
    expect(happy.style.transformOrigin).toBe('50.01% 50.04%')
    expect(container.querySelector('.t-face--talking').style.transform).toBe('translate(0%, 0%) rotate(0deg)')
  })

  it('morph: на время смены уходящее гаснет с движением, новое — неподвижный кадр', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} morph />)
      fireEvent.load(body(container, 'happy'))
      rerender(<TutorFace emotion="happy" morph />)
      expect(shownKey(container)).toBe('happy')
      const idle = container.querySelector('.t-face--idle')
      const happy = container.querySelector('.t-face--happy')
      expect(idle.classList.contains('is-leaving')).toBe(true)
      expect(happy.classList.contains('is-entering')).toBe(true)
      // Уходящее уже едет в позу нового: тела совпадут к концу перехода.
      expect(idle.style.transform).toBe('translate(-0.02%, -0.01%) rotate(9deg)')
      act(() => {
        vi.advanceTimersByTime(SWAP_MS)
      })
      expect(idle.classList.contains('is-leaving')).toBe(false)
      expect(happy.classList.contains('is-entering')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('morph: тело уходящего успокаивается, в конце смены анимации снимаются', () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }))
    Element.prototype.animate = animate
    vi.stubGlobal('getComputedStyle', () => ({ transform: 'matrix(1, 0, 0, 1, 0, -12)' }))
    try {
      const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy']} morph />)
      fireEvent.load(body(container, 'happy'))
      rerender(<TutorFace emotion="happy" morph />)
      // Успокаиваются rig и body уходящего — и только они.
      expect(animate.mock.contexts.map((el) => el.className)).toEqual(['t-face__rig', 't-face__body'])
      expect(animate.mock.contexts.every((el) => el.closest('.t-face--idle'))).toBe(true)
      expect(cancel).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(SWAP_MS)
      })
      expect(cancel).toHaveBeenCalledTimes(2)
    } finally {
      delete Element.prototype.animate
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('morph: смена посреди смены — уходит прежнее новое, таймер заново', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(<TutorFace emotion="idle" preload={['happy', 'celebrate']} morph />)
      fireEvent.load(body(container, 'happy'))
      fireEvent.load(body(container, 'celebrate'))
      rerender(<TutorFace emotion="happy" preload={['celebrate']} morph />)
      act(() => {
        vi.advanceTimersByTime(SWAP_MS / 2)
      })
      rerender(<TutorFace emotion="celebrate" morph />)
      const cls = (key) => container.querySelector(`.t-face--${key}`).className
      expect(cls('idle')).not.toMatch(/is-leaving|is-on/)
      expect(cls('happy')).toMatch(/is-leaving/)
      expect(cls('celebrate')).toMatch(/is-on is-entering/)
      // Таймер считается от последней смены, а не от первой.
      act(() => {
        vi.advanceTimersByTime(SWAP_MS / 2)
      })
      expect(cls('celebrate')).toMatch(/is-entering/)
      act(() => {
        vi.advanceTimersByTime(SWAP_MS / 2)
      })
      expect(cls('celebrate')).not.toMatch(/is-entering/)
      expect(cls('happy')).not.toMatch(/is-leaving/)
    } finally {
      vi.useRealTimers()
    }
  })
})
