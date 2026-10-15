// Плашка промаха Word Rush. На ней RunnerGame держит эталон ряда для помощника по сайту (data-assistant-expected),
// поэтому важно, что она бывает ТОЛЬКО после промаха и только своё время. Сам экран — сцена three.js, в тесте его не
// поднять, поэтому решение «показывать ли» вынесено сюда.
import { describe, expect, it } from 'vitest'
import { missToast } from './hud.js'

const row = { prompt: 'кошка', answer: 'cat' }
const run = (hit, at, elapsed) => ({ elapsed, last: { ...row, hit, at } })

describe('missToast', () => {
  it('промах — слово и верный перевод', () => {
    expect(missToast(run(false, 10, 10.4), 1.5)).toEqual({ prompt: 'кошка', answer: 'cat' })
  })

  it('верные ворота — плашки нет: эталон показывать незачем', () => {
    expect(missToast(run(true, 10, 10.4), 1.5)).toBeNull()
  })

  it('плашка гаснет через своё время', () => {
    expect(missToast(run(false, 10, 11.5), 1.5)).toBeNull()
  })

  it('до первого ряда и без забега — плашки нет', () => {
    expect(missToast({ elapsed: 3, last: null }, 1.5)).toBeNull()
    expect(missToast(null, 1.5)).toBeNull()
  })
})
