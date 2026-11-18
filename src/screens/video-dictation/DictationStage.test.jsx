// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const skills = vi.hoisted(() => [])
vi.mock('../../practice/skillStats.js', () => ({ recordSkill: (...a) => skills.push(a) }))

import { phrasesOf } from '../../practice/video-dictation/phrase.js'
import DictationStage from './DictationStage.jsx'

const t = (key, vars) => (vars ? `${key} ${JSON.stringify(vars)}` : key)
const LESSON = {
  slug: 'rainy-day-k3f9q',
  level: 'A1',
  phrases: phrasesOf([[1, 3, 'I [love] jumping in [muddy] puddles!'], [4, 6, 'Where is my teddy?']]),
}

function mount(over = {}) {
  const props = {
    lesson: LESSON,
    only: null,
    ready: true,
    slow: false,
    autoStart: false,
    t,
    play: vi.fn(() => true),
    onToggleSlow: vi.fn(),
    onFinish: vi.fn(),
    onRedo: vi.fn(),
    onExit: vi.fn(),
    ...over,
  }
  const view = render(<DictationStage {...props} />)
  return { ...view, props }
}

const input = () => document.querySelector('.jl-cells__input')
const typeAndCheck = (value) => {
  fireEvent.change(input(), { target: { value } })
  fireEvent.keyDown(input(), { key: 'Enter' })
}

beforeEach(() => {
  skills.length = 0
})

describe('прогон диктанта', () => {
  it('пока плеер не готов, «Начать» закрыта; «Начать» играет первую фразу в том же нажатии', () => {
    const { rerender, props } = mount({ ready: false })
    const start = screen.getByRole('button', { name: /videoDictation.loadingVideo/ })
    expect(start.disabled).toBe(true)
    rerender(<DictationStage {...props} ready />)
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    expect(props.play).toHaveBeenCalledTimes(1)
    expect(props.play.mock.calls[0][0]).toBe(LESSON.phrases[0])
    expect(screen.getByText('videoDictation.counter {"i":1,"n":2}')).toBeTruthy()
  })

  it('верно с первого раза: вердикт в aria-live, навык записан, «Дальше» играет следующую', () => {
    const { props } = mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    typeAndCheck('lovemuddy')
    const verdict = document.querySelector('.vd-verdict')
    expect(verdict.getAttribute('aria-live')).toBe('polite')
    expect(verdict.textContent).toContain('videoDictation.verdict.clean')
    expect(verdict.hasAttribute('data-assistant-expected')).toBe(false)
    expect(skills).toEqual([['listening', true, 'A1']])
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.next/ }))
    expect(props.play).toHaveBeenLastCalledWith(LESSON.phrases[1])
  })

  it('две неудачи: фраза показана, эталон — Луне, набранное — в ответе', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    typeAndCheck('zzzzzzzzz')
    expect(document.querySelector('.vd-verdict').textContent).toContain('videoDictation.verdict.bad')
    expect(input().classList.contains('is-wrong')).toBe(true)
    typeAndCheck('qqqq')
    const verdict = document.querySelector('.vd-verdict')
    expect(verdict.getAttribute('data-assistant-expected')).toBe('I love jumping in muddy puddles!')
    expect(verdict.textContent).toContain('videoDictation.verdict.typed {"typed":"qqqq"}')
    expect(skills).toEqual([['listening', false, 'A1']])
  })

  it('«Ещё раз» и «Медленнее» — та же фраза', () => {
    const { props } = mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.again/ }))
    expect(props.play).toHaveBeenLastCalledWith(LESSON.phrases[0])
    const slower = screen.getByRole('button', { name: 'videoDictation.slower' })
    expect(slower.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(slower)
    expect(props.onToggleSlow).toHaveBeenCalledWith(LESSON.phrases[0])
  })

  it('последняя фраза — «Итог»: onFinish с результатом, «Пройти ошибки заново» — номера фраз', () => {
    const { props } = mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    typeAndCheck('lovemuddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.next/ }))
    typeAndCheck('whereismyted')
    typeAndCheck('whereismyteddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(props.onFinish).toHaveBeenCalledWith(expect.objectContaining({ n: 2, clean: 1, mistakes: [1] }))
    expect(screen.getByRole('heading').textContent).toBe('videoDictation.firstTry {"clean":1,"n":2}')
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.result.redo' }))
    expect(props.onRedo).toHaveBeenCalledWith([1])
  })

  it('повтор ошибок: только эти фразы, старт сам, в итоге — пометка про лучший результат', () => {
    const { props } = mount({ only: [1], autoStart: true })
    expect(props.play).toHaveBeenCalledWith(LESSON.phrases[1])
    expect(screen.getByText('videoDictation.counter {"i":1,"n":1}')).toBeTruthy()
    act(() => typeAndCheck('whereismyteddy'))
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(screen.getByText('videoDictation.result.redoNote')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'videoDictation.result.redo' })).toBeNull()
  })
})
