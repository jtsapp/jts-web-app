// @vitest-environment jsdom
// Карточка перевода слова в «Неправильных глаголах» сохраняет слово тем же
// путём, что ключевые слова Чтения. Гостю «Словаря» нет — слово уходит в банк
// повторений, и подпись «Уже в словаре» ему врала (решение владельца
// 09.10.2026: гостю — «Сохранено», как в Обучении и Чтении).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const save = vi.hoisted(() => ({ saveReadingKeyword: vi.fn() }))
vi.mock('../../practice/reading/saveKeyword.js', () => save)
vi.mock('../../lib/wordTranslate.js', () => ({ translateWord: vi.fn(async () => null) }))

import VerbWordCard from './VerbWordCard.jsx'

const DICT = { went: { lemma: 'go', ru: 'идти', kk: 'бару' } }

function mount(token) {
  const host = { current: document.body }
  return render(
    <I18nProvider>
      <VerbWordCard word="went" at={{ left: 0, above: 100, below: 120 }} host={host} dict={DICT} token={token} onClose={() => {}} />
    </I18nProvider>,
  )
}

beforeEach(() => save.saveReadingKeyword.mockReset())
afterEach(cleanup)

describe('VerbWordCard — «В словарь»', () => {
  it('гость: банк принял — «Сохранено»', async () => {
    save.saveReadingKeyword.mockResolvedValue('bank')
    const { getByRole, findByRole } = mount(null)
    fireEvent.click(getByRole('button', { name: 'Добавить в словарь' }))
    expect(await findByRole('button', { name: 'Сохранено' })).toBeTruthy()
  })

  it('вошедший: личный словарь принял — «Уже в словаре»', async () => {
    save.saveReadingKeyword.mockResolvedValue('dict')
    const { getByRole, findByRole } = mount('tok')
    fireEvent.click(getByRole('button', { name: 'Добавить в словарь' }))
    expect(await findByRole('button', { name: 'Уже в словаре' })).toBeTruthy()
  })

  it('пока запись идёт — «Сохраняю…»', async () => {
    let done
    save.saveReadingKeyword.mockReturnValue(new Promise((resolve) => { done = resolve }))
    const { getByRole, findByRole } = mount('tok')
    fireEvent.click(getByRole('button', { name: 'Добавить в словарь' }))
    expect((await findByRole('button', { name: 'Сохраняю…' })).disabled).toBe(true)
    done('dict')
    expect(await findByRole('button', { name: 'Уже в словаре' })).toBeTruthy()
  })

  it('сохраняет лемму, а не форму', () => {
    save.saveReadingKeyword.mockResolvedValue('dict')
    const { getByRole } = mount('tok')
    fireEvent.click(getByRole('button', { name: 'Добавить в словарь' }))
    expect(save.saveReadingKeyword).toHaveBeenCalledWith('tok', { en: 'go', ru: 'идти', kk: 'бару' }, 'verbs')
  })
})
