// Инварианты экстрактора воркбука: срез по маркерам жив, данные полные,
// повторный прогон детерминирован. Падение здесь = кто-то пере-экспортировал
// прототип и структура уехала — чинить надо экстрактор, а не замалчивать.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { slicePrototype, evalPrototype, validate, oracleAct, EXPECT, TOP_TYPES } from './extract-workbook.js'

const SRC = path.join(process.cwd(), 'data', 'jtsworkbook-a0.html')
const html = fs.readFileSync(SRC, 'utf8')

describe('extract-workbook', () => {
  it('срез находит маркеры и не содержит DOM-кода', () => {
    const { data, engine } = slicePrototype(html)
    expect(data.length).toBeGreaterThan(100000)
    expect(data).toContain('var UNITS=')
    expect(data).toContain('practice-first workbook')
    // Рендер остался за границей среза
    expect(data).not.toContain('function renderAct')
    expect(data).not.toContain('document.createElement')
    expect(engine).toContain('function shuffle')
    expect(engine).toContain('function optOrder')
    expect(engine).toContain('function nrm')
  })

  it('данные полные: 7 юнитов, 31 урок, 409 экранов, все типы известны', () => {
    const sb = evalPrototype(html)
    const stats = validate(sb, 'a0')
    expect(stats.lessons).toBe(EXPECT.a0.lessons)
    // 378 заданий данных + 31 turn, разложенный на write+speak
    expect(stats.acts).toBe(409)
    const types = new Set()
    Object.values(sb.WB).forEach((W) => W.acts.forEach((a) => types.add(a.t)))
    for (const t of types) expect(TOP_TYPES).toContain(t)
    // turn живёт только в источнике: пост-обработка обязана его разложить
    expect(types.has('turn')).toBe(false)
  })

  it('повторное исполнение детерминировано байт-в-байт', () => {
    const a = evalPrototype(html)
    const b = evalPrototype(html)
    expect(JSON.stringify(a.WB)).toBe(JSON.stringify(b.WB))
    expect(JSON.stringify(a.UNITS)).toBe(JSON.stringify(b.UNITS))
  })

  it('оракул воспроизводится: тот же порядок на повторном прогоне', () => {
    const a = evalPrototype(html)
    const b = evalPrototype(html)
    const acts = a.WB[1].acts
    acts.forEach((act, i) => {
      expect(JSON.stringify(oracleAct(a, act, '1.' + i))).toBe(
        JSON.stringify(oracleAct(b, b.WB[1].acts[i], '1.' + i))
      )
    })
  })

  it('валидатор ловит подмену ключа ответа', () => {
    const sb = evalPrototype(html)
    // Найти первый pick и увести ключ за границу списка вариантов
    let touched = false
    for (const n of Object.keys(sb.WB)) {
      for (const act of sb.WB[n].acts) {
        if (act.t === 'choose' && act.items && act.items[0]) {
          act.items[0].a = 99
          touched = true
          break
        }
      }
      if (touched) break
    }
    expect(touched).toBe(true)
    expect(() => validate(sb, 'a0')).toThrow(/ключ не индекс/)
  })
})
