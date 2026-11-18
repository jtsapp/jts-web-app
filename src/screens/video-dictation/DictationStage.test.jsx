// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('полный прогон: onFinish получает retry: false', () => {
    const { props } = mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    typeAndCheck('lovemuddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.next/ }))
    typeAndCheck('whereismyteddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(props.onFinish).toHaveBeenCalledTimes(1)
    expect(props.onFinish).toHaveBeenCalledWith(expect.objectContaining({ n: 2, clean: 2, retry: false }))
  })

  it('повтор ошибок: только эти фразы, старт сам, остаются ошибки — пометка и «Пройти заново», retry: true', () => {
    const { props } = mount({ only: [1], autoStart: true })
    expect(props.play).toHaveBeenCalledWith(LESSON.phrases[1])
    expect(screen.getByText('videoDictation.counter {"i":1,"n":1}')).toBeTruthy()
    typeAndCheck('whereismyted')
    typeAndCheck('whereismyted')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(props.onFinish).toHaveBeenCalledTimes(1)
    expect(props.onFinish).toHaveBeenCalledWith(expect.objectContaining({ n: 1, clean: 0, mistakes: [1], retry: true }))
    expect(screen.getByText('videoDictation.result.redoNote')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'videoDictation.result.redo' })).toBeTruthy()
  })

  it('перерисовка родителя с новым onFinish: вызывается последний', () => {
    const { props, rerender } = mount()
    const latest = vi.fn()
    rerender(<DictationStage {...props} onFinish={latest} />)
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    typeAndCheck('lovemuddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.next/ }))
    typeAndCheck('whereismyteddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(latest).toHaveBeenCalledTimes(1)
    expect(props.onFinish).not.toHaveBeenCalled()
  })
})

describe('фокус и ввод', () => {
  it('«Медленнее» возвращает фокус в поле', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    screen.getByRole('button', { name: 'videoDictation.slower' }).focus()
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.slower' }))
    expect(document.activeElement).toBe(input())
  })

  it('фокус: закрытая фраза — на «Дальше», после «Дальше» — в поле, итог — на заголовке', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    expect(document.activeElement).toBe(input())
    typeAndCheck('lovemuddy')
    const nextBtn = screen.getByRole('button', { name: /videoDictation.next/ })
    expect(document.activeElement).toBe(nextBtn)
    fireEvent.click(nextBtn)
    expect(document.activeElement).toBe(input())
    typeAndCheck('whereismyteddy')
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(document.activeElement).toBe(screen.getByRole('heading'))
  })

  it('Enter на пустом поле ничего не делает: ни вердикта, ни записи навыка', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(skills).toEqual([])
    expect(document.querySelector('.vd-verdict').textContent).toBe('')
    expect(document.querySelector('.jl-fb')).toBeNull()
  })

  it('«Подсказка» открывает следующую букву', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    expect(document.querySelectorAll('.jl-cell.is-hint')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.hint/ }))
    expect(document.querySelectorAll('.jl-cell.is-hint')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.hint/ }))
    expect(document.querySelectorAll('.jl-cell.is-hint')).toHaveLength(2)
  })
})
