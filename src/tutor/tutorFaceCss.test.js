import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FIRST_FRAME } from './buddyPose.js'
import { EMOTIONS } from './avatarEmotions.js'

const css = readFileSync(join(process.cwd(), 'src/tutor.css'), 'utf8').replace(/\r\n/g, '\n')

// Первый кадр движения тела эмоции: transform из 0% keyframes анимации, что
// висит на её .t-face__rig и .t-face__body.
function firstFrames(key) {
  const out = {}
  for (const part of ['rig', 'body']) {
    const rule = css.match(new RegExp(`:is\\(\\.is-on, \\.is-leaving\\)\\.t-face--${key} \\.t-face__${part} \\{([^}]*)\\}`))
    const name = rule?.[1].match(/animation:\s*([\w-]+)/)?.[1]
    if (!name) continue
    const frame = css.match(new RegExp(`@keyframes ${name} \\{\\s*0%[^{]*\\{([^}]*)\\}`))
    out[part] = frame[1].match(/transform:\s*([^;]+);/)[1].trim()
  }
  return out
}
const IDENTITY = /^(translate[XY]?\(0(%|px)?(, 0(%|px)?)?\)|scale\(1(, 1)?\)|rotate\(0(deg)?\)|\s)*$/
const turnOf = (t) => Number(t.match(/rotate\((-?[\d.]+)deg\)/)?.[1] ?? 0)

describe('tutor.css — лицо тьютора', () => {
  it('движения лица висят и на уходящем наборе, а не только на видимом', () => {
    // Новое движение только на .is-on — и при плавной смене уходящее лицо
    // снова вставало бы рывком в покой, пока гаснет.
    expect(css).not.toMatch(/\.is-on\.t-face--/)
    expect(css.match(/:is\(\.is-on, \.is-leaving\)\.t-face--/g).length).toBeGreaterThan(50)
  })

  it('плавная смена: поза едет у всех наборов одной кривой, новый — поверх', () => {
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack \{[^}]*transform var\(--face-swap\) ease-in-out/)
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack\.is-on \{[^}]*z-index: 1;[^}]*transform var\(--face-swap\) ease-in-out/)
  })

  it('новое лицо на время смены — неподвижный кадр', () => {
    // Иначе прыжок «Радуется» уводил бы тело из-под общей позы, пока старое
    // ещё видно, — второй контур.
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack\.is-entering \* \{\s*animation-play-state: paused;/)
  })

  it('новое проявляется, когда старое уже успокоилось', () => {
    // Задержка проявления (25 % смены = 150 мс) не меньше почти всего
    // успокоения тела уходящего (SETTLE_MS = 200 мс, ease-out).
    expect(css).toMatch(/\.t-face\.is-morph \.t-face__stack\.is-on \{[^}]*opacity calc\(var\(--face-swap\) \* 0\.4\) ease-out calc\(var\(--face-swap\) \* 0\.25\)/)
  })

  it('первый кадр движения тела — покой карточки, а где нет — учтён в позе', () => {
    // На смене новое лицо стоит на паузе в первом кадре, а общая поза совмещает
    // тела именно там. Петля, которая начинается не с покоя и не записана в
    // FIRST_FRAME, снова нарисует второй контур (так было у «Счастлив»).
    for (const key of Object.keys(EMOTIONS)) {
      for (const [part, t] of Object.entries(firstFrames(key))) {
        if (IDENTITY.test(t)) continue
        expect(FIRST_FRAME[key], `${key} ${part}: ${t}`).toEqual({ part, turn: turnOf(t) })
        // Сдвиг и масштаб в первом кадре поза не учитывает — только поворот.
        expect(t.replace(/rotate\(-?[\d.]+deg\)/, ''), `${key} ${part}: ${t}`).toMatch(IDENTITY)
      }
    }
    for (const [key, { part }] of Object.entries(FIRST_FRAME)) {
      expect(firstFrames(key)[part], `${key}: лишняя запись`).toBeDefined()
    }
    // Покачивание rig идёт вокруг низа тела — эту точку и берёт restPose.
    expect(css).toMatch(/\.t-face__rig \{[^}]*transform-origin: 50% 67%;/)
  })

  it('слои лица не вылезают над соседями страницы', () => {
    // z-index нового набора иначе поднимал бы свечение лица над кнопкой
    // «Начать разговор».
    expect(css).toMatch(/\.t-face\.is-morph \{[^}]*isolation: isolate;/)
  })

  it('при «уменьшить движение» переходы гасятся и в плавном режиме', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*?\.t-face__stack \{[^}]*transition: none !important;/)
  })
})
