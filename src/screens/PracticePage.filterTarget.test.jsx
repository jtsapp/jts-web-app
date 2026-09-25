// @vitest-environment jsdom
// «Практика» открывается сразу на нужном разделе, если переход несёт фильтр
// (плитка «Книги» на «Главной»): иначе ученик попадал в общую ленту и искал
// раздел заново. С навыками-вкладками это значит: вкладка раздела выбрана, а
// сам раздел развёрнут полным списком.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

import PracticePage from './PracticePage.jsx'

beforeEach(() => {
  sessionStorage.clear()
})

function renderWith(openTarget, userLevel = 'A1') {
  return render(
    <I18nProvider>
      <PracticePage userLevel={userLevel} userName="Тест" token="T" openTarget={openTarget} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

const activeSkill = (container) => container.querySelector('.pk-skill[aria-selected="true"] .pk-skill__title')?.textContent
const activeLevel = (container) => container.querySelector('.pk-levels__btn[aria-checked="true"]')?.textContent

describe('PracticePage — фильтр из перехода', () => {
  it('открывается на книгах: вкладка «Чтение», книжки развёрнуты', async () => {
    const { container } = renderWith({ filter: 'books' })
    await waitFor(() => expect(activeSkill(container)).toMatch(/чтение/i))
    expect(container.querySelector('#sec-books')).toBeTruthy()
    // В развёрнутом виде на экране только этот раздел — баннера чтения нет.
    expect(container.querySelector('#sec-reading')).toBeNull()
    expect(container.querySelector('#sec-books .pk-all')?.textContent).toMatch(/свернуть/i)
  })

  it('без фильтра — «Аудирование»', async () => {
    const { container } = renderWith(null)
    await waitFor(() => expect(activeSkill(container)).toMatch(/аудирование/i))
    expect(container.querySelector('#sec-tales')).toBeTruthy()
    expect(container.querySelector('#sec-listening')).toBeTruthy()
  })

  it('возврат из «Ситуаций» — на «Говорение»', async () => {
    const { container } = renderWith({ skill: 'speaking' })
    await waitFor(() => expect(activeSkill(container)).toMatch(/говорение/i))
    expect(container.querySelector('#sec-situations')).toBeTruthy()
  })

  it('незнакомый фильтр игнорируется', async () => {
    const { container } = renderWith({ filter: 'nope' })
    await waitFor(() => expect(activeSkill(container)).toMatch(/аудирование/i))
  })
})

describe('PracticePage — навыки и уровень', () => {
  it('вкладка переключает секции, «Посмотреть все» разворачивает и сворачивает', async () => {
    const { container, getByText } = renderWith(null)
    fireEvent.click(getByText('Письмо'))
    await waitFor(() => expect(container.querySelector('#sec-workbooks')).toBeTruthy())
    expect(container.querySelector('#sec-tales')).toBeNull()
    expect(container.querySelector('#sec-writing')).toBeTruthy()

    fireEvent.click(container.querySelector('#sec-workbooks .pk-all'))
    expect(container.querySelector('#sec-writing')).toBeNull()
    fireEvent.click(container.querySelector('#sec-workbooks .pk-all'))
    expect(container.querySelector('#sec-writing')).toBeTruthy()
  })

  it('по умолчанию видны все уровни, а не только уровень ученика', () => {
    expect(activeLevel(renderWith(null, 'B2').container)).toBe('Все')
  })

  it('A0 тоже открывается на всех уровнях', () => {
    expect(activeLevel(renderWith(null, 'A0').container)).toBe('Все')
  })

  it('выбранные вкладка и уровень переживают перемонтирование', async () => {
    const first = renderWith(null, 'A1')
    fireEvent.click(first.getByText('Говорение'))
    fireEvent.click(first.getByText('C1'))
    first.unmount()
    const { container } = renderWith(null, 'A1')
    expect(activeSkill(container)).toMatch(/говорение/i)
    expect(activeLevel(container)).toBe('C1')
  })

  it('карточка навыка считает тренажёры с правильным окончанием', () => {
    const { container } = renderWith(null)
    const counts = [...container.querySelectorAll('.pk-skill__count')].map((n) => n.textContent)
    expect(counts).toEqual(['7 тренажеров', '4 тренажера', '4 тренажера', '4 тренажера'])
  })
})
