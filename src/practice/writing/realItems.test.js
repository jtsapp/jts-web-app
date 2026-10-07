// Ревью «Практики» 08.10.2026: задания «Письма», где верный ответ не
// засчитывался (или неверный засчитывался). Пункты — настоящие, из
// public/practice/writing/<level>.json (банк transform), ищутся по подсказке.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { textMatch, punctMatch, punctPrompt } from './engine.js'

const bankOf = (level) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/writing', `${level}.json`), 'utf8'))

// Пункт банка transform в том виде, в каком его получает textMatch (buildGenre).
function itemByCue(level, cue, src) {
  let hit = null
  const walk = (o) => {
    if (hit || !o || typeof o !== 'object') return
    if (Array.isArray(o)) return o.forEach(walk)
    if (o.cue === cue && (!src || o.src === src) && (o.must || o.ans)) {
      hit = { cue: o.cue, src: o.src, answers: o.ans, must: o.must, avoid: o.avoid }
      return
    }
    Object.values(o).forEach(walk)
  }
  walk(bankOf(level))
  if (!hit) throw new Error(`нет пункта «${cue}» в ${level}`)
  return hit
}

describe('transform: стяжения и границы слов', () => {
  it('a1 «Add the missing verb»: «I\'m from Kazakhstan.» — верно', () => {
    const it1 = itemByCue('a1', 'Add the missing verb', 'I from Kazakhstan.')
    expect(textMatch("I'm from Kazakhstan.", it1)).toBe(true)
    expect(textMatch('I’m from Kazakhstan.', it1)).toBe(true)
    expect(textMatch('I am from Kazakhstan.', it1)).toBe(true)
  })

  it('b2 passive (avoid «we»): «Data were collected in March.» — верно', () => {
    const it2 = itemByCue('b2', 'Use the passive to keep it impersonal', 'We collected the data in March.')
    expect(textMatch('Data were collected in March.', it2)).toBe(true)
    expect(textMatch('The data were collected in March by the team.', it2)).toBe(true)
    // А сам запретный актив по-прежнему не проходит.
    expect(textMatch('We collected the data in March.', it2)).toBe(false)
  })

  it('a2+ «Make it more formal» (avoid «info»): «information» — не «info»', () => {
    const it3 = itemByCue('a2p', 'Make it more formal')
    const ok = (it3.answers || [])[0]
    expect(textMatch(ok, it3)).toBe(true)
    expect(textMatch('I would like more information about the course.', it3)).toBe(true)
  })

  it('основа слова в must («satisf») по-прежнему ловит satisfied', () => {
    expect(textMatch('We are not satisfied with the result', { must: ['satisf'] })).toBe(true)
  })

  it('короткое must — целым словом: «so» не находится в «soon»', () => {
    expect(textMatch('I was tired, so I went home', { must: ['so'] })).toBe(true)
    expect(textMatch('We left soon after dinner', { must: ['so'] })).toBe(false)
  })
})

describe('transform: неверное больше не засчитывается', () => {
  it('c1 «Merge two claims with a semicolon»: без «;» — неверно', () => {
    const it4 = itemByCue('c1', 'Merge two claims with a semicolon')
    expect(textMatch('hello world', it4)).toBe(false)
    expect(textMatch('The data are consistent, but the interpretation is not.', it4)).toBe(false)
    expect(textMatch('The data are consistent; the interpretation is not.', it4)).toBe(true)
  })

  it('исходное предложение без изменений — не ответ', () => {
    const it5 = itemByCue('c1', 'Merge two claims with a semicolon')
    expect(textMatch(it5.src, it5)).toBe(false)
  })
})

describe('пунктуация: что видит ученик и как сверяется', () => {
  it('числа в подсказке не теряют точку, запятую и двоеточие', () => {
    expect(punctPrompt('This morning the temperature was 38.2.')).toBe('this morning the temperature was 38.2')
    expect(punctPrompt('The ticket cost 4,500 tenge.')).toBe('the ticket cost 4,500 tenge')
    expect(punctPrompt('The train leaves at 14:20.')).toBe('the train leaves at 14:20')
    // Апостроф — часть задания, его по-прежнему убираем.
    expect(punctPrompt("We'll meet at five o'clock.")).toBe('well meet at five oclock')
  })

  it('типографский апостроф и кавычки iPhone = прямые', () => {
    expect(punctMatch('We meet at five o’clock.', "We meet at five o'clock.")).toBe(true)
    expect(punctMatch('Press “Add file” and wait.', "Press 'Add file' and wait.")).toBe(true)
    expect(punctMatch('Press ‘Add file’ and wait.', "Press 'Add file' and wait.")).toBe(true)
  })

  it('пропущенный знак по-прежнему ошибка', () => {
    expect(punctMatch('We meet at five oclock.', "We meet at five o'clock.")).toBe(false)
    expect(punctMatch('We meet at five o’clock', "We meet at five o'clock.")).toBe(false)
  })
})
