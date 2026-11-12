import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * «Мемы и рилсы»: ролик вписывается в кадр целиком, а не обрезается.
 * Мемы почти всегда шире 9:16 (подпись сверху, видео 4:5 или 1:1), и с
 * object-fit: cover кадр срезал им бока — подпись читалась с середины слова
 * («t feeling after…», жалоба 12.11.2026). На телефоне кадр во весь экран
 * (~0.46), там cover резал и честные 9:16. Правило — только contain.
 */
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function videoRules(file) {
  const css = fs.readFileSync(path.join(SRC, file), 'utf8')
  return [...css.matchAll(/([^{}]*\.rl__video[^{}]*)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2],
  }))
}

describe('рилсы: ролик не обрезается кадром', () => {
  it('основное правило .rl__video — object-fit: contain', () => {
    const rules = videoRules('styles.css').filter((r) => /object-fit/.test(r.body))
    expect(rules.length).toBeGreaterThan(0)
    for (const r of rules) expect(r.body, r.selector).toMatch(/object-fit:\s*contain/)
  })

  it('мобильный слой не возвращает cover', () => {
    for (const file of ['mobile/practice.css', 'theme-dark.generated.css']) {
      for (const r of videoRules(file)) {
        expect(r.body, `${file} | ${r.selector}`).not.toMatch(/object-fit:\s*cover/)
      }
    }
  })
})
