import { describe, it, expect } from 'vitest'
import { WAKE_GRAMMAR, matchWake } from './matchWake.js'

describe('позывной', () => {
  it('обе фразы — да, в любом регистре, с ё/ә и знаками', () => {
    expect(matchWake('привет луна')).toBe(true)
    expect(matchWake('Привет, Луна!')).toBe(true)
    expect(matchWake('салем луна')).toBe(true)
    expect(matchWake('Сәлем, Луна')).toBe(true)
  })

  it('с [unk] до или после — да: ученик сказал рядом что-то ещё', () => {
    expect(matchWake('[unk] привет луна')).toBe(true)
    expect(matchWake('привет луна [unk]')).toBe(true)
  })

  it('просто «Луна», сказанное отдельно, — да; и повтор имени', () => {
    expect(matchWake('луна')).toBe(true)
    expect(matchWake('Луна!')).toBe(true)
    expect(matchWake('  луна  ')).toBe(true)
    expect(matchWake('луна луна')).toBe(true)
  })

  it('имя внутри чужой реплики — нет: так грамматика слышит «на луну», «она сказала»', () => {
    expect(matchWake('[unk] луна')).toBe(false)
    expect(matchWake('луна [unk]')).toBe(false)
    expect(matchWake('[unk] луна [unk]')).toBe(false)
  })

  it('«привет» без имени, разорванная фраза, склейка, пусто — нет', () => {
    expect(matchWake('привет')).toBe(false)
    expect(matchWake('салем')).toBe(false)
    expect(matchWake('привет [unk] луна')).toBe(false)
    expect(matchWake('приветлуна')).toBe(false)
    expect(matchWake('[unk]')).toBe(false)
    expect(matchWake('')).toBe(false)
    expect(matchWake(null)).toBe(false)
  })

  it('грамматика распознавателя — две фразы, имя и [unk]', () => {
    expect(WAKE_GRAMMAR).toEqual(['привет луна', 'салем луна', 'луна', '[unk]'])
  })
})
