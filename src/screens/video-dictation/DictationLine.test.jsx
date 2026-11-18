// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { parsePhrase } from '../../practice/video-dictation/phrase.js'
import DictationLine, { cellSizeClass } from './DictationLine.jsx'

const t = (key, vars) => (vars ? `${key} ${JSON.stringify(vars)}` : key)
const MUDDY = { n: 0, start: 1, end: 3, ...parsePhrase('I [love] jumping in [muddy] puddles!') }
const TEDDY = { n: 1, start: 4, end: 6, ...parsePhrase('Where is my teddy?') }

const item = (over = {}) => ({
  phrase: MUDDY,
  typed: '',
  tries: 0,
  revealed: 0,
  hintsUsed: 0,
  mark: null,
  done: false,
  outcome: null,
  attempt: '',
  ...over,
})

function mount(it, handlers = {}) {
  const props = { onType: vi.fn(), onSubmit: vi.fn(), ...handlers }
  const view = render(<DictationLine item={it} number={3} inputRef={createRef()} t={t} {...props} />)
  return { ...view, ...props, input: view.container.querySelector('input') }
}

describe('строка фразы', () => {
  it('ячейки только у пропусков: видимые слова — текстом, группы 4 + 5', () => {
    const { container } = mount(item())
    expect([...container.querySelectorAll('.vd-word')].map((w) => w.textContent)).toEqual(['I', 'jumping', 'in', 'puddles!'])
    expect([...container.querySelectorAll('.jl-grp')].map((g) => g.querySelectorAll('.jl-cell').length)).toEqual([4, 5])
  })

  it('фраза без скобок — ячейки у каждого слова, текста нет', () => {
    const { container } = mount(item({ phrase: TEDDY }))
    expect(container.querySelectorAll('.vd-word')).toHaveLength(0)
    expect([...container.querySelectorAll('.jl-grp')].map((g) => g.querySelectorAll('.jl-cell').length)).toEqual([5, 2, 2, 5])
  })

  it('буквы по ячейкам через пропуски, текущая и подсказанная подсвечены', () => {
    const { container } = mount(item({ typed: 'lovem', revealed: 2 }))
    const cells = [...container.querySelectorAll('.jl-cell')]
    expect(cells.map((c) => c.textContent).join('|')).toBe('l|o|v|e|m||||')
    expect(cells[0].classList.contains('is-hint')).toBe(true)
    expect(cells[5].classList.contains('is-cur')).toBe(true)
  })

  it('поле подписано номером фразы; набор и Enter уходят наверх', () => {
    const { input, onType, onSubmit } = mount(item())
    expect(input.getAttribute('aria-label')).toBe('videoDictation.input {"i":3}')
    expect(input.hasAttribute('maxlength')).toBe(false)
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onType).toHaveBeenCalledWith('love')
    expect(onSubmit).toHaveBeenCalled()
  })

  it('русская раскладка — подсказка переключить клавиатуру', () => {
    const { input, getByRole } = mount(item())
    fireEvent.change(input, { target: { value: 'дщму' } })
    expect(getByRole('status').textContent).toBe('videoDictation.layout')
  })

  it('неверная попытка — поле «неверно» для Луны, ячейки near', () => {
    const { input, container } = mount(item({ typed: 'lovemudy', mark: 'near', tries: 1 }))
    expect(input.classList.contains('is-wrong')).toBe(true)
    expect(container.querySelector('.jl-cells.is-near')).not.toBeNull()
  })

  it('показанная фраза: ячейки shown, поле закрыто, набранное — Луне, вся фраза текстом', () => {
    const { input, container } = mount(item({ typed: 'lovemuddy', mark: 'shown', done: true, outcome: 'miss', attempt: 'lovmud' }))
    expect(container.querySelector('.jl-cells.is-shown')).not.toBeNull()
    expect(input.disabled).toBe(true)
    expect(input.classList.contains('is-rev')).toBe(true)
    expect(input.getAttribute('data-assistant-entered')).toBe('lovmud')
    expect(container.querySelector('.vd-full').textContent).toBe('I love jumping in muddy puddles!')
    expect(container.querySelector('.is-cur')).toBeNull()
  })
})

describe('склейка без пробела (glue)', () => {
  const groups = (container) => [...container.querySelectorAll('.vd-wg')]
  const phraseItem = (text) => item({ phrase: { n: 0, start: 0, end: 2, ...parsePhrase(text) } })

  it('un[believ]able — три части в одной неразрывной группе, без пробела между ними', () => {
    const { container } = mount(phraseItem('un[believ]able'))
    expect(groups(container)).toHaveLength(1)
    const parts = [...groups(container)[0].children]
    expect(parts.map((p) => p.className)).toEqual(['vd-word', 'jl-grp', 'vd-word'])
    expect(parts[0].textContent).toBe('un')
    expect(parts[2].textContent).toBe('able')
    expect(groups(container)[0].textContent).toBe('unable')
  })

  it('I love [puddles]. — точка стоит вплотную к ячейкам, слова остальные — отдельные группы', () => {
    const { container } = mount(phraseItem('I love [puddles].'))
    expect(groups(container).map((g) => g.textContent)).toEqual(['I', 'love', '.'])
    const last = groups(container)[2]
    expect([...last.children].map((c) => c.className)).toEqual(['jl-grp', 'vd-word'])
  })

  it('слова через пробел — каждое в своей группе', () => {
    const { container } = mount(phraseItem('I [love] jumping'))
    expect(groups(container)).toHaveLength(3)
    expect(groups(container).every((g) => g.children.length === 1)).toBe(true)
  })
})

describe('размер ячеек и устойчивость к узкому экрану', () => {
  const sizeOf = (text) => cellSizeClass(parsePhrase(text).tokens)

  it('размер выбирает самая длинная группа, а не сумма букв фразы', () => {
    expect(sizeOf('[love] [muddy] [puddles] [jumping] [rainbow]')).toBe('')
    expect(sizeOf('[abcdefghij]')).toBe(' jl-cells--sm')
    expect(sizeOf('[abcdefghijklmnopq]')).toBe(' jl-cells--xs')
    expect(sizeOf('un[believ]able [no]')).toBe('')
  })

  it('буквы ячеек скрыты от скринридера, поле подписано', () => {
    const { container, input } = mount(item())
    // aria-hidden — на каждой группе: старый WebKit игнорирует ARIA на обёртке с display: contents
    expect(container.querySelector('.vd-cells__view').hasAttribute('aria-hidden')).toBe(false)
    const hidden = [...container.querySelectorAll('.vd-wg')]
    expect(hidden.length).toBeGreaterThan(0)
    expect(hidden.every((g) => g.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(input.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('область статуса раскладки есть всегда и очищается при смене фразы', () => {
    const { input, getByRole, rerender } = mount(item())
    expect(getByRole('status').textContent).toBe('')
    fireEvent.change(input, { target: { value: 'дщму' } })
    expect(getByRole('status').textContent).toBe('videoDictation.layout')
    rerender(<DictationLine item={item({ phrase: TEDDY })} number={4} inputRef={createRef()} t={t} onType={vi.fn()} onSubmit={vi.fn()} />)
    expect(getByRole('status').textContent).toBe('')
  })

  it('фраза целиком со знаками — только после ответа', () => {
    const before = mount(item())
    expect(before.container.querySelector('.vd-full')).toBeNull()
    before.unmount()
    const after = mount(item({ done: true, mark: 'ok', typed: 'lovemuddy' }))
    expect(after.container.querySelector('.vd-full').textContent).toBe('I love jumping in muddy puddles!')
  })
})
