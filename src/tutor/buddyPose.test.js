import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BODY_CENTER, FIRST_FRAME, SETTLE_MS, poseStyle, restPose, rewindMotion, settleMotion } from './buddyPose.js'
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
    // talking: центр 46.69/50.46, наклон 9.2°; idle: 50.03/50.05, −15°.
    expect(poseStyle('idle', 'talking')).toEqual({
      transformOrigin: '50.03% 50.05%',
      transform: 'translate(-3.34%, 0.41%) rotate(24.2deg)',
    })
  })

  it('тела совмещаются в первом кадре движения, а не в покое карточки', () => {
    // Петля «Счастлив» начинается с кадра на 12° левее карточки (−18° → −6°),
    // вокруг центра тела — центр на месте.
    expect(restPose('happy')).toEqual({ center: [50.01, 50.04], tilt: -6 })
    expect(poseStyle('happy', 'talking').transform).toBe('translate(-3.32%, 0.42%) rotate(15.2deg)')
    // Покачивание «Думает» начинается с −1.5° вокруг низа тела (50% 67%):
    // центр тела уезжает на доли процента.
    const { center: [x, y], tilt } = restPose('thinking')
    expect(tilt).toBeCloseTo(-7.5, 5)
    expect(x).toBeCloseTo(46.312, 2)
    expect(y).toBeCloseTo(52.34, 2)
    // У остальных первый кадр — покой карточки.
    expect(restPose('talking')).toEqual({ center: BODY_CENTER.talking, tilt: 9.2 })
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

  it('ведёт тело уходящего от текущего положения к первому кадру его движения', () => {
    const { els, stack } = fakeStack({ '.t-face__rig': 'matrix(1, 0, 0, 1, 0, -12)', '.t-face__body': 'none' })
    // Первый кадр берётся у самой CSS-анимации: в нём новое лицо стоит на паузе.
    els['.t-face__rig'].getAnimations = () => [
      { animationName: 'buddy-ponder', effect: { getKeyframes: () => [{ transform: 'rotate(-1.5deg)' }] } },
    ]
    expect(settleMotion(stack)).toEqual(['anim.t-face__rig'])
    expect(els['.t-face__rig'].animate).toHaveBeenCalledWith(
      [{ transform: 'matrix(1, 0, 0, 1, 0, -12)' }, { transform: 'rotate(-1.5deg)' }],
      { duration: SETTLE_MS, easing: 'ease-out', fill: 'forwards' }
    )
    // Без движения и в покое — анимировать нечего.
    expect(els['.t-face__body'].animate).not.toHaveBeenCalled()
  })

  it('без своей анимации тело идёт в покой', () => {
    const { els, stack } = fakeStack({ '.t-face__rig': 'matrix(1, 0, 0, 1, 0, -12)' })
    settleMotion(stack)
    expect(els['.t-face__rig'].animate.mock.calls[0][0][1]).toEqual({ transform: 'none' })
  })

  it('без WAAPI и без набора — ничего не делает', () => {
    expect(settleMotion(null)).toEqual([])
    const stack = { querySelector: () => ({}) }
    vi.stubGlobal('getComputedStyle', () => ({ transform: 'matrix(1, 0, 0, 1, 0, -12)' }))
    expect(settleMotion(stack)).toEqual([])
  })
})

describe('rewindMotion', () => {
  it('ставит CSS-движения набора в начало, переходы не трогает', () => {
    const move = { animationName: 'buddy-hop', currentTime: 700 }
    const fade = { transitionProperty: 'opacity', currentTime: 120 }
    rewindMotion({ getAnimations: () => [move, fade] })
    expect(move.currentTime).toBe(0)
    expect(fade.currentTime).toBe(120)
  })

  it('без набора и без WAAPI — ничего не делает', () => {
    expect(() => rewindMotion(null)).not.toThrow()
    expect(() => rewindMotion({})).not.toThrow()
  })
})
