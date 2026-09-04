import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Проверки по тексту CSS, как в tablet.design.test.js и lessonWorkspace.design.test.js:
// предмет проверки — сами правила, а не то, как их посчитает jsdom (он внешние
// стили не применяет вовсе).
//
// Переносы приводим к одному виду: рабочая копия на Windows лежит с CRLF, и
// многострочные куски иначе не находятся.
const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'demo.css'), 'utf8').split('\r\n').join('\n')

/** Тело правила `selector { … }`. */
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = css.match(new RegExp(`(^|[,{}\\s])${escaped}\\s*(,[^{]*)?\\{([^}]*)\\}`, 'm'))
  return m ? m[3] : null
}

describe('демо-экраны: раскладка', () => {

  it('«Главная» центрируется, а не жмётся к левому краю', () => {
    // Ширина у колонки была и раньше, а margin auto забыли — и на мониторе
    // шире неё всё свободное место копилось одной полосой справа.
    const hm = rule('.hm')
    expect(hm).toBeTruthy()
    expect(hm).toMatch(/max-width:\s*\d+px/)
    expect(hm).toMatch(/margin-inline:\s*auto|margin:\s*0 auto/)
  })

  it('заголовок и текст карточки пробного урока стоят колонкой', () => {
    // Оба лежат в обёртке ради aria-live. Прямыми детьми .hm-trial они были
    // флекс-элементами и вставали друг под другом сами; внутри обычного div
    // <b> и <span> снова строчные — и слипаются в одну строку.
    const body = rule('.hm-trial__body')
    expect(body).toBeTruthy()
    expect(body).toMatch(/display:\s*flex/)
    expect(body).toMatch(/flex-direction:\s*column/)
  })

  it('у ярлыков скидки есть запас под наклон', () => {
    // transform не занимает места в потоке: без запаса паддинг карточки
    // срезает углы повёрнутых ярлыков.
    const prices = rule('.dm-offer__prices')
    expect(prices).toBeTruthy()
    expect(prices).toMatch(/padding:/)
    expect(rule('.dm-offer__was')).toMatch(/transform:\s*rotate/)
    expect(rule('.dm-offer__now')).toMatch(/transform:\s*rotate/)
  })
})
