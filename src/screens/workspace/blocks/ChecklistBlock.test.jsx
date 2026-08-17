// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import ChecklistBlock from './ChecklistBlock.jsx'

const BLOCK = {
  type: 'checklist',
  title: 'You can now…',
  items: [
    'talk about your friendships — <i>get on well with</i>',
    'speak for a minute about one friendship without stopping',
  ],
}

function renderChecklist(block = BLOCK) {
  return render(
    <I18nProvider>
      <ChecklistBlock block={block} />
    </I18nProvider>
  )
}

describe('ChecklistBlock — «You can now…»', () => {
  // Источник держит галочку перед каждым пунктом прямо в статичной вёрстке
  // (JS, который её включал, sanitize() вырезает вместе со всеми <script>).
  // Экран не должен показывать урок «уже пройденным» с первого кадра.
  it('ничего не отмечено по умолчанию', () => {
    const { container } = renderChecklist()
    expect(container.querySelectorAll('.lw-checklist__item.is-done').length).toBe(0)
  })

  it('клик по пункту отмечает его, повторный клик снимает отметку', () => {
    const { container } = renderChecklist()
    const first = container.querySelectorAll('.lw-checklist__item')[0]

    fireEvent.click(first)
    expect(first.classList.contains('is-done')).toBe(true)

    fireEvent.click(first)
    expect(first.classList.contains('is-done')).toBe(false)
  })

  it('отмечает только тот пункт, по которому кликнули', () => {
    const { container } = renderChecklist()
    const items = container.querySelectorAll('.lw-checklist__item')
    fireEvent.click(items[0])

    expect(items[0].classList.contains('is-done')).toBe(true)
    expect(items[1].classList.contains('is-done')).toBe(false)
  })

  it('сохраняет курсив/жирный текст из примера пункта', () => {
    const { container } = renderChecklist()
    expect(container.querySelector('.lw-checklist__item i')?.textContent).toBe('get on well with')
  })

  it('пустой список — пустой рендер, а не сломанная карточка', () => {
    const { container } = renderChecklist({ type: 'checklist', items: [] })
    expect(container.querySelector('.lw-checklist')).toBeNull()
  })
})
