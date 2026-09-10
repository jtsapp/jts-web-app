import { describe, expect, it } from 'vitest'
import { sliceConst, sliceFunction } from './js-slice.js'

describe('sliceFunction', () => {
  it('берёт функцию целиком, вместе с сигнатурой', () => {
    const src = 'const a=1;\nfunction pick(x){ return x+1 }\nconst b=2;'
    expect(sliceFunction(src, 'pick')).toBe('function pick(x){ return x+1 }')
  })

  it('не закрывается на фигурной скобке внутри регэкспа', () => {
    const src = 'function slots(t){ const n=(t.match(/\\{[^}]+\\}/g)||[]).length; return n }'
    expect(sliceFunction(src, 'slots')).toBe(src)
  })

  it('не закрывается на скобке внутри строки', () => {
    const src = 'function say(){ return "}" }'
    expect(sliceFunction(src, 'say')).toBe(src)
  })

  it('падает на отсутствующей функции, а не возвращает пустое', () => {
    expect(() => sliceFunction('function a(){}', 'b')).toThrow(/не найдена функция b/)
  })
})

describe('sliceConst', () => {
  it('берёт объявление до точки с запятой верхнего уровня', () => {
    const src = "const X = {a:1, b:';'};\nconst Y = 2;"
    expect(sliceConst(src, 'X')).toBe("const X = {a:1, b:';'}")
  })

  it('не путает похожие имена', () => {
    const src = 'const SIZE = 1;\nconst SIZE_L = new Set(["cow"]);'
    expect(sliceConst(src, 'SIZE_L')).toBe('const SIZE_L = new Set(["cow"])')
  })

  it('закрывает объявление переводом строки, когда точки с запятой нет', () => {
    const src = 'const A = [1, 2,\n  3]\nconst B = 4'
    expect(sliceConst(src, 'A')).toBe('const A = [1, 2,\n  3]')
  })

  it('не режет стрелочную функцию по точке с запятой в её теле', () => {
    const src = 'const f = (x)=>{ const y=x+1; return y };\nconst g = 1;'
    expect(sliceConst(src, 'f')).toBe('const f = (x)=>{ const y=x+1; return y }')
  })

  it('падает на отсутствующем объявлении', () => {
    expect(() => sliceConst('const A = 1;', 'B')).toThrow(/не найдено объявление B/)
  })
})
