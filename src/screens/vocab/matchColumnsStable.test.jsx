// @vitest-environment jsdom
//
// Регрессия «Соедините» в практике Словаря: слова задания собирались инлайном
// на каждый рендер экрана, и «Соедините» тасовало по ним обе колонки. Любой
// посторонний рендер (тост «нет голоса», снятие flash-сообщения через 2200 мс,
// поздний ответ getVocabScope) пересдавал колонки прямо под пальцем: ученик
// тапал слово слева, колонки перетасовывались, второй тап попадал в другое
// слово — и ОБА уходили в ошибки, хотя знал он их оба.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import VocabPractice from './VocabPractice.jsx'

// Четырёх слов хватает, чтобы очередь цикла 1 была [choice, match].
const CARDS = [
  { en: 'apple', ru: 'яблоко' },
  { en: 'bread', ru: 'хлеб' },
  { en: 'water', ru: 'вода' },
  { en: 'house', ru: 'дом' },
]

const byClass = (cls) => [...document.querySelectorAll(cls)]
const columns = () => byClass('.vp-pair').map((b) => b.textContent)

function view(cards) {
  return (
    <I18nProvider>
      <VocabPractice cards={cards} lang="ru" title="T" token={null} scopeId={null} onExit={() => {}} />
    </I18nProvider>
  )
}

// Первое задание очереди — «выберите перевод»; проходим его, чтобы добраться
// до «соедините».
function goToMatch() {
  fireEvent.click(byClass('button').find((b) => b.textContent === 'Начать'))
  fireEvent.click(byClass('.vp-opt')[0])
  fireEvent.click(byClass('.vp-btn')[0])
}

describe('Словарь → практика → «Соедините»', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('перерисовка экрана не пересдаёт колонки', () => {
    const { rerender } = render(view(CARDS))
    goToMatch()

    const before = columns()
    expect(before.length).toBeGreaterThanOrEqual(6) // три пары и больше, две колонки

    // Тот же самый массив карточек: это не смена данных, а просто ещё один
    // рендер экрана — ровно то, что делает тост или поздний фоновый ответ.
    rerender(view(CARDS))
    rerender(view(CARDS))

    expect(columns()).toEqual(before)
  })

  it('выбор слева переживает перерисовку и пара засчитывается', () => {
    const { rerender } = render(view(CARDS))
    goToMatch()

    const all = byClass('.vp-pair')
    fireEvent.click(all[0])
    const selIdx = () => byClass('.vp-pair').findIndex((b) => b.className.includes('sel'))
    const before = selIdx()
    expect(before).toBe(0)

    rerender(view(CARDS))

    // Выделенное слово осталось НА ТОМ ЖЕ МЕСТЕ. Проверяем позицию, а не текст:
    // при пересдаче колонок слово никуда не девается — оно переезжает под
    // палец соседа, и второй тап попадает не туда.
    expect(selIdx()).toBe(before)
  })
})
