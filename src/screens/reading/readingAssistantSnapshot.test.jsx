// @vitest-environment jsdom
// Что про упражнения «Чтения» узнаёт помощник по сайту (снимок экрана). Верный ответ — только после «Проверить» с
// ошибками: до проверки помощник даёт лишь подсказки, а «соедини пары» верных пар не показывает и после неё — без ключа
// помощник угадывал бы их сам.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { resetReadingMemory } from '../../practice/reading/readingProgress.js'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'
import ReadingTasks from './ReadingTasks.jsx'

const TEXT = {
  id: 'a1-test-honey',
  exercises: [
    { type: 'tf', instruction: { ru: 'Правда или ложь?' }, items: [{ s: 'Honey has got little water.', a: true }, { s: 'They found it in a shop.', a: false }] },
    {
      type: 'match',
      instruction: { ru: 'Соедините слово и картинку.' },
      pairs: [
        { l: 'honey', r: '🍯', alt: { en: 'honey', ru: 'мёд' } },
        { l: 'bee', r: '🐝', alt: { en: 'bee', ru: 'пчела' } },
      ],
    },
    { type: 'gap', instruction: { ru: 'Заполните пропуски.' }, text: 'Old {pots} with {honey}.', extra: ['bread'] },
    { type: 'order', instruction: { ru: 'По порядку.' }, items: ['first', 'second', 'third'] },
    { type: 'reflection', instruction: { ru: 'Ваше мнение.' }, q: 'Do you like honey?', keys: [['sweet']], min: 1, model: 'Yes, it is sweet.' },
    { type: 'mc', instruction: { ru: 'Выберите ответ.' }, items: [{ q: 'Where is the honey?', o: ['in a shop', 'in a tomb'], a: 1 }] },
  ],
}

const EXPECTED = 'верный ответ по заданию'

function mount() {
  return render(
    <I18nProvider>
      <ReadingTasks text={TEXT} />
    </I18nProvider>,
  )
}

const ex = (utils, i) => within(utils.container.querySelector(`#rd-ex-${i}`))
const check = (utils, i) => fireEvent.click(ex(utils, i).getByRole('button', { name: /Проверить/ }))
const pick = (utils, i, question, option) =>
  fireEvent.click(within(ex(utils, i).getByRole('radiogroup', { name: question })).getAllByRole('radio')[option])

beforeEach(() => {
  localStorage.clear()
  resetReadingMemory()
})
afterEach(cleanup)

describe('снимок «Чтения» для помощника: верный ответ — только после окончательной проверки с ошибками', () => {
  it('до проверки ключа нет ни у одного упражнения', () => {
    const utils = mount()
    pick(utils, 0, 'Honey has got little water.', 1)
    expect(snapshotScreen(utils.container)).not.toContain(EXPECTED)
  })

  it('правда / ложь с ошибкой — ключ подписями кнопок', () => {
    const utils = mount()
    pick(utils, 0, 'Honey has got little water.', 1) // неверно
    pick(utils, 0, 'They found it in a shop.', 1)
    check(utils, 0)

    const snap = snapshotScreen(utils.container)
    expect(snap).toContain(`[${EXPECTED}: «1) Правда; 2) Ложь»]`)
    // Ключ стоит под итогом своего упражнения, а не чужого.
    expect(snap).toMatch(/Верно 1 из 2\n\[верный ответ по заданию: «1\) Правда; 2\) Ложь»\]/)
  })

  it('выбор, решённый верно, ключа не несёт', () => {
    const utils = mount()
    pick(utils, 5, 'Where is the honey?', 1)
    check(utils, 5)
    const snap = snapshotScreen(utils.container)
    expect(snap).toContain('Всё верно!')
    expect(snap).not.toContain(EXPECTED)
  })

  it('пары: после проверки на экране только отметки — пары приходят ключом', () => {
    const utils = mount()
    check(utils, 1)
    expect(snapshotScreen(utils.container)).toContain(`[${EXPECTED}: «honey → 🍯 (мёд); bee → 🐝 (пчела)»]`)
  })

  it('пропуски и порядок — по номерам', () => {
    const utils = mount()
    check(utils, 2)
    check(utils, 3) // стартовый порядок перемешан так, что хоть один пункт не на месте
    const snap = snapshotScreen(utils.container)
    expect(snap).toContain(`[${EXPECTED}: «1) pots; 2) honey»]`)
    expect(snap).toContain(`[${EXPECTED}: «1. first; 2. second; 3. third»]`)
  })

  it('«мнение» ключа не имеет — его проверяют по идеям', () => {
    const utils = mount()
    fireEvent.change(ex(utils, 4).getByRole('textbox'), { target: { value: 'No.' } })
    check(utils, 4)
    expect(snapshotScreen(utils.container)).not.toContain(EXPECTED)
  })

  it('«Показать ответ» и «Ещё раз» ключ убирают', () => {
    const utils = mount()
    fireEvent.click(ex(utils, 1).getByRole('button', { name: /Показать ответ/ }))
    expect(snapshotScreen(utils.container)).not.toContain(EXPECTED)

    check(utils, 2)
    expect(snapshotScreen(utils.container)).toContain(EXPECTED)
    fireEvent.click(ex(utils, 2).getByRole('button', { name: /Ещё раз/ }))
    expect(snapshotScreen(utils.container)).not.toContain(EXPECTED)
  })
})
