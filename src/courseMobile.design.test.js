import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Мобильный урок против макета «JTS Адаптивка» → секция «Обучение» (кадры
// 440×956). Числа взяты не на глаз: они сняты из узлов Figma через REST API,
// поэтому и проверяются как числа.
//
//   HUD            4108:2694 — полоса 408×38 r50, трек #ebdeff, заливка #9047ff
//   карточки       4107:44220 — 128×96 r20, подпись 18/700, выбранная — рамка 2 #9047ff
//   True/False     4108:3489 — строки 408×72 r20, зазор 5, текст 20/400, пара кнопок 138×43
//   варианты       4108:1762 — пилюля 59 r999, 16/700; верный #31b423, неверный #ff4646
//   кнопка         4108:2694 — 408×48 r80 #9047ff, «Проверить» #b7f0ff
//
// Экран уже разъезжался с макетом молча (подписи карточек резали до 16, строки
// True/False разносили на 12), и заметить это можно было только вручную открыв
// оба рядом.

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'course.css'), 'utf8')

/** Мобильный блок, который идёт в файле последним и перекрывает остальные. */
const mobile = css.slice(css.lastIndexOf('═══════════ Мобильный урок по макету'))

/** Тело правила внутри переданного куска CSS. */
function rule(chunk, selector) {
  // Селектор экранируем целиком: у него бывают скобки (:not(.is-rows)), и без
  // этого они читались бы как группа регулярки — правило «не находилось».
  const safe = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = chunk.match(new RegExp(`(^|\\n)\\s*${safe}\\s*\\{([^}]*)\\}`))
  return match ? match[2] : null
}

describe('мобильный урок — полоса и прогресс', () => {
  it('полоса урока 69 с полями 16, кнопки — круги 36', () => {
    expect(rule(mobile, '.cp-bar')).toMatch(/height:\s*69px/)
    expect(rule(mobile, '.cp-bar')).toMatch(/padding:\s*16px/)
    expect(mobile).toMatch(/\.cp-bar__exit,\s*\n\s*\.cp-bar__dict\s*\{[^}]*width:\s*36px/)
  })

  it('прогресс 38 во всю ширину', () => {
    expect(rule(mobile, '.cp-hud')).toMatch(/height:\s*38px/)
    expect(rule(mobile, '.cp-hud')).toMatch(/width:\s*100%/)
  })
})

describe('мобильный урок — вопрос и карточки', () => {
  it('заголовок 24, вопрос 32 — как на десктопе, а не мельче', () => {
    expect(rule(mobile, '.cp-step__title')).toMatch(/font-size:\s*24px/)
    expect(rule(mobile, '.cp-step__prompt')).toMatch(/font-size:\s*32px/)
  })

  // Селектор с :not(.is-rows) — у карточек появился второй режим (строки),
  // сетка из кадра осталась за обычным.
  it('карточки «выбери что ближе» — три в ряд, подпись 18', () => {
    expect(rule(mobile, '.cp-picks:not(.is-rows)')).toMatch(/repeat\(3,/)
    expect(rule(mobile, '.cp-picks:not(.is-rows) .cp-pick')).toMatch(/min-height:\s*96px/)
    expect(rule(mobile, '.cp-pick__label')).toMatch(/font-size:\s*18px/)
  })

  // На телефоне :hover остаётся на карточке до следующего тапа в стороне —
  // тронутая карточка висела обведённой, будто её выбрали.
  it('подсветка курсором — только там, где курсор есть', () => {
    const hover = css.match(/@media \(hover: hover\) \{[^@]*\.cp-pick:hover/)
    expect(hover, ':hover у карточки должен жить внутри @media (hover: hover)').not.toBeNull()
  })
})

describe('мобильный урок — True/False', () => {
  it('строки отдельными карточками r20 с зазором 5', () => {
    expect(rule(mobile, '.cp-rows')).toMatch(/gap:\s*5px/)
    expect(rule(mobile, '.cp-rows__row')).toMatch(/border-radius:\s*20px/)
    expect(rule(mobile, '.cp-rows__row')).toMatch(/padding:\s*12px 16px/)
  })

  it('утверждение 20/400, кнопки 43 с зазором 4', () => {
    expect(rule(mobile, '.cp-rows__q')).toMatch(/font-size:\s*20px/)
    expect(rule(mobile, '.cp-rows__q')).toMatch(/font-weight:\s*400/)
    expect(rule(mobile, '.cp-rows__opt')).toMatch(/height:\s*43px/)
    expect(rule(mobile, '.cp-rows__opts')).toMatch(/gap:\s*4px/)
  })
})

describe('мобильный урок — варианты и кнопка', () => {
  // Эти значения общие с десктопом и в мобильном блоке не переопределяются.
  it('пилюля варианта 59 r999, цвета проверки из макета', () => {
    expect(rule(css, '.cp-choice')).toMatch(/min-height:\s*59px/)
    expect(rule(css, '.cp-choice')).toMatch(/border-radius:\s*999px/)
    expect(rule(css, '.cp-choice.is-right')).toMatch(/#31b423/)
    expect(rule(css, '.cp-choice.is-wrong')).toMatch(/#ff4646/)
  })

  it('кнопка шага 48 r80: «Продолжить» фиолетовая, «Проверить» голубая', () => {
    expect(rule(css, '.cp-cta')).toMatch(/height:\s*48px/)
    expect(rule(css, '.cp-cta')).toMatch(/border-radius:\s*80px/)
    expect(rule(css, '.cp-cta.is-go')).toMatch(/#9047ff/)
    expect(rule(css, '.cp-cta.is-check')).toMatch(/#b7f0ff/)
  })
})

describe('мобильный урок — остальные типы заданий', () => {
  it('образец ответа набран фиолетовым, подсказки под ним — тёмным', () => {
    expect(rule(css, '.cp-model')).toMatch(/color:\s*#9047ff/)
    expect(rule(css, '.cp-model__body')).toMatch(/color:\s*#17171c/)
  })

  it('отмеченный пункт чек-листа: залитый кружок и фиолетовая подпись', () => {
    expect(rule(css, '.cp-check__row.is-on')).toMatch(/color:\s*#9047ff/)
    const box = rule(css, '.cp-check__row.is-on .cp-check__box')
    expect(box).toMatch(/background:\s*#9047ff/)
    expect(box).toMatch(/color:\s*#fff/)
  })

  it('неверная фраза «порядок слов» — тем же красным, что и остальные проверки', () => {
    // Правил у этого селектора два (цвет текста и заливка) — берём оба куском.
    const wrong = css.slice(css.indexOf('.cp-order__line.is-wrong'))
    expect(wrong.slice(0, 200)).toMatch(/#ff4646/)
    expect(css).not.toMatch(/#ea4f4f/)
  })

  // Кадра под соединение пар в макете нет (там оно картинками) — адаптируем под
  // соседей по экрану: та же белая карточка r20, что у True/False и чек-листа.
  it('соединение пар на мобиле — карточка r20, а не пилюля', () => {
    expect(rule(mobile, '.cp-match__item')).toMatch(/border-radius:\s*20px/)
    expect(rule(mobile, '.cp-match__item')).toMatch(/min-height:\s*72px/)
  })

  it('линия под собранной фразой — сплошная в пиксель, как в кадре', () => {
    expect(rule(mobile, '.cp-order__line')).toMatch(/border-bottom:\s*1px solid #afafaf/)
  })
})
