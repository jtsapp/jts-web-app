// Ревью «Практики» 08.10.2026: верный ответ «Неправильных глаголов»
// засчитывался неверным. Расшифровки — то, что настоящий Chrome пишет на эти
// слова (замер на живом распознавателе), письменные ответы — то, что ученик
// набирает руками.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkForm, checkWritten, scoreTargets, writtenFields } from './engine.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const DATA = JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'verbs', 'verbs.json'), 'utf8'))
const BY = Object.fromEntries(DATA.verbs.map((v) => [v.v1, v]))

const repeat = (expected, text) => scoreTargets(expected, text, { mode: 'repeat', gap: 1, aliases: DATA.aliases })
const gap = (form, text, g = 1) => scoreTargets([form], text, { mode: 'gap', gap: g, aliases: DATA.aliases })

describe('речь: созвучия, которые пишет распознаватель', () => {
  it('read в прошедшем звучит как «red», write — как «right»', () => {
    expect(repeat(['read', 'read', 'read'], 'read red red').hits).toBe(3)
    expect(repeat(['write', 'wrote', 'written'], 'right wrote written').hits).toBe(3)
  })

  it('blew → blue, rode → Road, threw → true/through, eaten → Eden, win → when', () => {
    expect(gap('blew', 'blue').hits).toBe(1)
    expect(gap('rode', 'Road').hits).toBe(1)
    expect(gap('threw', 'true').hits).toBe(1)
    expect(gap('threw', 'through').hits).toBe(1)
    expect(repeat(['eat', 'ate', 'eaten'], 'eat ate Eden').hits).toBe(3)
    expect(repeat(['win', 'won', 'won'], 'when won won').hits).toBe(3)
  })

  it('hear/heard, meet, wear/wore/worn — омофоны засчитываются', () => {
    expect(repeat(['hear', 'heard', 'heard'], 'here herd heard').hits).toBe(3)
    expect(gap('meet', 'meat').hits).toBe(1)
    expect(repeat(['wear', 'wore', 'worn'], 'where war warn').hits).toBe(3)
  })

  it('созвучие не подменяет другую форму того же глагола', () => {
    // «lead» на месте V2 — ошибка ученика, а не распознавателя.
    expect(repeat(['lead', 'led', 'led'], 'lead lead lead').hits).toBe(1)
  })

  it('цифрами: «eat 8 eaten», «1» за won', () => {
    expect(repeat(['eat', 'ate', 'eaten'], 'eat 8 eaten').hits).toBe(3)
    expect(gap('won', '1', 2).hits).toBe(1)
  })
})

describe('речь: лишнее слово не сдвигает сверку', () => {
  it('слово-паразит перед ответом', () => {
    expect(repeat(['go', 'went', 'gone'], 'um go went gone').hits).toBe(3)
    expect(gap('went', 'um went').hits).toBe(1)
  })

  it('be — was were — been: оба варианта V2 подряд', () => {
    expect(repeat(['be', 'was', 'been'], 'be was were been').hits).toBe(3)
  })

  it('распознаватель повторил слово', () => {
    expect(repeat(['go', 'went', 'gone'], 'go go went gone').hits).toBe(3)
  })

  it('пропущенная форма — промах только у неё', () => {
    const r = repeat(['go', 'went', 'gone'], 'go gone')
    expect(r.hits).toBe(2)
    expect(r.results.map((x) => x.heard)).toEqual([true, false, true])
  })

  it('чужое слово вместо формы — по-прежнему промах', () => {
    expect(repeat(['go', 'went', 'gone'], 'go goed gone').results.map((x) => x.heard)).toEqual([true, false, true])
    expect(gap('went', 'goed').hits).toBe(0)
  })
})

describe('письмо: оба варианта формы', () => {
  it('was/were в любом порядке и через любой разделитель', () => {
    for (const value of ['were/was', 'was, were', 'were, was', 'was or were', 'was were', 'Were / Was.']) {
      expect(checkForm(value, BY.be, 1), value).toBe(true)
    }
    expect(checkForm('got, gotten', BY.get, 2)).toBe(true)
  })

  it('повтор одного варианта и чужая форма — нет', () => {
    expect(checkForm('was/was', BY.be, 1)).toBe(false)
    expect(checkForm('was/been', BY.be, 1)).toBe(false)
    expect(checkForm('went/gone', BY.go, 1)).toBe(false)
  })

  it('кириллическая «с»/«е» в латинском слове', () => {
    // Раскладку не переключили на одной букве: на экране «came» и «сame»
    // неразличимы.
    expect(checkForm('сame', BY.come, 1)).toBe(true)
    const fix = DATA.fixes.find((f) => f.answer === 'went')
    const fields = writtenFields('fix', fix, BY[fix.verb], 3)
    expect(checkWritten(fields, ['wеnt'], { mode: 'fix', item: fix, v: BY[fix.verb] }).hits).toBe(1)
  })
})
