import { describe, it, expect } from 'vitest'
import { embedTarget } from './embedTarget.js'

describe('embedTarget', () => {
  it('карточка с уровнем и единицей', () => {
    expect(embedTarget('?embed=practice&card=grammar&level=A2&unit=3'))
      .toEqual({ card: 'grammar', level: 'a2', unit: '3' })
  })

  it('карточка без единиц', () => {
    expect(embedTarget('?embed=practice&card=tenses')).toEqual({ card: 'tenses', level: null, unit: null })
    expect(embedTarget(new URLSearchParams('embed=practice&card=runner'))).toEqual({ card: 'runner', level: null, unit: null })
  })

  it.each([
    '', '?screen=practice&card=grammar', '?embed=other&card=grammar',
    '?embed=practice', '?embed=practice&card=nope', '?embed=practice&card=toString',
    '?embed=practice&card=grammar&unit=a%20b', '?embed=practice&card=grammar&level=a1%26x',
  ])('не встраивание: %s', (search) => {
    expect(embedTarget(search)).toBeNull()
  })
})
