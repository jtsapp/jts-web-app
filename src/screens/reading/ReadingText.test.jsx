// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { READING_KEY } from '../../practice/practiceKeys.js'
import { resetReadingMemory } from '../../practice/reading/readingProgress.js'

// Текст, слова и озвучка к проверке отношения не имеют, а тянут словарь и
// синтез речи — заглушаем, остаётся панель заданий с кнопкой «Завершить».
vi.mock('./ReadingArticle.jsx', () => ({ default: () => null }))
vi.mock('./ReadingKeywords.jsx', () => ({ default: () => null }))
vi.mock('./useReadingVoice.js', () => ({
  default: () => ({ playing: false, paused: false, index: -1, start() {}, stop() {}, pauseResume() {} }),
}))

const { default: ReadingText } = await import('./ReadingText.jsx')

const TEXT = {
  id: 'b1-adv-jungle',
  level: 'B1',
  genre: 'adventure',
  title: 'Eleven Days in the Jungle',
  task: { ru: 'Прочитайте.' },
  text: ['Juliane fell into the jungle.'],
  cover: { emoji: '🌴' },
  words: [],
  exercises: [
    { type: 'tf', instruction: { ru: 'Правда или ложь?' }, items: [{ s: 'Juliane survived.', a: true }, { s: 'She was forty.', a: false }] },
    { type: 'order', instruction: { ru: 'По порядку.' }, items: ['first', 'second', 'third'] },
  ],
}

function mount(onFinish = () => {}, extra = {}) {
  return render(
    <I18nProvider>
      <ReadingText text={TEXT} dict={null} ensureDict={() => Promise.resolve(null)} token="" onFont={() => {}} onSettings={() => {}} onFinish={onFinish} {...extra} />
    </I18nProvider>,
  )
}

function saved() {
  const raw = localStorage.getItem(READING_KEY)
  return raw ? JSON.parse(raw).texts[TEXT.id] : undefined
}

function pick(utils, question, option) {
  fireEvent.click(within(utils.getByRole('radiogroup', { name: question })).getAllByRole('radio')[option])
}

// Прогресс страницы живёт в модульной памяти readingProgress — она переживает
// localStorage.clear(), поэтому сбрасываем её отдельно.
beforeEach(() => {
  localStorage.clear()
  resetReadingMemory()
})
afterEach(cleanup)

// Жалоба: все ответы верные, а итог 0 %. Ученик выбрал ответы и сразу нажал
// «Завершить», не нажимая «Проверить» у каждого задания, — а баллы писала только
// «Проверить», и выбранное пропадало вместе с экраном.
describe('ReadingText — «Завершить» досдаёт непроверенные задания', () => {
  it('выбранные, но не проверенные ответы засчитываются', () => {
    const onFinish = vi.fn()
    const utils = mount(onFinish)
    pick(utils, 'Juliane survived.', 0)
    pick(utils, 'She was forty.', 1)

    fireEvent.click(utils.getByRole('button', { name: /Завершить и увидеть результат/ }))

    expect(saved().ex[0]).toEqual({ score: 2, total: 2 })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('нетронутое задание не записывается — иначе 0/N считалось бы сделанным', () => {
    const utils = mount()
    pick(utils, 'Juliane survived.', 0)

    fireEvent.click(utils.getByRole('button', { name: /Завершить и увидеть результат/ }))

    expect(saved().ex[0]).toEqual({ score: 1, total: 2 })
    expect(saved().ex[1]).toBeUndefined()
  })

  it('показанный ответ не засчитывается и на «Завершить»', () => {
    const utils = mount()
    fireEvent.click(utils.getAllByRole('button', { name: /Показать ответ/ })[0])

    fireEvent.click(utils.getByRole('button', { name: /Завершить и увидеть результат/ }))

    expect(saved()).toBeUndefined()
  })

  it('проверенное вручную не перезаписывается досдачей', () => {
    const utils = mount()
    pick(utils, 'Juliane survived.', 1) // неверно
    fireEvent.click(utils.getAllByRole('button', { name: /Проверить/ })[0])
    expect(saved().ex[0]).toEqual({ score: 0, total: 2 })

    fireEvent.click(utils.getByRole('button', { name: /Завершить и увидеть результат/ }))

    expect(saved().ex[0]).toEqual({ score: 0, total: 2 })
  })
})

// Ревью 08.10.2026: «Открыть» в «Что повторить» на телефоне вела на вкладку
// текста — задание приходилось искать самому. Прототип открывал вкладку
// заданий и прокручивал к нужному (data-goto, :1115).
describe('ReadingText — переход к заданию из итогов', () => {
  it('открывается на вкладке заданий и прокручивает к нужному', () => {
    // В jsdom scrollIntoView нет вовсе — подставляем свой.
    const scrolled = []
    const orig = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function () {
      scrolled.push(this.id)
    }
    try {
      const utils = mount(undefined, { initialTab: 'ex', focusEx: 1 })
      expect(utils.container.querySelector('.rd-grid2').dataset.tab).toBe('ex')
      expect(utils.getByRole('tab', { name: /Задания/ }).getAttribute('aria-selected')).toBe('true')
      expect(scrolled).toEqual(['rd-ex-1'])
    } finally {
      Element.prototype.scrollIntoView = orig
    }
  })

  it('без перехода — как раньше, на тексте', () => {
    const utils = mount()
    expect(utils.container.querySelector('.rd-grid2').dataset.tab).toBe('text')
  })
})
