import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Ниже 1420px правая колонка урока раскладывается в ряд, и каждому блоку раздаётся
// flex: 1 1 320px (lessonWorkspace.css). Правило звонка сильнее по специфичности: без
// медиазапроса оно отнимало у карточки ширину — индивидуальный звонок сжимался до кнопок,
// а групповой вылезал за колонку, и плитки наезжали друг на друга.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../lessonVideo.css'), 'utf8')

describe('lessonVideo.css — звонок в правой колонке', () => {
  it('не фиксирует размер карточки там, где колонка раскладывается в ряд', () => {
    const rules = css.match(/\.lw-live-aside > \.lw-video\s*\{/g) ?? []
    expect(rules).toHaveLength(1)
    expect(css).toMatch(/@media \(min-width: 1421px\) \{\s*\.lw-live-aside > \.lw-video\s*\{\s*flex: none;/)
  })

  // Под потолком высоты сетка сжимала строки ниже плитки (overflow: hidden обнуляет её минимум),
  // и при 8+ участниках плитки наезжали друг на друга вместо прокрутки.
  it('строки сетки не ниже плитки', () => {
    const grid = css.match(/\.lw-video--grid \.lw-video__tiles\s*\{[^}]*\}/)?.[0] ?? ''
    expect(grid).toContain('grid-auto-rows: max-content')
  })
})
