// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import GapQuestion from './GapQuestion.jsx'
import ChoiceQuestion from './ChoiceQuestion.jsx'
import MultiQuestion from './MultiQuestion.jsx'
import OrderQuestion from './OrderQuestion.jsx'
import MatchQuestion from './MatchQuestion.jsx'

/**
 * Пропущенный вопрос после «Проверить» тоже показывает правильный ответ.
 *
 * Живая жалоба: «если ученик пропустил, то объяснений нет — только те, на что
 * ответил». Причина одна на все типы вопросов: и эталон, и разбор висели на
 * `hasAttempt`, то есть показывались только тем, кто что-то ввёл. Ученик,
 * который задание не понял и потому оставил пустым, оставался без ответа —
 * ровно тот, кому он нужнее всего.
 *
 * `attempted` теперь решает только, красить ли ОТВЕТ УЧЕНИКА: пустое поле не
 * должно быть ни зелёным, ни красным.
 */
function show(node) {
  return render(<I18nProvider>{node}</I18nProvider>)
}

const noop = () => {}

describe('Пропуск: свободный ввод', () => {
  const q = { id: 'g1', type: 'gap', answers: ['fashion show', 'fashion'], gapBefore: 'This morning she is visiting a', gapAfter: 'with colleagues.', why: 'this morning I am visiting a <b>fashion show</b>' }

  it('показывает эталон, хотя ученик ничего не ввёл', () => {
    show(<GapQuestion question={q} answer="" checked onAnswer={noop} />)
    expect(screen.getByText(/fashion show \/ fashion/)).toBeTruthy()
  })

  it('показывает разбор, хотя ученик ничего не ввёл', () => {
    const { container } = show(<GapQuestion question={q} answer="" checked onAnswer={noop} />)
    expect(container.querySelector('.lw-q__why')).toBeTruthy()
  })

  /* Теги из `data-why` курса ученик читал буквально: «<b>fashion show</b>». */
  it('жирный из курса не печатается тегами', () => {
    const { container } = show(<GapQuestion question={q} answer="" checked onAnswer={noop} />)
    const why = container.querySelector('.lw-q__why')
    expect(why.textContent).not.toMatch(/<b>|<\/b>/)
    expect(why.querySelector('strong')?.textContent).toBe('fashion show')
  })

  /* Пустое поле — не ошибка ученика и не его победа: красить его нельзя. */
  it('пустое поле не красится ни верным, ни неверным', () => {
    const { container } = show(<GapQuestion question={q} answer="" checked onAnswer={noop} />)
    const input = container.querySelector('.lw-gap-input')
    expect(input.className).not.toMatch(/is-correct|is-wrong/)
  })

  /* У открытого пропуска эталона нет — показывать нечего и на пропуске. */
  it('у открытого пропуска эталон не выдумывается', () => {
    const open = { id: 'g2', type: 'gap', open: true, gapBefore: 'Your turn →', gapAfter: '' }
    const { container } = show(<GapQuestion question={open} answer="" checked onAnswer={noop} />)
    expect(container.querySelector('.lw-q__answer')).toBeNull()
  })

  /* Звать преподавателя за проверкой пустого поля незачем — проверять нечего. */
  it('на пропущенном открытом вопросе не зовёт преподавателя', () => {
    const open = { id: 'g3', type: 'gap', open: true, gapBefore: 'Your turn →', gapAfter: '' }
    const { container } = show(<GapQuestion question={open} answer="" checked onAnswer={noop} />)
    expect(container.querySelector('.lw-q__review')).toBeNull()
  })
})

describe('Пропуск: выбор одного варианта', () => {
  const q = { id: 'c1', type: 'choice', options: ['have', 'has', 'did', 'do'], answer: 'have', why: 'Present Perfect: have + V3' }

  it('верный вариант подсвечен, хотя ученик не выбирал', () => {
    const { container } = show(<ChoiceQuestion question={q} answer={null} checked onAnswer={noop} />)
    const ok = container.querySelectorAll('.lw-opt.is-ok')
    expect(ok.length).toBe(1)
    expect(ok[0].textContent).toContain('have')
  })

  it('разбор показан, хотя ученик не выбирал', () => {
    const { container } = show(<ChoiceQuestion question={q} answer={null} checked onAnswer={noop} />)
    expect(container.querySelector('.lw-q__why')).toBeTruthy()
  })

  /* Крест — только на своём ответе: на пустом вопросе отмечать нечего. */
  it('на пропущенном вопросе нет крестов', () => {
    const { container } = show(<ChoiceQuestion question={q} answer={null} checked onAnswer={noop} />)
    expect(container.querySelector('.lw-opt.is-no')).toBeNull()
  })
})

describe('Пропуск: несколько верных', () => {
  const q = { id: 'm1', type: 'multi', options: ['red', 'blue', 'green'], answers: ['red', 'green'] }

  it('все верные подсвечены, хотя ученик не отмечал', () => {
    const { container } = show(<MultiQuestion question={q} answer={[]} checked onAnswer={noop} />)
    expect(container.querySelectorAll('.lw-opt.is-ok').length).toBe(2)
    expect(container.querySelector('.lw-opt.is-no')).toBeNull()
  })
})

describe('Пропуск: собрать предложение', () => {
  const q = { id: 'o1', type: 'order', words: ['She', 'has', 'left'], answer: ['She', 'has', 'left'] }

  it('показывает, каким предложение должно было получиться', () => {
    show(<OrderQuestion question={q} answer={[]} checked onAnswer={noop} />)
    expect(screen.getByText(/She has left/)).toBeTruthy()
  })
})

describe('Пропуск: сопоставление', () => {
  const q = { id: 'x1', type: 'match', pairs: [{ left: 'cat', right: 'кошка' }, { left: 'dog', right: 'собака' }] }

  /* Цветом тут ничего не скажешь: неразложенной фишки просто нет ни в одной
     колонке — поэтому ключ к ответу отдельной строкой. */
  it('даёт ключ к неразложенным парам', () => {
    show(<MatchQuestion question={q} answer={{}} checked onAnswer={noop} />)
    expect(screen.getByText(/cat — кошка/)).toBeTruthy()
    expect(screen.getByText(/dog — собака/)).toBeTruthy()
  })

  it('полностью верное сопоставление ключа не показывает', () => {
    const { container } = show(
      <MatchQuestion question={q} answer={{ cat: 'кошка', dog: 'собака' }} checked onAnswer={noop} />
    )
    expect(container.querySelector('.lw-q__answer')).toBeNull()
  })
})
