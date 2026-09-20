// @vitest-environment jsdom
// Регрессия «Разложи по категориям»: фишка в корзине рисовалась span'ом без
// обработчика и вернуть её в пул было нечем, а «Проверить» оставалась серой
// навсегда — Categorize единственный из типов не брал setCanCheck/bind.
// Ошибся корзиной — выхода нет: авто-проверка через 250 мс закрывала
// упражнение неверным ответом.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityPlayer from './ActivityPlayer.jsx'

const ACT = {
  type: 'categorize',
  typeLabel: 'categorize',
  prompt: 'Разложи наречия по частоте',
  buckets: ['Часто', 'Редко'],
  items: [
    { t: 'usually', b: 0 },
    { t: 'rarely', b: 1 },
  ],
}

function play(activity = ACT) {
  return render(
    <ActivityPlayer activities={[activity]} lang="ru" onExit={() => {}} onNextLesson={() => {}} />,
  )
}

const poolItem = (text) =>
  [...document.querySelectorAll('.gr-cat-item')].find((b) => b.textContent === text)
const bucket = (i) => document.querySelectorAll('.gr-bucket')[i]
const placedChip = (text) =>
  [...document.querySelectorAll('.gr-chip-in')].find((b) => b.textContent === text)
const checkBtn = () => screen.getByRole('button', { name: 'Проверить' })

// Механика экрана: тап по слову в пуле, затем тап по корзине.
function put(text, bucketIndex) {
  fireEvent.click(poolItem(text))
  fireEvent.click(bucket(bucketIndex))
}

describe('Grammar categorize — раскладку можно исправить и проверить вручную', () => {
  it('«Проверить» включается, когда разложено всё, и не раньше', () => {
    play()
    expect(checkBtn().disabled).toBe(true)

    put('usually', 0)
    expect(checkBtn().disabled).toBe(true)

    put('rarely', 1)
    expect(checkBtn().disabled).toBe(false)

    fireEvent.click(checkBtn())
    expect(screen.getByText(/Все слова в правильных группах/)).toBeTruthy()
  })

  it('тап по разложенной фишке возвращает её в пул — ошибку можно исправить', () => {
    play()
    put('usually', 1) // промах: usually — «Часто»
    expect(placedChip('usually')).toBeTruthy()
    expect(poolItem('usually')).toBeUndefined()

    fireEvent.click(placedChip('usually'))
    expect(poolItem('usually')).toBeTruthy()
    expect(checkBtn().disabled).toBe(true)

    put('usually', 0)
    put('rarely', 1)
    fireEvent.click(checkBtn())
    expect(screen.getByText(/Все слова в правильных группах/)).toBeTruthy()
  })

  it('пока слово выбрано, клик по корзине с фишками остаётся раскладкой', () => {
    play()
    put('usually', 0)
    // rarely в руках — тап по той же корзине должен положить его туда,
    // а не выдернуть usually обратно.
    fireEvent.click(poolItem('rarely'))
    fireEvent.click(bucket(0))
    expect(placedChip('usually')).toBeTruthy()
    expect(placedChip('rarely')).toBeTruthy()
  })

  it('тап по САМОЙ разложенной фишке с выбранным словом кладёт, а не вынимает', () => {
    // Прицельно по guard'у `sel !== null` в onClick фишки: клик по корзине
    // мимо фишек его не задевает вовсе, и без этого теста правку можно было
    // снять, не уронив ни одного теста.
    play()
    put('usually', 0)
    fireEvent.click(poolItem('rarely'))
    fireEvent.click(placedChip('usually')) // тап именно по фишке в корзине

    expect(placedChip('usually')).toBeTruthy() // не выдернулась
    expect(placedChip('rarely')).toBeTruthy() // и rarely легла в ту же корзину
    expect(poolItem('rarely')).toBeUndefined()
  })

  it('само по себе упражнение больше не закрывается', () => {
    play()
    put('usually', 1)
    put('rarely', 0)
    // Всё разложено неверно, но вердикта нет — ждём «Проверить».
    expect(screen.queryByText(/Некоторые слова не в той группе/)).toBeNull()
    expect(checkBtn()).toBeTruthy()
  })
})

describe('Grammar — «Проверить» не рисуется там, где её нельзя нажать', () => {
  const checkBtns = () => [...document.querySelectorAll('.gr-check')]

  // matching / truefalse / timeline не берут setCanCheck и доигрывают сами —
  // их «Проверить» была серой ВСЕГДА.
  it.each([
    ['matching', { type: 'matching', typeLabel: 'matching', prompt: 'p', pairs: [{ l: 'a', r: '1' }, { l: 'b', r: '2' }] }],
    ['truefalse', { type: 'truefalse', typeLabel: 'truefalse', prompt: 'p', items: [{ s: 'x', v: true }] }],
    ['timeline', { type: 'timeline', typeLabel: 'timeline', prompt: 'p', zones: [{ z: 'past' }, { z: 'now' }], answer: 'past' }],
  ])('%s — кнопки нет', (_name, activity) => {
    play(activity)
    expect(checkBtns()).toHaveLength(0)
  })

  it('categorize — кнопка есть: он теперь ждёт нажатия', () => {
    play()
    expect(checkBtns()).toHaveLength(1)
  })
})
