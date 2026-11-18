import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Строка фразы на телефоне 320 px (колонка 288 px): слово из 10+ ячеек шире колонки. Сторож свойств, как
// textCollapse.test.js: группа ячеек переносится, слово не шире строки, и без overflow-wrap: anywhere.
const css = readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), '../../video-dictation.css'), 'utf8')

describe('video-dictation.css: строка фразы помещается в колонку', () => {
  it('.vd-wg не шире строки и может сжиматься', () => {
    expect(css).toMatch(/\.vd-wg\s*\{[^}]*max-width:\s*100%[^}]*min-width:\s*0/)
  })

  it('группа ячеек в слове переносит ячейки и не шире слова', () => {
    expect(css).toMatch(/\.vd-wg \.jl-grp\s*\{[^}]*flex-wrap:\s*wrap[^}]*max-width:\s*100%/)
  })

  it('overflow-wrap: anywhere не используется', () => {
    expect(css).not.toMatch(/overflow-wrap:\s*anywhere/)
  })
})
