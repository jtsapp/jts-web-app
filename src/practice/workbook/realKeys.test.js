// Ревью «Практики» 08.10.2026: верные ответы воркбука, которые судья уровня
// браковал. Ключи — настоящие (public/practice/workbook/<level>/lesson-N.json),
// пункт ищется по тексту ключа, чтобы тест не зависел от номеров экранов.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { typeOk } from './engine.js'

const lessonOf = (level, n) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/workbook', level, `lesson-${n}.json`), 'utf8'))

// Первый объект урока с ключом `a` === key (пункт задания или шаг цепочки).
function itemByKey(level, n, key) {
  let hit = null
  const walk = (o) => {
    if (hit || !o || typeof o !== 'object') return
    if (Array.isArray(o)) return o.forEach(walk)
    if (o.a === key) {
      hit = o
      return
    }
    Object.values(o).forEach(walk)
  }
  walk(lessonOf(level, n))
  if (!hit) throw new Error(`нет пункта «${key}» в ${level} L${n}`)
  return hit
}

const cases = (title, rows) =>
  describe(title, () => {
    for (const [level, n, key, input, ok] of rows) {
      it(`${level} L${n} «${key}» ← «${input}» → ${ok ? 'верно' : 'неверно'}`, () => {
        expect(typeOk(itemByKey(level, n, key), input, level)).toBe(ok)
      })
    }
  })

cases('Американское написание — тот же ответ (на A2 принималось, на других уровнях нет)', [
  ['b2', 12, 'cancelled', 'canceled', true],
  ['b1', 25, 'grey', 'gray', true],
  ['b1', 25, 'moustache', 'mustache', true],
  ['b2', 36, 'analyse', 'analyze', true],
  ['b2', 21, 'cosy', 'cozy', true],
  ['b2', 7, 'multicoloured', 'multicolored', true],
  ['a1', 14, 'cosy', 'cozy', true],
  ['a0', 1, 'favourite', 'favorite', true],
  // Неверное слово неверным и остаётся.
  ['b2', 12, 'cancelled', 'cancel', false],
  ['b1', 25, 'grey', 'green', false],
])

cases('Две формы прошедшего: learnt / learned, spilt / spilled', [
  ['b2', 21, 'She learnt it easily', 'She learned it easily', true],
  ['b2', 6, 'Somebody must have spilt a drink on it', 'Somebody must have spilled a drink on it', true],
])

cases('Дефис, пробел и слитное написание — один ответ', [
  ['a2', 26, 'weight-lifting', 'weightlifting', true],
  ['a2', 26, 'weight-lifting', 'weight lifting', true],
  ['b1', 8, 'full-time', 'full time', true],
  ['a2', 2, 'to-do list', 'to do list', true],
])

cases('cannot = can not = can’t', [['a2', 22, 'can’t', 'cannot', true]])

cases('Числа и время', [
  ['a1', 22, '2478000', '2 478 000', true],
  ['a1', 22, '2478000', '2 478 000', true],
  ['a1', 22, '45.5', '45,5 %', true],
  ['a1', 22, '45.5', '45,5', true],
  // Раньше точка просто вырезалась, и «455» засчитывалось за 45.5.
  ['a1', 22, '45.5', '455', false],
  ['a1', 22, '21', '21°C', true],
  ['a1', 22, '21', '21 °C', true],
  ['a1', 22, '21', '21°', true],
  ['a1', 8, '8:30', '08:30', true],
  ['a1', 8, '8:30', '8.30', true],
])

describe('общие правила не стали мягче', () => {
  it('слитное «alot» — не «a lot»', () => {
    expect(typeOk({ a: 'a lot' }, 'alot', 'a2')).toBe(false)
    expect(typeOk({ a: 'a lot' }, 'alot', 'b2')).toBe(false)
  })
  it('A0 по-прежнему не раскрывает сокращения', () => {
    expect(typeOk({ a: "I haven't seen him" }, 'I have not seen him', 'a0')).toBe(false)
  })
})
