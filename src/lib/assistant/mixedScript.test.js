import { describe, it, expect } from 'vitest'
import { fixMixedScript, createScriptFixer } from './mixedScript.js'

describe('латиница посреди кириллического слова', () => {
  it('чинит слова из казахских ответов эталонного набора', () => {
    expect(fixMixedScript('өткенде болып бітken іс')).toBe('өткенде болып біткен іс')
    expect(fixMixedScript('әңгімелestік')).toBe('әңгімелестік')
    expect(fixMixedScript('жүze')).toBe('жүзе')
    expect(fixMixedScript('oған')).toBe('оған')
    expect(fixMixedScript('Oған')).toBe('Оған')
  })

  it('не трогает английские слова, слова через дефис и латинские с кириллическим хвостом', () => {
    const text = 'I agree with you. Speaking Buddy-ге, IELTS-ке, Unit 4-те, Buddyмен, «went» сөзі.'
    expect(fixMixedScript(text)).toBe(text)
    expect(fixMixedScript('Привет, Айгерим! Past Simple — это просто.')).toBe('Привет, Айгерим! Past Simple — это просто.')
  })

  it('русское слово: i — «и», казахское — «і»', () => {
    expect(fixMixedScript('прiвет')).toBe('привет')
    expect(fixMixedScript('бiлесің')).toBe('білесің')
  })

  it('в потоке слово, пришедшее кусками, чинится целиком, текст не теряется', () => {
    const f = createScriptFixer()
    const out = ['Болып біт', 'ken іс. I ', 'am agree', ' — қате.'].map((c) => f.push(c)).join('') + f.flush()
    expect(out).toBe('Болып біткен іс. I am agree — қате.')
  })
})
