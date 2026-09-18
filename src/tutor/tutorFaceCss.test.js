import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/tutor.css'), 'utf8')

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

  it('при «уменьшить движение» переходы гасятся и в плавном режиме', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*?\.t-face__stack \{[^}]*transition: none !important;/)
  })
})
