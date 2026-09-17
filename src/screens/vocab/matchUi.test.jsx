// @vitest-environment jsdom
//
// «Соедините слова с переводами». В каталоге у слов одного урока бывает один
// и тот же перевод (A0: hello и hi — оба «привет»), и справа тогда две
// одинаковые кнопки. Засчитывалась только «своя» из них — ученик жал на
// верный перевод и получал ошибку сразу по двум словам.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { I18nProvider, useI18n } from '../../i18n.jsx'
import { MatchUI } from './VocabPractice.jsx'

const WORDS = [
  { key: 'hello', word: 'hello', translationRu: 'привет' },
  { key: 'hi', word: 'hi', translationRu: 'привет' },
  { key: 'goodbye', word: 'goodbye', translationRu: 'до свидания' },
]

function Harness({ words = WORDS, onDone }) {
  const { t } = useI18n()
  return <MatchUI words={words} lang="ru" t={t} onDone={onDone} />
}

const columns = (c) => [...c.querySelectorAll('.vp-pairs > div')]
const buttonsIn = (col, text) => [...col.querySelectorAll('.vp-pair')].filter((b) => b.textContent.trim() === text)

afterEach(() => vi.restoreAllMocks())

describe('MatchUI', () => {
  it('одинаковый перевод у двух слов: подходит любая из одинаковых кнопок', () => {
    // Math.random = 0 → обе колонки в порядке hi, goodbye, hello: первая
    // кнопка «привет» справа — от hi, вторая — от hello.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)
    const [left, right] = columns(container)

    fireEvent.click(buttonsIn(left, 'hi')[0])
    fireEvent.click(buttonsIn(right, 'привет')[1]) // «чужая» — от hello
    fireEvent.click(buttonsIn(left, 'hello')[0])
    fireEvent.click(buttonsIn(right, 'привет')[0])
    fireEvent.click(buttonsIn(left, 'goodbye')[0])
    fireEvent.click(buttonsIn(right, 'до свидания')[0])
    fireEvent.click(screen.getByRole('button', { name: /Продолжить|Continue/i }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone.mock.calls[0][0]).toEqual([
      { key: 'hello', ok: true },
      { key: 'hi', ok: true },
      { key: 'goodbye', ok: true },
    ])
  })

  it('неверная пара по-прежнему засчитывается ошибкой', () => {
    const onDone = vi.fn()
    const { container } = render(<I18nProvider><Harness onDone={onDone} /></I18nProvider>)
    const [left, right] = columns(container)

    fireEvent.click(buttonsIn(left, 'goodbye')[0])
    fireEvent.click(buttonsIn(right, 'привет')[0])
    fireEvent.click(buttonsIn(left, 'goodbye')[0])
    fireEvent.click(buttonsIn(right, 'до свидания')[0])
    fireEvent.click(buttonsIn(left, 'hello')[0])
    fireEvent.click(buttonsIn(right, 'привет')[0])
    fireEvent.click(buttonsIn(left, 'hi')[0])
    fireEvent.click([...right.querySelectorAll('.vp-pair:not([disabled])')][0])
    fireEvent.click(screen.getByRole('button', { name: /Продолжить|Continue/i }))

    const result = Object.fromEntries(onDone.mock.calls[0][0].map((a) => [a.key, a.ok]))
    expect(result.goodbye).toBe(false)
  })

  it('у слов без перевода справа — английские определения', () => {
    const words = [
      { key: 'awkward', word: 'awkward', def: 'making you feel embarrassed' },
      { key: 'offend', word: 'offend', def: 'to make somebody upset' },
      { key: 'curl', word: 'curl', def: 'to form a curved shape' },
    ]
    const { container } = render(<I18nProvider><Harness words={words} onDone={() => {}} /></I18nProvider>)
    const [, right] = columns(container)
    const texts = [...right.querySelectorAll('.vp-pair')].map((b) => b.textContent.trim()).sort()
    expect(texts).toEqual(['making you feel embarrassed', 'to form a curved shape', 'to make somebody upset'])
  })
})
