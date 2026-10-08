// @vitest-environment jsdom
// Ревью 08.10.2026: омограф «live» всегда подменялся на «liv» (глагол /lɪv/),
// а в B1 L5 карточка — прилагательное «в прямом эфире» /laɪv/: в диктанте, на
// карточке и в разборе оно звучало как глагол. Подмена теперь сверяется с IPA
// карточки, если оно есть.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn(() => true) }))

import { playTts } from '../../lib/speech.js'
import { speak } from './audio.js'

const said = () => playTts.mock.calls.at(-1)[0]

describe('speak — омографы по IPA карточки', () => {
  beforeEach(() => playTts.mockClear())

  it('live-глагол /lɪv/ — «liv», как и раньше', () => {
    speak('live', { ipa: 'lɪv' })
    expect(said()).toBe('liv')
  })

  it('live-прилагательное /laɪv/ — без подмены', () => {
    speak('live', { ipa: 'laɪv' })
    expect(said()).toBe('live')
  })

  it('без IPA — прежняя подмена', () => {
    speak('live')
    expect(said()).toBe('liv')
  })

  it('read в прошедшем /red/ — без подмены на «reed»', () => {
    speak('read', { ipa: 'red' })
    expect(said()).toBe('read')
    speak('read', { ipa: 'riːd' })
    expect(said()).toBe('reed')
  })
})
