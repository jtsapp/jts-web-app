import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CSS_BASE } from './styles.js'

// Регрессия на «в сказках на телефоне текст видно не полностью и он не
// листается вниз» (видео клиента, Samsung Internet, 29.09.2026).
//
// Мир сказки — полноэкранный #app с position:fixed; inset:0, а плашка
// рассказчика, «tap to continue» и выборы игрока прижаты к его низу. Растянутый
// одним inset:0, fixed-блок в мобильном браузере берёт ВЫСОКИЙ вьюпорт — он
// больше видимой области, пока показана панель браузера. Низ #app уходил под
// нижнюю панель, вместе с ним — последние строки рассказа, а прокрутки у мира
// нет (html,body overflow:hidden). Высоту задаём от видимой области (dvh), как
// у оверлея читалки комиксов (.cr--overlay) и карты «Обучения».
//
// Всплывашка перевода слова (.vpop) — такой же fixed-оверлей с карточкой у
// нижнего края, и её кнопка «в словарь» пряталась под панель тем же образом.
//
// CSS проверяется текстом: предмет проверки — само правило, а jsdom вьюпортов
// не знает. Движок импортировать незачем (2,7 МБ), он читается как файл.

const here = dirname(fileURLToPath(import.meta.url))
const engine = readFileSync(join(here, 'engine.js'), 'utf8')
// Источник, из которого модули режет scripts/extract-fairytale.js, и заодно
// standalone-версия мира. Если фикс останется только в модулях, следующая
// перегенерация тихо его сотрёт.
const source = readFileSync(join(here, '../../../public/practice/fairytales.html'), 'utf8')

/** Тело первого правила `selector{…}` в тексте (движок пишет CSS без пробелов). */
function rule(text, selector) {
  const at = text.indexOf(selector + '{')
  if (at < 0) return null
  return text.slice(at + selector.length + 1, text.indexOf('}', at))
}

describe('мир сказки помещается в видимую область мобильного браузера', () => {
  it('#app высотой в видимый вьюпорт (dvh), а не в высокий', () => {
    expect(rule(CSS_BASE, '#app')).toMatch(/height:100dvh/)
  })

  it('всплывашка перевода слова — тоже', () => {
    expect(rule(engine, '.vpop')).toMatch(/height:100dvh/)
  })

  it('фикс лежит и в источнике fairytales.html', () => {
    expect(rule(source, '#app')).toMatch(/height:100dvh/)
    expect(rule(source, '.vpop')).toMatch(/height:100dvh/)
  })
})

// Та же жалоба вернулась после фикса dvh (видео 02.11.2026). #app был верной
// высоты, но внутри приложения у секций мира свой класс .screen совпал с общим
// `.screen{min-height:100vh}` из styles.css: на телефоне 100vh — высота БЕЗ панелей
// браузера, и #world оказывался на ~95 px выше #app. На standalone-странице этого
// правила нет, поэтому фикс dvh проверку там прошёл, а в приложении не помог.
describe('экраны мира не наследуют min-height приложения', () => {
  it('в модуле и в источнике fairytales.html', () => {
    expect(rule(CSS_BASE, '#app .screen')).toMatch(/min-height:0/)
    expect(rule(source, '#app .screen')).toMatch(/min-height:0/)
  })
})

// Длинная реплика рассказчика — 8 строк на телефоне, плашка на половину экрана
// поверх героя. Теперь видно четыре строки, остальное листается внутри плашки.
describe('текст рассказчика листается внутри плашки', () => {
  // `.narr-text{` есть и в `#narration.cine .narr-text{`, нужно правило с начала строки
  const narrText = (text) => text.match(/\n\.narr-text\{([^}]*)\}/)?.[1]

  it.each([
    ['модуль', CSS_BASE],
    ['fairytales.html', source],
  ])('%s: высота ограничена, прокрутка пальцем разрешена', (_, text) => {
    const body = narrText(text)
    expect(body).toMatch(/max-height:6em/)
    expect(body).toMatch(/overflow-y:auto/)
    expect(body).toMatch(/touch-action:pan-y/)
  })

  it.each([
    ['engine.js', engine],
    ['fairytales.html', source],
  ])('%s: весь текст плашки идёт через narrRender — иначе новая реплика откроется с середины', (_, text) => {
    expect(text).toMatch(/function narrRender\(obj\)/)
    expect(text).not.toMatch(/vwRender\(\$\("#narrText"\),/)
  })
})

// Кнопка 💬 («поговорить с героем») висит над низом экрана на 70px — ровно
// над последними строками рассказа — и слоем выше плашки, поэтому на узком
// телефоне закрывала слово-два текста. Пока рассказчик говорит, разговаривать
// не с кем: кнопку прячем, в диалогах и в мире она возвращается. Прячем
// прозрачностью, а не классом .hidden — им движок сам включает кнопку при
// входе в мир, и снимать его обратно было бы некому.
describe('кнопка 💬 не закрывает текст рассказчика', () => {
  const hidden = /opacity:0;pointer-events:none/

  it('скрыта, пока показана плашка рассказа', () => {
    expect(rule(CSS_BASE, '#narration.show~.talkbtn')).toMatch(hidden)
  })

  it('и в источнике fairytales.html', () => {
    expect(rule(source, '#narration.show~.talkbtn')).toMatch(hidden)
  })
})
