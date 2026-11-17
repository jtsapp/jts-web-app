import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Сообщение рамки урока рисуется прямо на странице, а её фон тёмный в обеих темах: без своей подложки и своего цвета
// текста оно тёмное по тёмному (поймано на деве 16.11.2026). jsdom каскад не считает, поэтому сверяются сами правила.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'embed.css'), 'utf8')

function rule(selector) {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('embed.css — сообщение рамки урока', () => {
  it('у сообщения своя подложка и свой цвет текста', () => {
    const notice = rule('\n.learning-embed--notice')
    expect(notice).toMatch(/background:\s*#ffffff/)
    expect(notice).toMatch(/color:\s*#171326/)
  })

  it('в тёмной теме — фон страницы и светлый текст темы', () => {
    const dark = rule('html[data-theme="dark"] .learning-embed--notice')
    expect(dark).toMatch(/background:\s*var\(--page-bg\)/)
    expect(dark).toMatch(/color:\s*var\(--ink\)/)
  })

  it('ссылка наследует цвет текста и подчёркнута: видна в обеих темах', () => {
    const link = rule('\n.learning-embed--notice a')
    expect(link).toMatch(/color:\s*inherit/)
    expect(link).toMatch(/text-decoration:\s*underline/)
  })
})
