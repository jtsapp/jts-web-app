import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { UI_GLOSS, buildGloss, glossLookup, wordByWord } from './gloss.js'

// Тест идёт по живым данным уровня: словарь обязан собираться из того же
// JSON, который грузит тренажёр, — иначе порт «работает» только на фикстурах.
const a1 = JSON.parse(readFileSync(
  fileURLToPath(new URL('../../../public/practice/writing/a1.json', import.meta.url)), 'utf8'
))

describe('buildGloss', () => {
  const gloss = buildGloss(a1)

  it('находит слово сида: form → анкета / сауалнама', () => {
    expect(gloss['form']).toEqual({ ru: 'анкета', kk: 'сауалнама', src: 'word' })
  })

  it('фраза банка хранится без хвостового многоточия', () => {
    // в JSON фраза лежит как "My name is …" — ключ нормализован
    expect(gloss['my name is']).toBeTruthy()
    expect(gloss['my name is'].src).toBe('phrase')
  })

  it('UI-строки кладутся первыми и выигрывают у данных уровня', () => {
    expect(gloss['check']).toEqual({ ru: UI_GLOSS['check'][0], kk: UI_GLOSS['check'][1], src: 'ui' })
  })
})

describe('glossLookup', () => {
  const gloss = buildGloss(a1)

  it('точный ключ и регистр', () => {
    expect(glossLookup(gloss, 'Form').ru).toBe('анкета')
  })

  it('фраза с хвостовым многоточием находится', () => {
    expect(glossLookup(gloss, 'My name is …')).toBeTruthy()
    expect(glossLookup(gloss, 'my name is')).toBeTruthy()
  })

  it('пунктуация по краям срезается вторым заходом', () => {
    expect(glossLookup(gloss, '"form,"').ru).toBe('анкета')
  })

  it('грубое единственное число: forms → form', () => {
    expect(glossLookup(gloss, 'forms').ru).toBe('анкета')
  })

  it('незнакомое слово → null', () => {
    expect(glossLookup(gloss, 'zzzqqq')).toBeNull()
  })
})

describe('wordByWord', () => {
  const gloss = buildGloss(a1)

  it('переводит по словам, незнакомые оставляет как есть', () => {
    const res = wordByWord(gloss, 'form zzz surname')
    expect(res.ru).toBe('анкета zzz фамилия')
    expect(res.kk).toBe('сауалнама zzz тегі')
    expect(res.src).toBe('gloss')
  })

  it('пробельные прогоны схлопываются в один пробел — как в прототипе', () => {
    expect(wordByWord(gloss, 'form\n\nsurname').ru).toBe('анкета фамилия')
  })

  it('без единого попадания возвращает null', () => {
    expect(wordByWord(gloss, 'zzz qqq www')).toBeNull()
  })
})
