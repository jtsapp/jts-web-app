import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BODY_CENTER, poseStyle } from './buddyPose.js'
import { EMOTIONS } from './avatarEmotions.js'

describe('buddyPose', () => {
  it('центр тела есть у каждой эмоции и лежит у центра холста', () => {
    expect(Object.keys(BODY_CENTER).sort()).toEqual(Object.keys(EMOTIONS).sort())
    for (const [key, [x, y]] of Object.entries(BODY_CENTER)) {
      expect(Math.abs(x - 50), key).toBeLessThan(5)
      expect(Math.abs(y - 50), key).toBeLessThan(5)
    }
  })

  it('набор в позе своей же эмоции стоит на месте', () => {
    expect(poseStyle('talking', 'talking')).toEqual({
      transformOrigin: '46.69% 50.46%',
      transform: 'translate(0%, 0%) rotate(0deg)',
    })
  })

  it('поза — разница центров и наклонов вокруг центра своего тела', () => {
    // talking: центр 46.69/50.46, наклон 9.2°; happy: 50.01/50.04, −18°.
    expect(poseStyle('happy', 'talking')).toEqual({
      transformOrigin: '50.01% 50.04%',
      transform: 'translate(-3.32%, 0.42%) rotate(27.2deg)',
    })
  })

  it('точные центры совпадают с точками опоры петель в tutor.css', () => {
    const css = readFileSync(join(process.cwd(), 'src/tutor.css'), 'utf8')
    for (const key of ['talking', 'happy', 'thinking', 'gloat']) {
      const m = css.match(new RegExp(`t-face--${key} \\.t-face__body \\{\\s*transform-origin: ([\\d.]+)% ([\\d.]+)%`))
      expect(m, key).not.toBeNull()
      expect(BODY_CENTER[key], key).toEqual([Number(m[1]), Number(m[2])])
    }
  })
})
