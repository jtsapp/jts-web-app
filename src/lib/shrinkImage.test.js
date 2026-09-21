import { describe, it, expect } from 'vitest'
import { fitSize } from './shrinkImage.js'

// Фото с телефона — 4000×3000 и 4–8 МБ; в localStorage (≈5 МБ на сайт) оно либо
// не влезало вовсе, либо забивало место прогрессу практики и словаря. Аватар
// рисуется кружком меньше 100px — 256 по длинной стороне хватает и на ретине.
describe('fitSize', () => {
  it('ужимает по длинной стороне, сохраняя пропорции', () => {
    expect(fitSize(4000, 3000, 256)).toEqual({ width: 256, height: 192 })
    expect(fitSize(3000, 4000, 256)).toEqual({ width: 192, height: 256 })
  })

  it('маленькое не растягивает', () => {
    expect(fitSize(120, 80, 256)).toEqual({ width: 120, height: 80 })
  })

  it('битые размеры — null', () => {
    expect(fitSize(0, 100, 256)).toBeNull()
    expect(fitSize(NaN, 100, 256)).toBeNull()
  })
})
