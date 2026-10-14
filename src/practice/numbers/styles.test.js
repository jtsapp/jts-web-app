import { describe, expect, it } from 'vitest'
import { NUMBERS_CSS } from './styles.js'

// Игра на шрифте сайта: гарнитуру корень .nw берёт у хоста тени. Своя
// гарнитура в CSS (так было в прототипе: Baloo 2, Nunito, Literata, Golos Text)
// молча вернула бы игру на чужой шрифт, а файлов этих шрифтов в public/ уже нет.
describe('NUMBERS_CSS: шрифт сайта', () => {
  it('гарнитуры только inherit — кроме казахского и цифрового табло', () => {
    const own = [...NUMBERS_CSS.matchAll(/(?<![-\w])font(?:-family)?\s*:\s*([^;}]+)/g)]
      .map((m) => m[1].trim())
      .filter((v) => v !== 'inherit' && /['",]|var\(/.test(v))
    expect(own).toEqual([
      // .o.digi — табло часов, моноширинный — это стиль, а не язык.
      "'Courier New',ui-monospace,monospace",
      // .nw [lang="kk"] — казахский текст на Inter, как во всём приложении.
      "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    ])
  })

  it('корень .nw наследует шрифт страницы', () => {
    expect(NUMBERS_CSS).toMatch(/\.nw\{display:block;font-family:inherit;/)
  })
})
