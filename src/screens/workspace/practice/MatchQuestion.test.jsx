// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import MatchQuestion from './MatchQuestion.jsx'

const VOCAB_QUESTION = {
  id: 'q1',
  type: 'match',
  pairs: [
    { left: 'get on (well with someone)', right: 'to have a good relationship' },
    { left: 'occasional', right: 'sometimes' },
  ],
}

// «Разложи по категориям» (trySortboxWidget в web-admin/convert-course.ts):
// каждое слово свой left, категория повторяется на нескольких pairs.
const SORT_QUESTION = {
  id: 'q2',
  type: 'match',
  pairs: [
    { left: 'purchase', right: 'Nouns' },
    { left: 'half-price', right: 'Adjectives' },
    { left: 'guilt-free', right: 'Adjectives' },
    { left: 'prove', right: 'Verbs' },
    { left: 'bargain', right: 'Nouns' },
  ],
}

function renderMatch(question, props = {}) {
  return render(
    <I18nProvider>
      <MatchQuestion question={question} answer={{}} checked={false} onAnswer={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('MatchQuestion — обычный словарный матчинг (1:1) остаётся прежним рендером', () => {
  it('не переключается на вид «разложи по категориям»', () => {
    const { container } = renderMatch(VOCAB_QUESTION)
    expect(container.querySelector('.lw-sort')).toBeNull()
    expect(container.querySelectorAll('.lw-match__left').length).toBe(2)
  })

  it('один общий перевод на два слова (A0 hello/hi) остаётся матчингом, не колонками', () => {
    const question = {
      id: 'q-a0',
      type: 'match',
      pairs: [
        { left: 'hello', right: 'привет · сәлем' },
        { left: 'hi', right: 'привет · сәлем' },
        { left: 'goodbye', right: 'до свидания · сау бол' },
      ],
    }
    const { container } = renderMatch(question)
    expect(container.querySelector('.lw-sort')).toBeNull()
    expect(container.querySelectorAll('.lw-match__left').length).toBe(3)
    expect(container.querySelectorAll('.lw-match__right').length).toBe(2)
  })

  it('клик по слову слева, затем по варианту справа — сопоставляет их', () => {
    const onAnswer = vi.fn()
    const { container } = renderMatch(VOCAB_QUESTION, { onAnswer })
    fireEvent.click(container.querySelector('.lw-match__left'))
    fireEvent.click(container.querySelector('.lw-match__right'))
    expect(onAnswer).toHaveBeenCalledWith('q1', expect.objectContaining({ 'get on (well with someone)': expect.any(String) }))
  })
})

describe('MatchQuestion — «разложи по категориям» (повторяющийся right)', () => {
  it('распознаёт задание и рисует банк слов + колонки категорий, а не список пар', () => {
    const { container } = renderMatch(SORT_QUESTION)
    expect(container.querySelector('.lw-sort')).not.toBeNull()
    expect(container.querySelectorAll('.lw-match__left').length).toBe(0)

    const cols = [...container.querySelectorAll('.lw-sort__col-label')].map((el) => el.textContent)
    // Только уникальные категории, не по одной на каждое слово.
    expect(cols).toEqual(['Nouns', 'Adjectives', 'Verbs'])

    const bankWords = [...container.querySelectorAll('.lw-sort__bank .lw-chip')].map((el) => el.textContent)
    expect(bankWords).toEqual(['purchase', 'half-price', 'guilt-free', 'prove', 'bargain'])
  })

  it('клик по слову в банке, затем по колонке — помещает слово в эту колонку', () => {
    const onAnswer = vi.fn()
    const { container } = renderMatch(SORT_QUESTION, { onAnswer })
    const word = [...container.querySelectorAll('.lw-sort__bank .lw-chip')].find((b) => b.textContent === 'purchase')
    fireEvent.click(word)
    const nounsCol = [...container.querySelectorAll('.lw-sort__col')].find(
      (col) => col.querySelector('.lw-sort__col-label').textContent === 'Nouns'
    )
    fireEvent.click(nounsCol)
    expect(onAnswer).toHaveBeenCalledWith('q2', { purchase: 'Nouns' })
  })

  it('размещённое слово уходит из банка в свою колонку', () => {
    const { container } = renderMatch(SORT_QUESTION, { answer: { purchase: 'Nouns' } })
    const bankWords = [...container.querySelectorAll('.lw-sort__bank .lw-chip')].map((el) => el.textContent)
    expect(bankWords).not.toContain('purchase')

    const nounsCol = [...container.querySelectorAll('.lw-sort__col')].find(
      (col) => col.querySelector('.lw-sort__col-label').textContent === 'Nouns'
    )
    expect(nounsCol.querySelector('.lw-sort__col-body').textContent).toContain('purchase')
  })

  it('клик по размещённому слову, затем по банку — возвращает его назад', () => {
    const onAnswer = vi.fn()
    const { container } = renderMatch(SORT_QUESTION, { answer: { purchase: 'Nouns' }, onAnswer })
    const placed = [...container.querySelectorAll('.lw-sort__col-body .lw-chip')].find(
      (b) => b.textContent === 'purchase'
    )
    fireEvent.click(placed)
    fireEvent.click(container.querySelector('.lw-sort__bank'))
    expect(onAnswer).toHaveBeenCalledWith('q2', {})
  })

  it('после проверки помечает верно/неверно размещённые слова', () => {
    const { container } = renderMatch(SORT_QUESTION, {
      answer: { purchase: 'Verbs', prove: 'Verbs' },
      checked: true,
    })
    const chips = [...container.querySelectorAll('.lw-sort__col-body .lw-chip')]
    const purchase = chips.find((c) => c.textContent === 'purchase')
    const prove = chips.find((c) => c.textContent === 'prove')
    expect(purchase.className).toContain('is-wrong')
    expect(prove.className).toContain('is-correct')
  })
})
