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
import * as api from '../api.js'

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

  it('без фильтра — «Аудирование»: карточки тренажёров, мини-игра Listening уехала в «Грамматику»', async () => {
    const { container } = renderWith(null)
    await waitFor(() => expect(activeSkill(container)).toMatch(/аудирование/i))
    expect(container.querySelector('#sec-tales.pk-card')).toBeTruthy()
    expect(container.querySelector('#sec-listenchoose.pk-card')).toBeTruthy()
    expect(container.querySelector('#sec-listening')).toBeNull()
  })

  it('возврат из «Ситуаций» — на «Говорение»', async () => {
    const { container } = renderWith({ skill: 'speaking' })
    await waitFor(() => expect(activeSkill(container)).toMatch(/говорение/i))
    expect(container.querySelector('#sec-situations')).toBeTruthy()
  })

  it('«Говорение» кончается сказками; игры «Аркады» — карточками «Грамматики», каждая ведёт в свою игру', async () => {
    const onNav = vi.fn()
    const { container, getByRole, getByText } = render(
      <I18nProvider>
        <PracticePage userLevel="A1" userName="Тест" token="T" openTarget={{ skill: 'speaking' }} onNav={onNav} onProfile={() => {}} />
      </I18nProvider>,
    )
    await waitFor(() => expect(activeSkill(container)).toMatch(/говорение/i))
    const ids = [...container.querySelectorAll('.pk-card')].map((c) => c.id)
    expect(ids.at(-1)).toBe('sec-tales')
    expect(container.querySelector('[id^="sec-arcade"]')).toBeNull()

    fireEvent.click(getByText('Грамматика'))
    // Уровни на «Грамматике» ничего не фильтруют — чипов нет.
    expect(container.querySelector('.pk-levels')).toBeNull()
    // Вкладка едет с переходом, чтобы «Назад» из игры вернул сюда же.
    fireEvent.click(getByRole('button', { name: /word rush/i }))
    expect(onNav).toHaveBeenLastCalledWith('arcade', { game: 'runner', skill: 'grammarGames' })
    fireEvent.click(getByRole('button', { name: /speak or die/i }))
    expect(onNav).toHaveBeenLastCalledWith('arcade', { game: 'speak', skill: 'grammarGames' })
    fireEvent.click(getByRole('button', { name: /темы по уровням/i }))
    expect(onNav).toHaveBeenLastCalledWith('grammar-games', undefined)
  })

  // Луна: «открой Питера Пэна» — переход несёт bookId (lib/assistant/items/refs.js).
  it('bookId открывает книгу, когда доехал каталог; «Назад» — в список книжек', async () => {
    api.getAudiobooks.mockResolvedValue([
      { id: 7, title: 'Peter Pan', level: 'A2', tracks: [] },
      { id: 8, title: 'Treasure Island', level: 'A2', tracks: [] },
    ])
    const { container } = renderWith({ filter: 'books', bookId: '8' })
    await waitFor(() => expect(container.querySelector('#sec-books')).toBeNull())
    await waitFor(() => expect(container.querySelector('.vd__back')).toBeTruthy())
    expect(container.textContent).toMatch(/Treasure Island/)
    fireEvent.click(container.querySelector('.vd__back'))
    await waitFor(() => expect(container.querySelector('#sec-books')).toBeTruthy())
    expect(container.querySelector('#sec-books .pk-all')?.textContent).toMatch(/свернуть/i)
    api.getAudiobooks.mockResolvedValue([])
  })

  it('книги из bookId нет в каталоге — остаётся список книжек', async () => {
    api.getAudiobooks.mockResolvedValue([{ id: 7, title: 'Peter Pan', level: 'A2', tracks: [] }])
    const { container, findAllByText } = renderWith({ filter: 'books', bookId: '999' })
    expect((await findAllByText('Peter Pan')).length).toBeGreaterThan(0)
    expect(container.querySelector('#sec-books')).toBeTruthy()
    api.getAudiobooks.mockResolvedValue([])
  })

  it('незнакомый фильтр игнорируется', async () => {
    const { container } = renderWith({ filter: 'nope' })
    await waitFor(() => expect(activeSkill(container)).toMatch(/аудирование/i))
  })
})

describe('PracticePage — навыки и уровень', () => {
  it('вкладка меняет карточки, карточка-каталог открывает полный список, «Свернуть» — обратно', async () => {
    const { container, getByText } = renderWith(null)
    fireEvent.click(getByText('Письмо'))
    await waitFor(() => expect(container.querySelector('#sec-workbooks.pk-card')).toBeTruthy())
    expect(container.querySelector('#sec-tales')).toBeNull()
    expect(container.querySelector('#sec-writing')).toBeTruthy()

    fireEvent.click(container.querySelector('#sec-workbooks.pk-card'))
    expect(container.querySelector('#sec-workbooks .pk-all')?.textContent).toMatch(/свернуть/i)
    expect(container.querySelector('#sec-writing')).toBeNull()
    expect(container.querySelector('[data-testid="practice-token-table"]')).toBeNull()
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
    // Как в макете редизайна (29.10.2026): игры и «Скорочтение» уехали в «Грамматику», под ней — своя подпись.
    expect(counts).toEqual(['7 тренажеров', '4 тренажера', '5 тренажеров', '6 тренажеров', '125 тем и игры'])
  })
})
