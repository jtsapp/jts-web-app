// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { canOpenSeen, markSeen, readSeen } from './overlaySeen.js'

beforeEach(() => localStorage.clear())

describe('overlaySeen', () => {
  it('без потолка — всегда можно', () => {
    expect(canOpenSeen('tales', 'a', null)).toBe(true)
  })

  it('лимит 0 закрывает раздел', () => {
    expect(canOpenSeen('tales', 'a', 0)).toBe(false)
  })

  it('считает разные единицы, повтор не тратит', () => {
    expect(canOpenSeen('tales', 'a', 1)).toBe(true)
    markSeen('tales', 'a')
    markSeen('tales', 'a')
    expect(readSeen('tales')).toEqual(['a'])
    expect(canOpenSeen('tales', 'a', 1)).toBe(true)
    expect(canOpenSeen('tales', 'b', 1)).toBe(false)
  })

  it('сказки и мемы считаются раздельно', () => {
    markSeen('tales', 'a')
    expect(canOpenSeen('memes', 'x', 1)).toBe(true)
  })

  it('битое хранилище не роняет', () => {
    localStorage.setItem('jts_tales_seen', '{oops')
    expect(readSeen('tales')).toEqual([])
    localStorage.setItem('jts_tales_seen', '{"a":1}')
    expect(readSeen('tales')).toEqual([])
  })
})
