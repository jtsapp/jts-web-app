import { describe, it, expect } from 'vitest'
import { EMOTIONS, SERVICE_EMOTIONS, LERP_KEYS, FX_KEYS, moodToEmotion } from './avatarEmotions.js'

describe('avatarEmotions', () => {
  it('красит тело одним и тем же фиолетовым во всех пресетах', () => {
    const presets = Object.values(EMOTIONS)
    const [first, ...rest] = presets
    for (const preset of rest) {
      expect(preset.c1).toEqual(first.c1)
      expect(preset.c2).toEqual(first.c2)
    }
  })

  it('заводит talking как сервисную эмоцию', () => {
    expect(EMOTIONS.talking).toBeDefined()
    expect(EMOTIONS.talking.chatDots).toBe(1)
    expect(SERVICE_EMOTIONS).toContain('talking')
  })

  it('у каждого пресета есть непустой label', () => {
    for (const [key, preset] of Object.entries(EMOTIONS)) {
      expect(preset.label, `${key} без label`).toBeTruthy()
    }
  })

  it('не использует в пресетах ключи вне словаря движка', () => {
    const allowed = new Set([...LERP_KEYS, ...FX_KEYS, 'label', 'c1', 'c2', 'mouth', 'pop'])
    for (const [key, preset] of Object.entries(EMOTIONS)) {
      for (const field of Object.keys(preset)) {
        expect(allowed.has(field), `${key}.${field} — неизвестный ключ движка`).toBe(true)
      }
    }
  })

  it('старый контракт moodToEmotion не сломан', () => {
    expect(moodToEmotion('joy', 1)).toBe('happy')
    expect(moodToEmotion('joy', 3)).toBe('celebrate')
    expect(moodToEmotion('anger', 1)).toBe('angry')
    expect(moodToEmotion('anger', 3)).toBe('rage')
    expect(moodToEmotion('sadness', 1)).toBe('sympathy')
    expect(moodToEmotion('gloat', 1)).toBe('gloat')
    expect(moodToEmotion('unknown-mood', 1)).toBe(null)
  })

  it('star заведён в LERP_KEYS, ring убран из FX_KEYS', () => {
    expect(LERP_KEYS).toContain('star')
    expect(FX_KEYS).not.toContain('ring')
    expect(FX_KEYS).toEqual(
      expect.arrayContaining(['question', 'chatDots', 'soundwave', 'exclaim'])
    )
  })
})
