// @vitest-environment jsdom
//
// Регрессия «Соедините» в практике Словаря: слова задания собирались инлайном
// на каждый рендер экрана, и «Соедините» тасовало по ним обе колонки. Тогда
// посторонний рендер пересдавал колонки прямо под пальцем: ученик тапал слово
// слева, колонки перетасовывались, второй тап попадал в другое слово — и ОБА
// уходили в ошибки, хотя знал он их оба. В проде такой рендер приходит от
// VocabularyPage (она держит экран практики за ранним return, а у неё в полёте
// getVocabScope с поздним onFresh); rerender тем же массивом карточек — его
// точный эквивалент, потому что cards там useState и ссылку не меняет.
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
  // Своя случайность вместо Math.random: КАЖДЫЙ новый прогон shuffle обязан
  // дать другой порядок, иначе тест зелёный и на сломанном коде — колонки
  // пересдались, но легли так же. С сидом-константой (как в matchUi.test.jsx)
  // получилось бы ровно это. Заодно считаем сами обращения: «колонки не
  // пересдавались» — это ноль новых вызовов, а не «порядок совпал».
  let draws = 0
  beforeEach(() => {
    draws = 0
    let seed = 0.123
    vi.spyOn(Math, 'random').mockImplementation(() => {
      draws += 1
      seed = (seed * 9301 + 49297) % 233280 / 233280
      return seed
    })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('перерисовка экрана не пересдаёт колонки', () => {
    const { rerender } = render(view(CARDS))
    goToMatch()

    const before = columns()
    expect(before.length).toBeGreaterThanOrEqual(6) // три пары и больше, две колонки
    const drawsAfterMount = draws

    // Тот же самый массив карточек: это не смена данных, а просто ещё один
    // рендер экрана — ровно то, что делает поздний фоновый ответ getVocabScope.
    rerender(view(CARDS))
    rerender(view(CARDS))

    // Главное утверждение — тасовать больше НЕ ходили. Сравнение порядка
    // оставлено вторым: оно поймает и пересдачу другим путём.
    expect(draws).toBe(drawsAfterMount)
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
    const drawsAfterPick = draws

    rerender(view(CARDS))
    expect(draws).toBe(drawsAfterPick)

    // Выделенное слово осталось НА ТОМ ЖЕ МЕСТЕ. Проверяем позицию, а не текст:
    // при пересдаче колонок слово никуда не девается — оно переезжает под
    // палец соседа, и второй тап попадает не туда.
    expect(selIdx()).toBe(before)
  })
})
