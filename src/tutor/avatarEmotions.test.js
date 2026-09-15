import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { EMOTIONS, moodToEmotion } from './avatarEmotions.js'
import { BUDDY_RIG } from './buddyRig.js'
import { TUTORS } from './tutors.js'

describe('avatarEmotions', () => {
  it('у каждой эмоции есть подпись и набор слоёв с телом, файлы лежат в public', () => {
    for (const [key, { label }] of Object.entries(EMOTIONS)) {
      expect(label, `${key} без label`).toBeTruthy()
      const rig = BUDDY_RIG[key]
      expect(rig, `${key}: нет слоёв`).toBeDefined()
      expect(rig.layers[0].part, `${key}: первым слоем должно идти тело`).toBe('base')
      for (const { src } of rig.layers) {
        expect(existsSync(join(process.cwd(), 'public', src)), `${key}: нет файла ${src}`).toBe(true)
      }
    }
  })

  it('все 13 карточек макета заведены, включая «Говорит»', () => {
    expect(Object.keys(EMOTIONS)).toHaveLength(13)
    expect(EMOTIONS.talking.label).toBe('Говорит')
  })

  it('каждое имя от агента сводится к существующей картинке', () => {
    const names = ['anger', 'rage', 'disgust', 'joy', 'sadness', 'gloat', 'praise', 'encourage',
      'correcting', 'surprised', 'curious', 'confused', 'celebrate']
    for (const name of names) {
      for (const level of [1, 2, 3]) {
        const key = moodToEmotion(name, level)
        expect(EMOTIONS[key], `${name}@${level} → ${key}`).toBeDefined()
      }
    }
  })

  it('сила 3 поднимает только радость и злость, а не сведённые к ним имена', () => {
    expect(moodToEmotion('joy', 2)).toBe('happy')
    expect(moodToEmotion('joy', 3)).toBe('celebrate')
    expect(moodToEmotion('anger', 2)).toBe('angry')
    expect(moodToEmotion('anger', 3)).toBe('rage')
    expect(moodToEmotion('praise', 3)).toBe('happy')
    expect(moodToEmotion('disgust', 3)).toBe('angry')
  })

  it('незнакомое имя не проходит, в том числе ключи прототипа', () => {
    expect(moodToEmotion('unknown-mood', 1)).toBe(null)
    expect(moodToEmotion('constructor', 1)).toBe(null)
    expect(moodToEmotion(undefined, 1)).toBe(null)
  })

  it('лицо каждого тьютора в покое есть среди карточек', () => {
    for (const tutor of TUTORS) {
      if (tutor.face === 'orb') continue
      expect(EMOTIONS[tutor.mood], `${tutor.key}: mood ${tutor.mood}`).toBeDefined()
    }
  })
})
