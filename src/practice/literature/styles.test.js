import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LITERATURE_CSS } from './styles.js'
import { LITERATURE_DARK_CSS } from './styles.dark.js'
import proto from '../../../scripts/literature/proto.js'
import extract from '../../../scripts/literature/extract-styles.js'

// Стили раздела живут в тени и ширину считают по своему хосту: раздел — колонка рядом с сайдбаром, а не окно.
describe('LITERATURE_CSS', () => {
  it('ровно то, что собирает extract-styles.js из фикстуры (руками не правят)', () => {
    const html = proto.readHtml(path.join(__dirname, '__fixtures__', 'prototype-mini.html'))
    expect(LITERATURE_CSS).toBe(extract.extractStyles(html))
    expect(fs.readFileSync(path.join(__dirname, 'styles.js'), 'utf8')).toContain('СГЕНЕРИРОВАН')
  })

  it('без :root, html, body и main — тень их не видит; тема мира — data-lw-theme, а не data-theme хоста', () => {
    expect(LITERATURE_CSS).not.toMatch(/:root\b/)
    expect(LITERATURE_CSS).not.toMatch(/(^|[}\s,])(html|body|main)\s*[{.[:]/)
    expect(LITERATURE_CSS).toMatch(/:host\{/)
    expect(LITERATURE_CSS).not.toContain('data-theme=')
    expect(LITERATURE_CSS).toContain('[data-lw-theme=gothic]')
    expect(LITERATURE_CSS).toContain('.lw{')
  })

  it('шрифты — сайта и системный serif: Google Fonts (Onest, Cormorant, EB Garamond, Newsreader) не грузятся', () => {
    expect(LITERATURE_CSS).not.toMatch(/@font-face|@import|Onest|PT Root|SF Pro|Cormorant|EB Garamond|Newsreader/)
    expect(LITERATURE_CSS).toContain('--ui:var(--lit-font,inherit);')
    expect(LITERATURE_CSS).toContain('--text:var(--lit-font,inherit);')
    expect(LITERATURE_CSS).toContain("--lit:Georgia,'Times New Roman',serif;")
    expect(LITERATURE_CSS).toContain(".lw[lang=\"kk\"]{--ui:'Inter'")
  })

  it('ширина — по контейнеру-хосту; подсказка к слову ставится от корня раздела', () => {
    expect(LITERATURE_CSS).toContain(':host{display:block;container:lw/inline-size}')
    expect(LITERATURE_CSS).not.toMatch(/@media \((max|min)-width/)
    expect(LITERATURE_CSS).toMatch(/@container lw \(min-width:721px\) and \(max-width:1100px\)/)
    expect(LITERATURE_CSS).not.toMatch(/\d(vw)\b/)
    expect(LITERATURE_CSS).toContain('.lw{position:relative;')
  })

  it('тёмная тема — отдельным слоем по атрибуту хоста; сцены с маскотами остаются в палитре прототипа', () => {
    expect(LITERATURE_DARK_CSS).toMatch(/:host\(\[data-theme="dark"\]\)/)
    expect(LITERATURE_DARK_CSS).toContain('.lw-entry')
  })
})
