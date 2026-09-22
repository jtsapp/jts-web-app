// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import { ConnectorsTask } from './ChipTasks.jsx'

// Банк связок собирается из УНИКАЛЬНЫХ ответов (engine.js: conBank), а
// пропусков восемь и связки в них повторяются. Пока фишка гасла после первого
// верного ответа, второму пропуску с тем же словом брать было нечего.
const GENRE = { id: 'g-test' }

function makeTask(items, bank) {
  return { id: 't3', type: 'connectors', bank, items }
}

function renderTask(task) {
  return render(
    <I18nProvider>
      <ConnectorsTask genre={GENRE} task={task} />
    </I18nProvider>,
  )
}

const chip = (view, word) =>
  [...view.container.querySelectorAll('.wr-chip--task')].find((b) => b.textContent === word)
const gaps = (view) => [...view.container.querySelectorAll('.wr-gap')]

// Механика экрана: сначала тап по фишке, потом тап по пропуску.
function answer(view, word, gapIndex) {
  fireEvent.click(chip(view, word))
  fireEvent.click(gaps(view)[gapIndex])
}

describe('ConnectorsTask — фишка тратится по числу пропусков', () => {
  beforeEach(() => localStorage.clear())

  it('одна связка на два пропуска: после первого фишка ещё активна', () => {
    const view = renderTask(
      makeTask(
        [
          { id: 'cn0', before: 'I am happy', after: 'the weather is warm.', answer: 'because', why: '' },
          { id: 'cn1', before: 'I am tired', after: 'I worked all day.', answer: 'because', why: '' },
        ],
        ['because', 'but'],
      ),
    )

    answer(view, 'because', 0)
    expect(chip(view, 'because').disabled).toBe(false)

    answer(view, 'because', 1)
    // Оба пропуска закрыты верно — только теперь фишка исчерпана.
    expect(chip(view, 'because').disabled).toBe(true)
    expect(gaps(view).map((g) => g.textContent)).toEqual(['because', 'because'])
  })

  it('фишка-дистрактор не гаснет: серый цвет выдавал бы неверные варианты', () => {
    const view = renderTask(
      makeTask([{ id: 'cn0', before: 'I like tea', after: 'I do not like coffee.', answer: 'but', why: '' }], [
        'but',
        'however',
      ]),
    )

    answer(view, 'but', 0)
    expect(chip(view, 'but').disabled).toBe(true)
    expect(chip(view, 'however').disabled).toBe(false)
  })

  it('неверный ответ фишку не тратит', () => {
    const view = renderTask(
      makeTask([{ id: 'cn0', before: 'I am tired', after: 'I worked all day.', answer: 'because', why: '' }], [
        'because',
        'but',
      ]),
    )

    answer(view, 'but', 0)
    expect(chip(view, 'but').disabled).toBe(false)
    expect(chip(view, 'because').disabled).toBe(false)
  })

  it('заглавная связка в банке закрывает пропуск со строчным ответом', () => {
    // В банк попадает и ответ с заглавной («Then» в начале предложения), и
    // добивка из bank.conn — сверяем по norm, иначе вместимость не сойдётся.
    const view = renderTask(
      makeTask([{ id: 'cn0', before: 'First I do my homework.', after: ', I watch a film.', answer: 'Then', why: '' }], [
        'Then',
        'and',
      ]),
    )

    answer(view, 'Then', 0)
    expect(chip(view, 'Then').disabled).toBe(true)
  })
})
