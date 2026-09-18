import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BODY_CENTER, SETTLE_MS, poseStyle, settleMotion } from './buddyPose.js'
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

describe('settleMotion', () => {
  afterEach(() => vi.unstubAllGlobals())

  // Набор-заглушка: тело (rig и body) — элементы с WAAPI-методом animate.
  const fakeStack = (transforms) => {
    const els = Object.fromEntries(
      Object.keys(transforms).map((sel) => [sel, { animate: vi.fn(() => `anim${sel}`) }])
    )
    vi.stubGlobal('getComputedStyle', (el) => ({
      transform: transforms[Object.keys(els).find((sel) => els[sel] === el)],
    }))
    return { els, stack: { querySelector: (sel) => els[sel] ?? null } }
  }

  it('ведёт тело уходящего от текущего положения к покою', () => {
    const { els, stack } = fakeStack({ '.t-face__rig': 'matrix(1, 0, 0, 1, 0, -12)', '.t-face__body': 'none' })
    expect(settleMotion(stack)).toEqual(['anim.t-face__rig'])
    expect(els['.t-face__rig'].animate).toHaveBeenCalledWith(
      [{ transform: 'matrix(1, 0, 0, 1, 0, -12)' }, { transform: 'none' }],
      { duration: SETTLE_MS, easing: 'ease-out', fill: 'forwards' }
    )
    // Тело уже в покое — анимировать нечего.
    expect(els['.t-face__body'].animate).not.toHaveBeenCalled()
  })

  it('без WAAPI и без набора — ничего не делает', () => {
    expect(settleMotion(null)).toEqual([])
    const stack = { querySelector: () => ({}) }
    vi.stubGlobal('getComputedStyle', () => ({ transform: 'matrix(1, 0, 0, 1, 0, -12)' }))
    expect(settleMotion(stack)).toEqual([])
  })
})
